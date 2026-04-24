// ============================================================
// lib/engine/mapper.ts  v7.0 (The Honest Installer Hybrid)
// PRODUCTION-GRADE SOLAR PHYSICS ENGINE — ENGINEERING EDITION
// ============================================================
//
// This version explicitly preserves all v2.0 functions (Seasonal PSH, 
// Diversity Factors, System Derates) while introducing strict clamps 
// on Over-Provisioning and true Night Runtime / AC Compatibility math.
// ============================================================

import type {
  AIExtractionResult,
  LoadProfile,
  SolarPackage,
  LineItem,
  QuoteResult,
  RankedPackage,
  ScoreBreakdown,
  UpgradeProjection,
  SeasonalAnalysis,
  SystemDerateBreakdown,
  ApplianceCategory,
} from "@/lib/types";
import { SOLAR_PACKAGES } from "@/lib/data/packages";
import { getInstallersByLocation } from "@/lib/data/installers";
import { nanoid } from "nanoid";

// ─── DUTY CYCLES PER APPLIANCE CATEGORY ─────────────────────
const DUTY_CYCLES: Record<ApplianceCategory, number> = {
  lighting:      0.85, 
  cooling:       0.40, 
  refrigeration: 0.33, 
  entertainment: 0.90, 
  computing:     0.80, 
  water_pump:    0.20, 
  cooking:       0.12, 
  security:      0.95, 
  other:         0.70,
};

// ─── NIGERIA HEAT PENALTY ───────────────────────────────────
const HEAT_PENALTY: Partial<Record<ApplianceCategory, number>> = {
  cooling:       1.35,
  refrigeration: 1.25,
};

// ─── SYSTEM DERATE FACTORS ──────────────────────────────────
export const SYSTEM_DERATE: SystemDerateBreakdown = {
  wiring:      0.97,
  mppt:        0.97,
  temperature: 0.88,
  soiling:     0.95,
  combined:    0,    
};
SYSTEM_DERATE.combined = parseFloat(
  (SYSTEM_DERATE.wiring * SYSTEM_DERATE.mppt * SYSTEM_DERATE.temperature * SYSTEM_DERATE.soiling).toFixed(3)
);

// ─── SEASONAL PEAK SUN HOURS DATABASE ───────────────────────
interface PSHRecord { dry: number; rainy: number; avg: number }
const PSH_DATABASE: Record<string, PSHRecord> = {
  sokoto:            { dry: 6.8, rainy: 5.2, avg: 6.2 },
  kano:              { dry: 6.5, rainy: 5.0, avg: 6.0 },
  maiduguri:         { dry: 6.5, rainy: 5.0, avg: 6.0 },
  kaduna:            { dry: 6.0, rainy: 4.8, avg: 5.6 },
  abuja:             { dry: 5.5, rainy: 4.5, avg: 5.0 },
  ibadan:            { dry: 5.2, rainy: 4.0, avg: 4.6 },
  enugu:             { dry: 5.0, rainy: 4.0, avg: 4.5 },
  owerri:            { dry: 4.8, rainy: 3.5, avg: 4.2 },
  benin:             { dry: 4.8, rainy: 3.6, avg: 4.2 },
  warri:             { dry: 4.6, rainy: 3.4, avg: 4.0 },
  asaba:             { dry: 4.8, rainy: 3.8, avg: 4.3 },
  lagos:             { dry: 5.0, rainy: 3.8, avg: 4.4 },
  ph:                { dry: 4.5, rainy: 3.2, avg: 3.8 },
  "port harcourt":   { dry: 4.5, rainy: 3.2, avg: 3.8 },
  calabar:           { dry: 4.3, rainy: 3.0, avg: 3.7 },
  uyo:               { dry: 4.4, rainy: 3.1, avg: 3.8 },
};
const DEFAULT_PSH: PSHRecord = { dry: 5.0, rainy: 3.8, avg: 4.4 }; 

function getPSH(location?: string): PSHRecord {
  const loc = (location || "lagos").toLowerCase().trim();
  return PSH_DATABASE[loc] ?? DEFAULT_PSH;
}

