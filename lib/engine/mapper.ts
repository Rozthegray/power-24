// ============================================================
// lib/engine/mapper.ts
// ─── THE PRODUCTION-GRADE PHYSICS ENGINE ─────────────────────
// ============================================================

import type {
  AIExtractionResult,
  LoadProfile,
  SolarPackage,
  LineItem,
  QuoteResult,
  RankedPackage,
  ScoreBreakdown,
  UpgradeProjection
} from "@/lib/types";
import { SOLAR_PACKAGES } from "@/lib/data/packages";
import { getInstallersByLocation } from "@/lib/data/installers";
import { nanoid } from "nanoid";

const DEFAULT_PEAK_SUN_HOURS = 4.5;
const NIGERIA_REALITY_FACTOR = 1.3;

function getPeakSunHours(location?: string): number {
  const loc = (location || "").toLowerCase().trim();
  const map: Record<string, number> = { sokoto: 5.5, kano: 5.5, maiduguri: 5.5, lagos: 4.5, ph: 4.0, "port harcourt": 4.0 };
  return map[loc] || DEFAULT_PEAK_SUN_HOURS;
}

function getInverterPrice(kva: number): number {
  const INVERTER_PRICES: Record<number, number> = { 1: 120_000, 2: 185_000, 3: 275_000, 5: 480_000, 10: 950_000, 15: 1_650_000 };
  const keys = Object.keys(INVERTER_PRICES).map(Number).sort((a, b) => a - b);
  for (const key of keys) if (kva <= key) return INVERTER_PRICES[key];
  return INVERTER_PRICES[keys[keys.length - 1]];
}

function getBatteryPrice(type: string, capacityAh: number, voltageV: number): number {
  if (type === "lithium") return capacityAh * voltageV * 7.5;
  if (type === "gel") return capacityAh * 12 * 3.5;
  return capacityAh * 12 * 2.8;
}

function getPanelPrice(watts: number): number { return Math.round(watts * 550); }

// ─── 1 & 2: LOAD & SURGE ENGINE ──────────────────────────────
export function computeLoadProfile(extraction: AIExtractionResult, location: string = "lagos"): LoadProfile {
  const psh = getPeakSunHours(location);
  let trueContinuous = 0;
  let maxSurgeAddition = 0;
  let rawDailyWh = 0;

  for (const app of extraction.appliances) {
    const appTotalWatts = app.unitWatts * app.quantity;
    trueContinuous += appTotalWatts;
    const dutyCycle = ["refrigeration", "cooling"].includes(app.category) ? 0.5 : 1.0;
    rawDailyWh += (appTotalWatts * dutyCycle * app.dailyHours) * NIGERIA_REALITY_FACTOR;

    if (app.hasSurge && app.surgeMultiplier > 1) {
      const surgeAddition = app.unitWatts * (app.surgeMultiplier - 1);
      if (surgeAddition > maxSurgeAddition) maxSurgeAddition = surgeAddition;
    }
  }

  const trueSurge = (trueContinuous + maxSurgeAddition) * 1.25;
  const requiredPanelWatts = Math.ceil(rawDailyWh / (psh * 0.75));
  const requiredBatteryAh = Math.ceil((trueContinuous * 8 * 1.30) / (48 * 0.80));
  const requiredInverterKva = Math.ceil(trueSurge / 1000);

  return {
    continuousLoad: trueContinuous,
    surgeLoad: trueSurge,
    dailyEnergyWh: rawDailyWh,
    bufferedEnergyWh: rawDailyWh * 1.2,
    peakSunHours: psh,
    requiredPanelWatts,
    requiredBatteryAh,
    requiredInverterKva,
  };
}

// ─── 3, 4 & 5: BATTERY, SOLAR & MATCHING ENGINE ──────────────
export function buildQuoteOptions(profile: LoadProfile, extraction: AIExtractionResult, location: string): RankedPackage[] {
  const hasHeavyCyclicLoad = profile.dailyEnergyWh > 1500;

  let safePackages = SOLAR_PACKAGES.filter((pkg) => {
    if (!pkg) return false;
    const inverterWatts = (pkg.inverter?.kva || 1) * 1000 * (pkg.inverter?.efficiency || 90) / 100;
    const isPortablePkg = pkg.installationFee === 0;

    if (profile.continuousLoad > inverterWatts || profile.surgeLoad > pkg.maxSurgeWatts) return false;

    const totalBatteryAh = (pkg.batteries || []).reduce((sum, b) => sum + (b.voltageV >= 48 ? b.capacityAh * b.quantity : b.capacityAh), 0);
    const systemVoltage = pkg.batteries?.[0]?.voltageV >= 48 ? 48 : (pkg.batteries?.[0]?.voltageV * (pkg.batteries?.[0]?.quantity || 1));
    const totalBatteryWh = totalBatteryAh * systemVoltage;
    
    const isLithium = pkg.batteries?.[0]?.type === "lithium";
    const usableBatteryWh = totalBatteryWh * (isLithium ? 0.80 : 0.50);
    
    const minimumBatteryWh = hasHeavyCyclicLoad ? profile.dailyEnergyWh * 0.60 : profile.continuousLoad * 2;
    if (usableBatteryWh < minimumBatteryWh) return false;

    if (!isPortablePkg) {
      const totalPanelWatts = (pkg.panels || []).reduce((sum, p) => sum + (p.watts * p.quantity), 0);
      const dailyGenerationWh = totalPanelWatts * profile.peakSunHours * 0.75;
      if (dailyGenerationWh < profile.dailyEnergyWh * 0.60) return false;
    }
    return true;
  });

  safePackages.sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));

  let optimizedPackages = safePackages.filter(pkg => {
    const inverterWatts = (pkg.inverter?.kva || 1) * 1000;
    return inverterWatts <= (profile.surgeLoad * 3 + 2000);
  });

  if (optimizedPackages.length === 0 && safePackages.length > 0) optimizedPackages = safePackages;

  if (optimizedPackages.length === 0) {
    extraction.warnings.push("CRITICAL: Your load requires a highly customized enterprise setup. Showing the largest available tier.");
    const fallbackPkg = SOLAR_PACKAGES.find(p => p?.slug?.includes("deye") || p?.slug?.includes("prag"));
    optimizedPackages = fallbackPkg ? [fallbackPkg] : [SOLAR_PACKAGES[SOLAR_PACKAGES.length - 1]];
  }

  const selectedOptions: SolarPackage[] = [];
  if (optimizedPackages.length > 0) selectedOptions.push(optimizedPackages[0]); 
  if (optimizedPackages.length > 1) selectedOptions.push(optimizedPackages[1]); 
  if (optimizedPackages.length > 2) {
    const comfortIndex = Math.min(optimizedPackages.length - 1, 3);
    selectedOptions.push(optimizedPackages[comfortIndex]); 
  }

  const uniqueOptions = Array.from(new Set(selectedOptions));
  const labels: RankedPackage["tierLabel"][] = ["🟢 Survival Tier", "🟡 Conditionally Reliable", "🔵 Full Comfort Tier"] as any;
  
  return uniqueOptions.map((pkg, index) => {
    const items: LineItem[] = [];
    const safeInstFee = pkg.installationFee || 0;
    const safeBasePrice = pkg.basePrice || 0;

    if (safeInstFee === 0) {
      items.push({ description: `${pkg.name || 'Solar'} Portable Station`, category: "hardware", quantity: 1, unitPrice: safeBasePrice, total: safeBasePrice });
    } else {
      items.push({ description: `${pkg.inverter?.brand || 'Solar'} ${pkg.inverter?.kva || 0}KVA Inverter`, quantity: 1, unitPrice: getInverterPrice(pkg.inverter?.kva || 0), total: getInverterPrice(pkg.inverter?.kva || 0), category: "hardware" });
      for (const battery of pkg.batteries || []) {
        const unitPrice = getBatteryPrice(battery.type, battery.capacityAh, battery.voltageV);
        items.push({ description: `${battery.brand} ${battery.capacityAh}Ah ${battery.voltageV}V ${battery.type.toUpperCase()} Battery`, quantity: battery.quantity, unitPrice, total: unitPrice * battery.quantity, category: "hardware" });
      }
      for (const panel of pkg.panels || []) {
        const unitPrice = getPanelPrice(panel.watts);
        items.push({ description: `${panel.brand} ${panel.watts}W Solar Panel`, quantity: panel.quantity, unitPrice, total: unitPrice * panel.quantity, category: "hardware" });
      }
      const hardwareSubtotal = items.reduce((sum, item) => sum + item.total, 0);
      const bosPrice = Math.round(hardwareSubtotal * 0.08);
      items.push({ description: "Balance of System", quantity: 1, unitPrice: bosPrice, total: bosPrice, category: "hardware" });
      items.push({ description: "Professional NAESCO Installation", quantity: 1, unitPrice: safeInstFee, total: safeInstFee, category: "installation" });
    }

    const totalPriceNGN = items.reduce((sum, item) => sum + item.total, 0);
    const monthlyPaymentOption = Math.ceil((totalPriceNGN * 0.03 * Math.pow(1.03, 36)) / (Math.pow(1.03, 36) - 1));

    // ─── SCORING ENGINE ─────────────────────────
    const totalBatteryAh = (pkg.batteries || []).reduce((sum, b) => sum + (b.voltageV >= 48 ? b.capacityAh * b.quantity : b.capacityAh), 0);
    const systemVoltage = pkg.batteries?.[0]?.voltageV >= 48 ? 48 : (pkg.batteries?.[0]?.voltageV * (pkg.batteries?.[0]?.quantity || 1));
    const totalBatteryWh = totalBatteryAh * systemVoltage;
    
    const isLithium = pkg.batteries?.[0]?.type === "lithium";
    const usableBatteryWh = totalBatteryWh * (isLithium ? 0.8 : 0.5);
    const baseRuntime = usableBatteryWh / (profile.continuousLoad || 1);
    const estimatedRuntimeRange = `${Math.max(1, Math.floor(baseRuntime * 0.75))}–${Math.ceil(baseRuntime * 1.05)}`;
    const backupCapacityDays = (usableBatteryWh / (profile.dailyEnergyWh || 1)).toFixed(1);

    const totalPanelWatts = (pkg.panels || []).reduce((sum, p) => sum + (p.watts * p.quantity), 0);
    const dailyGenerationWh = totalPanelWatts * profile.peakSunHours * 0.75;
    
    const loadScore = extraction.confidenceScore * 100;
    const batteryScore = Math.min((usableBatteryWh / (profile.dailyEnergyWh * 1.5)) * 100, 100);
    const solarScore = pkg.installationFee === 0 && totalPanelWatts === 0 ? 0 : Math.min((dailyGenerationWh / (profile.dailyEnergyWh * 1.2)) * 100, 100);
    const surgeScore = Math.min(((pkg.inverter?.kva || 1) * 1000 / profile.surgeLoad) * 100, 100);
    let envScore = 85; 

    function calculateReliability(l: number, b: number, s: number, su: number, e: number) {
      let base = (0.25 * l) + (0.25 * b) + (0.20 * s) + (0.15 * su) + (0.15 * e);
      const weak = Math.min(b, s);
      if (weak < 60) base *= 0.85; 
      if (b < 50) base *= 0.75; 
      return Math.round(Math.min(100, Math.max(0, base)));
    }

    const reliabilityScore = calculateReliability(loadScore, batteryScore, solarScore, surgeScore, envScore);

    // ─── FINAL UX COPYWRITING ──────────────────────────────────
    let consequenceText = "Provides excellent autonomy and resilience.";
    if (reliabilityScore < 60) consequenceText = "May not last through the night consistently, especially during cloudy periods.";
    else if (reliabilityScore < 80) consequenceText = "Reliable for standard daily cycles, but vulnerable to multi-day bad weather.";

    let realityCheckText = "Freezer and ACs will run reliably overnight regardless of grid availability.";
    if (reliabilityScore < 65) realityCheckText = "Heavy cyclic appliances (like freezers) may not run reliably overnight if the battery is not fully recharged.";
    else if (reliabilityScore < 85) realityCheckText = "Reliable for daily use, but monitor heavy cyclic loads during the peak of the rainy season.";

    let bestForText = "Daytime usage + light overnight backup";
    let notIdealForText = "Full 24/7 heavy appliance operation";
    if (reliabilityScore >= 80) {
        bestForText = "24/7 off-grid independence";
        notIdealForText = "Budget-constrained rapid setups";
    } else if (reliabilityScore >= 65) {
        bestForText = "Standard household daily backup";
        notIdealForText = "Running multiple heavy ACs overnight";
    }

    // ─── UPGRADE SIMULATOR (PROJECTED SCORES) ──────────────────
    const upgradeProjections: UpgradeProjection[] = [];
    if (pkg.installationFee > 0 && reliabilityScore < 95) {
       // Simulate +2 Panels (~800W)
       const newPanelWatts = totalPanelWatts + 800;
       const newGenWh = newPanelWatts * profile.peakSunHours * 0.75;
       const newSolarScore = Math.min((newGenWh / (profile.dailyEnergyWh * 1.2)) * 100, 100);
       const panelRelScore = calculateReliability(loadScore, batteryScore, newSolarScore, surgeScore, envScore);
       if (panelRelScore > reliabilityScore) {
           upgradeProjections.push({ action: "+2 panels", projectedScore: panelRelScore });
       }

       // Simulate +1 Battery Unit
       const baseBatteryUnitWh = totalBatteryWh / (pkg.batteries[0]?.quantity || 1);
       const newUsableWh = (totalBatteryWh + baseBatteryUnitWh) * (isLithium ? 0.8 : 0.5);
       const newBattScore = Math.min((newUsableWh / (profile.dailyEnergyWh * 1.5)) * 100, 100);
       const battRelScore = calculateReliability(loadScore, newBattScore, solarScore, surgeScore, envScore);
       if (battRelScore > reliabilityScore) {
           upgradeProjections.push({ action: "+1 battery", projectedScore: battRelScore });
       }
    }

    const scoreBreakdown: ScoreBreakdown = { load: Math.round(loadScore), battery: Math.round(batteryScore), solar: Math.round(solarScore), surge: Math.round(surgeScore), environment: envScore };

    return {
      tierLabel: uniqueOptions.length === 1 ? "🟡 Conditionally Reliable" : labels[index] || "Alternative Option",
      package: pkg,
      lineItems: items,
      totalPriceNGN,
      monthlyPaymentOption,
      estimatedRuntimeRange,
      backupCapacityDays,
      reliabilityScore,
      scoreBreakdown,
      consequenceText,
      realityCheckText,
      bestForText,
      notIdealForText,
      upgradeProjections
    };
  });
}

// ─── 7: ASSEMBLE FINAL QUOTE ──────────────────────────────────
export function buildQuoteResult(extraction: AIExtractionResult, location: string = "Lagos"): QuoteResult {
  const profile = computeLoadProfile(extraction, location);
  if (profile.dailyEnergyWh > 2000) extraction.warnings.push("NIGERIA REALITY FACTOR: Demand bumped 30% to account for ambient heat making compressors work harder.");
  const options = buildQuoteOptions(profile, extraction, location);
  const installers = (options.length > 0 && options[0].package && options[0].package.installationFee > 0) ? getInstallersByLocation(location, 3) : [];

  return {
    success: true,
    requestId: `P24-${nanoid(8).toUpperCase()}`,
    generatedAt: new Date().toISOString(),
    appliances: extraction.appliances,
    loadProfile: profile,
    options,
    warnings: extraction.warnings,
    engineersVerdict: extraction.engineersVerdict,
    confidenceScore: extraction.confidenceScore,
    recommendedInstallers: installers,
  };
}