// ─── PRICE HELPERS ──────────────────────────────────────────
function getInverterPrice(kva: number): number {
  const PRICES: Record<number, number> = {
    1: 120_000, 2: 185_000, 3: 275_000,
    5: 480_000, 10: 950_000, 15: 1_650_000
  };
  const keys = Object.keys(PRICES).map(Number).sort((a, b) => a - b);
  for (const key of keys) if (kva <= key) return PRICES[key];
  return PRICES[keys[keys.length - 1]];
}
function getBatteryPrice(type: string, capacityAh: number, voltageV: number): number {
  if (type === "lithium") return capacityAh * voltageV * 7.5;
  if (type === "gel")     return capacityAh * 12 * 3.5;
  return capacityAh * 12 * 2.8; 
}
function getPanelPrice(watts: number): number { return Math.round(watts * 550); }

// ─── BATTERY BANK CAPACITY MATH ─────────────────────────────
function computeBankCapacity(batteries: SolarPackage["batteries"]): { wh: number; systemVoltage: number } {
  if (!batteries?.length) return { wh: 0, systemVoltage: 12 };
  const first = batteries[0];

  if (first.voltageV >= 48) {
    const totalAh = batteries.reduce((sum, b) => sum + b.capacityAh * b.quantity, 0);
    return { wh: totalAh * 48, systemVoltage: 48 };
  } else {
    const bankVoltage = first.voltageV * first.quantity; 
    const totalAh = batteries.reduce((sum, b) => sum + b.capacityAh, 0);
    return { wh: totalAh * bankVoltage, systemVoltage: bankVoltage };
  }
}

function getUsableWh(batteries: SolarPackage["batteries"]): number {
  const { wh } = computeBankCapacity(batteries);
  const dod = getBatteryDOD(batteries);
  const roundTripEff = 0.92; 
  return wh * dod * roundTripEff;
}

function getBatteryDOD(batteries: SolarPackage["batteries"]): number {
  const type = batteries?.[0]?.type || "lead-acid";
  return type === "lithium" ? 0.80 : 0.50;
}

// Helper to determine the exact Wh added by a single "upgrade" unit (respects wiring topology)
function computeUpgradeStringWh(batteries: SolarPackage["batteries"]): { addedWh: number; upgradeLabel: string } {
  if (!batteries?.length) return { addedWh: 0, upgradeLabel: "+1 battery unit" };
  const first = batteries[0];
  const isParallel = first.wiring === "parallel" || first.voltageV >= 48;
  
  if (isParallel) {
    return { addedWh: first.voltageV * first.capacityAh, upgradeLabel: "+1 battery unit" };
  }
  const sw = first.voltageV * first.quantity * first.capacityAh;
  return { addedWh: sw, upgradeLabel: first.quantity === 1 ? "+1 battery unit" : `+${first.quantity} batteries (1 string)` };
}

// ─── 1: LOAD PROFILE ENGINE ─────────────────────────────────
export function computeLoadProfile(
  extraction: AIExtractionResult,
  location: string = "lagos"
): LoadProfile {
  const psh = getPSH(location);

  let rawContinuous = 0;     
  let largestSurgeAddition = 0; 
  let rawDailyWh = 0;

  for (const app of extraction.appliances) {
    const appWatts = app.unitWatts * app.quantity;
    rawContinuous += appWatts;

    const dutyCycle = DUTY_CYCLES[app.category] ?? 0.70;
    const heatFactor = HEAT_PENALTY[app.category] ?? 1.0;

    rawDailyWh += appWatts * dutyCycle * app.dailyHours * heatFactor;

    if (app.hasSurge && app.surgeMultiplier > 1) {
      const singleUnitSurgeAddition = app.unitWatts * (app.surgeMultiplier - 1);
      if (singleUnitSurgeAddition > largestSurgeAddition) {
        largestSurgeAddition = singleUnitSurgeAddition;
      }
    }
  }

  const appCount = extraction.appliances.reduce((sum, a) => sum + a.quantity, 0);
  const diversityFactor =
    appCount <= 3 ? 1.00 :
    appCount <= 6 ? 0.90 :
    appCount <= 10 ? 0.82 : 0.75;

  const continuousLoad = Math.round(rawContinuous * diversityFactor);
  const surgeLoad = Math.round((continuousLoad + largestSurgeAddition) * 1.20);
  const requiredPanelWatts = Math.ceil(rawDailyWh / (psh.rainy * SYSTEM_DERATE.combined));

  const targetBackupWh = rawDailyWh * (8 / 24);
  const requiredBatteryWh = targetBackupWh / (0.80 * 0.92);
  const requiredBatteryAh = Math.ceil(requiredBatteryWh / 48);

  const requiredInverterKva = Math.ceil(surgeLoad / 1000);

  return {
    continuousLoad,
    surgeLoad,
    dailyEnergyWh: Math.round(rawDailyWh),
    bufferedEnergyWh: Math.round(rawDailyWh * 1.15),
    peakSunHours: psh.avg,
    requiredPanelWatts,
    requiredBatteryAh,
    requiredInverterKva,
    diversityFactor,
    systemDerate: SYSTEM_DERATE.combined,
    autonomyHours: 8,
  };
}

// ─── RELIABILITY SCORING ENGINE ────────────────────────────
function scoreLoadCoverage(inverterKva: number, continuousW: number): number {
  const ratio = (inverterKva * 1000) / (continuousW || 1);
  if (ratio < 1.00) return 0;   
  if (ratio < 1.15) return 45;  
  if (ratio < 1.50) return 88;  
  if (ratio < 2.50) return 100; 
  return 80; 
}

function scoreBatteryAutonomy(usableWh: number, dailyWh: number): number {
  const days = usableWh / (dailyWh || 1);
  if (days < 0.30) return 10;  
  if (days < 0.50) return 28;  
  if (days < 0.80) return 50;  
  if (days < 1.00) return 65;  
  if (days < 1.50) return 80;  
  if (days < 2.00) return 90;  
  return 97;                   
}

function scoreSolarCoverage(dailyGenWh: number, dailyDemandWh: number, isPortable: boolean): number {
  if (isPortable) return 50; 
  const ratio = dailyGenWh / (dailyDemandWh || 1);
  if (ratio < 0.50) return 15; 
  if (ratio < 0.70) return 40; 
  if (ratio < 0.90) return 62; 
  if (ratio < 1.10) return 80; 
  if (ratio < 1.30) return 90; 
  return 98;                   
}

function scoreSurgeHeadroom(maxSurgeWatts: number, systemSurgeW: number): number {
  const ratio = maxSurgeWatts / (systemSurgeW || 1);
  if (ratio < 1.00) return 0;  
  if (ratio < 1.10) return 35; 
  if (ratio < 1.30) return 65; 
  if (ratio < 1.50) return 85; 
  return 100;
}

function scoreBatteryQuality(batteries: SolarPackage["batteries"]): number {
  if (!batteries?.length) return 50;
  const type = batteries[0].type;
  const cycleLife = batteries[0].cycleLife;
  if (type === "lithium") return Math.min(97, 72 + Math.floor(cycleLife / 300));
  if (type === "gel")     return 62;
  return 48; 
}

function computeReliability(scores: ScoreBreakdown, acRuntimeHours?: number | null): number {
  const { load, battery, solar, surge, environment: quality } = scores;
  let base = 0.20 * load + 0.30 * battery + 0.25 * solar + 0.15 * surge + 0.10 * quality;
  
  if (battery < 35) base *= 0.65;
  if (surge < 35)   base *= 0.60;
  if (load < 40)    base *= 0.70;
  
  // Strict penalty if AC exists but runtime is inadequate
  if (acRuntimeHours !== undefined && acRuntimeHours !== null && acRuntimeHours < 4.0) {
      base *= 0.85; 
  }
  
  return Math.round(Math.min(100, Math.max(5, base)));
}

function assignTierLabel(score: number, pos: number, highCount: number): RankedPackage["tierLabel"] {
  if (score < 60) return "🟠 Low Reliability (Conditional)" as any;
  if (score >= 82) return (pos === 0 && highCount > 1) ? "🟡 Daily Reliable" as any : "🔵 High Reliability" as any;
  return "🟡 Conditionally Reliable" as any;
}

// ─── 2: BUILD QUOTE OPTIONS ENGINE ──────────────────────────
export function buildQuoteOptions(
  profile: LoadProfile,
  extraction: AIExtractionResult,
  location: string
): RankedPackage[] {
  const pshRecord = getPSH(location);

  // TRUE NIGHT LOAD CALCULATION
  let nightLoadW = 0;
  let acTotalRatedW = 0;
  for (const app of extraction.appliances) {
    if (app.category === "cooling") {
      acTotalRatedW += app.unitWatts * app.quantity;
      nightLoadW += app.unitWatts * app.quantity * DUTY_CYCLES.cooling * (HEAT_PENALTY.cooling || 1.0);
    } else if (app.category === "refrigeration") {
      nightLoadW += app.unitWatts * app.quantity * DUTY_CYCLES.refrigeration * (HEAT_PENALTY.refrigeration || 1.0);
    } else if (["lighting", "entertainment", "security"].includes(app.category)) {
      nightLoadW += app.unitWatts * app.quantity * 0.50; // Assume ~50% concurrent night use
    }
  }
  if (nightLoadW < 100) nightLoadW = profile.continuousLoad * 0.40; 
  const acEffectiveW = acTotalRatedW * DUTY_CYCLES.cooling * (HEAT_PENALTY.cooling || 1.0);

  // ─── PACKAGE FILTERING ────────────────────────────────────
  let safePackages = SOLAR_PACKAGES.filter((pkg) => {
    if (!pkg) return false;
    const inverterUsableW = (pkg.inverter?.kva || 1) * 1000 * ((pkg.inverter?.efficiency || 90) / 100);
    const isPortable = pkg.installationFee === 0;

    if (profile.continuousLoad > inverterUsableW) return false;
    if (profile.surgeLoad > pkg.maxSurgeWatts) return false;

    const usableWh = getUsableWh(pkg.batteries);
    if (usableWh < profile.dailyEnergyWh * 0.50) return false;

    if (!isPortable) {
      const totalPanelWatts = (pkg.panels || []).reduce((sum, p) => sum + p.watts * p.quantity, 0);
      const rainySolarWh = totalPanelWatts * pshRecord.rainy * SYSTEM_DERATE.combined;
      if (rainySolarWh < profile.dailyEnergyWh * 0.50) return false;
    }
    return true;
  });

  safePackages.sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));

  // THE OVER-PROVISIONING FILTER: Cap sizing so a 15KVA isn't matched to a 4kWh load
  let optimizedPackages = safePackages.filter((pkg) => {
    const inverterW = (pkg.inverter?.kva || 1) * 1000;
    const usableWh = getUsableWh(pkg.batteries);
    // Stops 8x over-provisioning: Max 3.5x Surge headroom & Max 4.0x Battery capacity
    return inverterW <= profile.surgeLoad * 3.5 && usableWh <= profile.dailyEnergyWh * 4.0;
  });

  if (optimizedPackages.length === 0 && safePackages.length > 0) {
    optimizedPackages = safePackages;
  }

  if (optimizedPackages.length === 0) {
    extraction.warnings.push(
      "CRITICAL: Your load requires a custom enterprise-scale installation. Showing largest available tier as a reference point only."
    );
    const fallback = SOLAR_PACKAGES.find((p) => p?.slug?.includes("oga")) ?? SOLAR_PACKAGES[SOLAR_PACKAGES.length - 1];
    optimizedPackages = fallback ? [fallback] : [];
  }

  const selectedOptions: SolarPackage[] = [];
  if (optimizedPackages.length > 0) selectedOptions.push(optimizedPackages[0]);
  if (optimizedPackages.length > 1) selectedOptions.push(optimizedPackages[1]);
  if (optimizedPackages.length > 2) selectedOptions.push(optimizedPackages[Math.min(optimizedPackages.length - 1, 3)]);
  const uniqueOptions = [...new Set(selectedOptions)];

  return uniqueOptions.map((pkg, index) => {
    const items: LineItem[] = [];
    const safeInstFee = pkg.installationFee || 0;
    const safeBasePrice = pkg.basePrice || 0;
    const isPortable = safeInstFee === 0;

    // ─── LINE ITEMS ────────────────────────────────────────────
    if (isPortable) {
      items.push({ description: `${pkg.name} Portable Power Station`, category: "hardware", quantity: 1, unitPrice: safeBasePrice, total: safeBasePrice });
    } else {
      items.push({ description: `${pkg.inverter.brand} ${pkg.inverter.kva}KVA Hybrid Inverter`, quantity: 1, unitPrice: getInverterPrice(pkg.inverter.kva), total: getInverterPrice(pkg.inverter.kva), category: "hardware" });
      for (const b of pkg.batteries) { const unitPrice = getBatteryPrice(b.type, b.capacityAh, b.voltageV); items.push({ description: `${b.brand} ${b.capacityAh}Ah ${b.voltageV}V ${b.type.toUpperCase()} Battery`, quantity: b.quantity, unitPrice, total: unitPrice * b.quantity, category: "hardware" }); }
      for (const p of pkg.panels) { const unitPrice = getPanelPrice(p.watts); items.push({ description: `${p.brand} ${p.watts}W Monocrystalline Solar Panel`, quantity: p.quantity, unitPrice, total: unitPrice * p.quantity, category: "hardware" }); }
      const hardwareSub = items.reduce((s, i) => s + i.total, 0); const bos = Math.round(hardwareSub * 0.08); items.push({ description: "Balance of System (MC4 connectors, breakers, cables, racking)", quantity: 1, unitPrice: bos, total: bos, category: "hardware" });
      items.push({ description: "NAESCO-Certified Professional Installation", quantity: 1, unitPrice: safeInstFee, total: safeInstFee, category: "installation" });
    }

    const totalPriceNGN = items.reduce((s, i) => s + i.total, 0);
    const monthlyPaymentOption = Math.ceil((totalPriceNGN * 0.03 * Math.pow(1.03, 36)) / (Math.pow(1.03, 36) - 1));

    // ─── CAPACITY METRICS & RUNTIME ────────────────────────────
    const usableWh = getUsableWh(pkg.batteries);
    const dod = getBatteryDOD(pkg.batteries);
    const { wh: grossWh } = computeBankCapacity(pkg.batteries);

    const totalPanelWatts = (pkg.panels || []).reduce((sum, p) => sum + p.watts * p.quantity, 0);
    const avgDailyGenWh    = totalPanelWatts * pshRecord.avg   * SYSTEM_DERATE.combined;
    const rainyDailyGenWh  = totalPanelWatts * pshRecord.rainy * SYSTEM_DERATE.combined;
    const dryDailyGenWh    = totalPanelWatts * pshRecord.dry   * SYSTEM_DERATE.combined;

    // TRUE NIGHT RUNTIME (battery ÷ computed night load)
    const nightRuntimeHrs = usableWh / nightLoadW;
    const estimatedRuntimeRange = `${Math.max(1, Math.floor(nightRuntimeHrs * 0.80))}–${Math.ceil(nightRuntimeHrs * 1.15)}`;
    
    const rawBackupDays = usableWh / (profile.dailyEnergyWh || 1);
    let backupCapacityDays = `~${rawBackupDays.toFixed(1)} days`;
    if (rawBackupDays < 1.0) backupCapacityDays += " (cannot handle 1 full cloudy day)";
    else if (rawBackupDays > 1.5) backupCapacityDays += " (resilient)";
    else backupCapacityDays += " (standard overnight coverage)";

    const acRuntimeHours: number | null = acEffectiveW > 0 ? Math.round((usableWh / acEffectiveW) * 10) / 10 : null;

    // ─── SCORING ───────────────────────────────────────────────
    const loadScore    = scoreLoadCoverage(pkg.inverter.kva, profile.continuousLoad);
    const batteryScore = scoreBatteryAutonomy(usableWh, profile.dailyEnergyWh);
    const solarScore   = scoreSolarCoverage(avgDailyGenWh, profile.dailyEnergyWh, isPortable);
    const surgeScore   = scoreSurgeHeadroom(pkg.maxSurgeWatts, profile.surgeLoad);
    const qualityScore = scoreBatteryQuality(pkg.batteries);

    const scoreBreakdown: ScoreBreakdown = {
      load: Math.round(loadScore), battery: Math.round(batteryScore), solar: Math.round(solarScore), surge: Math.round(surgeScore), environment: Math.round(qualityScore)
    };
    
    const reliabilityScore = computeReliability(scoreBreakdown, acRuntimeHours);

    let systemLimitedBy = "Optimally Balanced";
    if (reliabilityScore < 85) {
      if (scoreBreakdown.battery <= scoreBreakdown.solar && scoreBreakdown.battery <= scoreBreakdown.surge) systemLimitedBy = "Battery Capacity";
      else if (scoreBreakdown.solar < scoreBreakdown.battery && scoreBreakdown.solar <= scoreBreakdown.surge) systemLimitedBy = "Solar Generation";
      else systemLimitedBy = "Inverter Peak Limit";
    }

    // ─── SEASONAL ANALYSIS ─────────────────────────────────────
    const rainySolarScore = scoreSolarCoverage(rainyDailyGenWh, profile.dailyEnergyWh, isPortable);
    const drySolarScore   = scoreSolarCoverage(dryDailyGenWh,   profile.dailyEnergyWh, isPortable);
    const seasonalAnalysis: SeasonalAnalysis = {
      drySeasonReliability:   computeReliability({ ...scoreBreakdown, solar: Math.round(drySolarScore) }, acRuntimeHours),
      rainySeasonReliability: computeReliability({ ...scoreBreakdown, solar: Math.round(rainySolarScore) }, acRuntimeHours),
      worstCasePSH:           pshRecord.rainy,
      worstCaseDailyGenWh:    Math.round(rainyDailyGenWh),
    };

    const rainyDrop = reliabilityScore - seasonalAnalysis.rainySeasonReliability;
    if (!isPortable && rainyDrop > 12) {
      extraction.warnings.push(
        `⛈️ SEASONAL GAP [${pkg.name}]: Reliability drops from ${reliabilityScore}% (avg) ` +
        `to ~${seasonalAnalysis.rainySeasonReliability}% in rainy season. Consider panels or battery upgrades.`
      );
    }

    // ─── AC COMPATIBILITY ENGINE ─────────────────────────────
    let acCompatibilityText = "❄️ No ACs detected in load.";
    if (acRuntimeHours !== null) {
      if (acRuntimeHours >= 10.0) acCompatibilityText = `❄️ AC Supported: Full overnight runtime (~${acRuntimeHours.toFixed(1)} hrs capacity)`;
      else if (acRuntimeHours >= 4.0) acCompatibilityText = `❄️ AC Supported: Limited evening use (~${acRuntimeHours.toFixed(1)} hrs capacity)`;
      else acCompatibilityText = `❌ AC Not Recommended: Battery will drain rapidly (< 4 hrs capacity)`;
    }

    // ─── HONEST COPYWRITING ───────────────────────────────────
    let consequenceText: string; let realityCheckText: string; let bestForText: string; let notIdealForText: string;

    if (reliabilityScore >= 82) {
      consequenceText = "Strong autonomy. Handles consecutive cloudy days reliably.";
      realityCheckText = acRuntimeHours !== null && acRuntimeHours < 8.0 
        ? "⚠️ Limited AC Runtime. Other appliances run perfectly, but AC must be managed." 
        : "Supports limited AC usage depending on runtime and battery state.";
      bestForText = "24/7 off-grid independence";
      notIdealForText = "Budget-constrained rapid setups";
    } else if (reliabilityScore >= 65) {
      consequenceText = "Reliable for standard daily cycles, vulnerable to extended bad weather.";
      realityCheckText = "Heavy appliances may drain the system if run simultaneously at night.";
      bestForText = "Standard household daily backup";
      notIdealForText = "Heavy simultaneous loads at night";
    } else {
      consequenceText = "Daytime-only backup. Will not sustain a loaded overnight cycle.";
      realityCheckText = "Not suitable for overnight compressor loads. Use as a grid supplement.";
      bestForText = "Daytime lighting and basic electronics";
      notIdealForText = "Overnight operation of freezers or ACs";
    }

    // ─── UPGRADE PROJECTIONS ───────────────────────────────────
    const upgradeProjections: UpgradeProjection[] = [];
    if (!isPortable && reliabilityScore < 90) {
      
      const newPanelWatts = totalPanelWatts + 800;
      const newGenWh      = newPanelWatts * pshRecord.avg * SYSTEM_DERATE.combined;
      const newSolarScore = scoreSolarCoverage(newGenWh, profile.dailyEnergyWh, false);
      const panelRel      = computeReliability({ ...scoreBreakdown, solar: Math.round(newSolarScore) }, acRuntimeHours);
      
      const { addedWh, upgradeLabel } = computeUpgradeStringWh(pkg.batteries);
      let battRel = reliabilityScore;
      
      if (addedWh > 0) {
        const newUsableWh  = (grossWh + addedWh) * dod * 0.92;
        const newBattScore = scoreBatteryAutonomy(newUsableWh, profile.dailyEnergyWh);
        battRel = computeReliability({ ...scoreBreakdown, battery: Math.round(newBattScore) }, acRuntimeHours !== null ? (newUsableWh/acEffectiveW) : null);
        
        if (battRel > reliabilityScore + 2) {
          upgradeProjections.push({ icon: "🔋", action: upgradeLabel, projectedScore: battRel, reasoning: "Fixes overnight performance immediately" } as any);
        }
      }
      
      if (panelRel > reliabilityScore + 2) {
          upgradeProjections.push({ icon: "☀️", action: "+2 panels", projectedScore: panelRel, reasoning: scoreBreakdown.battery < 80 ? "Improves charging but still battery-limited" : "Accelerates daily system recovery" } as any);
      }
      
      if (battRel > reliabilityScore && panelRel > reliabilityScore) {
          const comboRelScore = computeReliability({ ...scoreBreakdown, battery: Math.round(scoreBatteryAutonomy((grossWh + addedWh) * dod * 0.92, profile.dailyEnergyWh)), solar: Math.round(newSolarScore) }, acRuntimeHours !== null ? (((grossWh + addedWh) * dod * 0.92)/acEffectiveW) : null);
          upgradeProjections.push({ icon: "🚀", action: `+1 battery string & 2 panels`, projectedScore: Math.min(100, comboRelScore), reasoning: "Full stability, handles cloudy days" } as any);
      }
    }

    return {
      tierLabel: uniqueOptions.length === 1 ? "🟡 Conditionally Reliable" as any : assignTierLabel(reliabilityScore, index, 0),
      package: pkg,
      lineItems: items,
      totalPriceNGN,
      monthlyPaymentOption,
      estimatedRuntimeRange,
      backupCapacityDays,
      reliabilityScore,
      scoreBreakdown,
      systemLimitedBy,
      consequenceText,
      realityCheckText,
      acCompatibilityText,
      bestForText,
      notIdealForText,
      upgradeProjections,
      seasonalAnalysis,
      batteryUsableWh: Math.round(usableWh),
      batteryDOD: dod,
      systemDerateFactors: SYSTEM_DERATE,
      diversityFactor: profile.diversityFactor ?? 1.0,
    } as any;
  });
}

// ─── 3: ASSEMBLE FINAL QUOTE ─────────────────────────────────
export function buildQuoteResult(
  extraction: AIExtractionResult,
  location: string = "Lagos"
): QuoteResult {
  const profile = computeLoadProfile(extraction, location);

  if (profile.dailyEnergyWh > 2000) {
    extraction.warnings.push(
      `🌡️ HIGH-DEMAND SYSTEM: Your calibrated daily demand is ${(profile.dailyEnergyWh / 1000).toFixed(1)} kWh. ` +
      `This includes the Nigeria heat penalty on cooling/refrigeration loads only — not a blanket 30% uplift on everything.`
    );
  }

  const options = buildQuoteOptions(profile, extraction, location);
  const installers =
    options.length > 0 && (options[0].package?.installationFee ?? 0) > 0
      ? getInstallersByLocation(location, 3)
      : [];

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
