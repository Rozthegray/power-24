// ============================================================
// lib/engine/mapper.ts  v3.0
// PRODUCTION-GRADE SOLAR PHYSICS ENGINE — ENGINEERING EDITION
// ============================================================
//
// v3.0 Bug Fixes vs v2.0:
//
//   FIX 1 — computeBankCapacity: Now reads BatterySpec.wiring field
//     ("series" | "parallel") explicitly. Falls back to voltage heuristic
//     only when wiring is omitted. This makes 12V-in-series banks
//     (2 × 12V/200Ah → 24V/200Ah) unambiguous and prevents the multi-spec
//     parallel-string Ah summation error.
//
//   FIX 2 — diversityFactor: Now uses extraction.appliances.length
//     (count of distinct load *types*) for threshold evaluation instead
//     of total unit count. Two AC units are exactly what diversity factor
//     was designed to account for; using unit count masked this.
//
//   FIX 3 — Upgrade projection battery math: Series-wired banks require
//     adding a full string (quantity units), not a single unit. The old
//     `grossWh / quantity` formula was wrong for series banks. The engine
//     now detects wiring topology and computes the correct string increment.
//     Upgrade suggestions for series banks now read "+1 full battery string"
//     and add the full correct Wh increment.
//
//   FIX 4 — computeReliability + scoreBatteryQuality:
//     ScoreBreakdown.environment renamed → quality (matching v3.0 types).
//     scoreBatteryQuality now distinguishes "tubular" from "lead-acid":
//     tubular-plate batteries have meaningfully better partial-SoC tolerance
//     and cycle life (500–800 vs 200–350 cycles) and deserve a higher score.
//
// ============================================================

import type {
  AIExtractionResult,
  BatterySpec,
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
  lighting:      0.85, // LEDs/bulbs: near-continuous when switched on
  cooling:       0.40, // AC compressor average on-time; cycles aggressively
  refrigeration: 0.33, // Fridge/freezer compressor ~1 cycle per 3 min at 35°C ambient
  entertainment: 0.90, // TV + decoder: effectively continuous when in use
  computing:     0.80, // Laptops & desktops cycle under variable CPU load
  water_pump:    0.20, // Short intermittent bursts (filling tanks)
  cooking:       0.12, // Microwave/blender: brief, high-intensity bursts
  security:      0.95, // CCTV + alarm: near-continuous 24/7
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
  combined:    0,   // computed below — do not hard-code this value
};
SYSTEM_DERATE.combined = parseFloat(
  (
    SYSTEM_DERATE.wiring *
    SYSTEM_DERATE.mppt *
    SYSTEM_DERATE.temperature *
    SYSTEM_DERATE.soiling
  ).toFixed(3)
);

// ─── SEASONAL PEAK SUN HOURS DATABASE ───────────────────────
interface PSHRecord { dry: number; rainy: number; avg: number }
const PSH_DATABASE: Record<string, PSHRecord> = {
  sokoto:           { dry: 6.8, rainy: 5.2, avg: 6.2 },
  kano:             { dry: 6.5, rainy: 5.0, avg: 6.0 },
  maiduguri:        { dry: 6.5, rainy: 5.0, avg: 6.0 },
  kaduna:           { dry: 6.0, rainy: 4.8, avg: 5.6 },
  abuja:            { dry: 5.5, rainy: 4.5, avg: 5.0 },
  ibadan:           { dry: 5.2, rainy: 4.0, avg: 4.6 },
  enugu:            { dry: 5.0, rainy: 4.0, avg: 4.5 },
  owerri:           { dry: 4.8, rainy: 3.5, avg: 4.2 },
  benin:            { dry: 4.8, rainy: 3.6, avg: 4.2 },
  warri:            { dry: 4.6, rainy: 3.4, avg: 4.0 },
  asaba:            { dry: 4.8, rainy: 3.8, avg: 4.3 },
  lagos:            { dry: 5.0, rainy: 3.8, avg: 4.4 },
  ph:               { dry: 4.5, rainy: 3.2, avg: 3.8 },
  "port harcourt":  { dry: 4.5, rainy: 3.2, avg: 3.8 },
  calabar:          { dry: 4.3, rainy: 3.0, avg: 3.7 },
  uyo:              { dry: 4.4, rainy: 3.1, avg: 3.8 },
};
const DEFAULT_PSH: PSHRecord = { dry: 5.0, rainy: 3.8, avg: 4.4 }; // Default: Lagos

function getPSH(location?: string): PSHRecord {
  const loc = (location ?? "lagos").toLowerCase().trim();
  return PSH_DATABASE[loc] ?? DEFAULT_PSH;
}

// ─── PRICE HELPERS ──────────────────────────────────────────
function getInverterPrice(kva: number): number {
  const PRICES: Record<number, number> = {
    1: 120_000, 2: 185_000, 3: 275_000,
    5: 480_000, 10: 950_000, 15: 1_650_000,
  };
  const keys = Object.keys(PRICES).map(Number).sort((a, b) => a - b);
  for (const key of keys) if (kva <= key) return PRICES[key];
  return PRICES[keys[keys.length - 1]];
}
function getBatteryPrice(type: string, capacityAh: number, voltageV: number): number {
  if (type === "lithium") return capacityAh * voltageV * 7.5;
  if (type === "gel")     return capacityAh * 12 * 3.5;
  if (type === "tubular") return capacityAh * 12 * 3.0; // tubular commands slight premium over flat-plate
  return capacityAh * 12 * 2.8; // lead-acid (flat-plate flooded)
}
function getPanelPrice(watts: number): number { return Math.round(watts * 550); }

// ─── BATTERY WIRING TOPOLOGY HELPER ─────────────────────────
function getBatteryWiring(spec: BatterySpec): "series" | "parallel" {
  if (spec.wiring) return spec.wiring;
  return spec.voltageV >= 48 ? "parallel" : "series";
}

// ─── BATTERY BANK CAPACITY MATH ─────────────────────────────
export function computeBankCapacity(
  batteries: SolarPackage["batteries"]
): { wh: number; systemVoltage: number } {
  if (!batteries?.length) return { wh: 0, systemVoltage: 12 };

  let totalWh = 0;
  let resolvedSystemVoltage = 12;

  for (const b of batteries) {
    const wiring = getBatteryWiring(b);

    if (wiring === "parallel") {
      const bankWh = b.voltageV * b.capacityAh * b.quantity;
      totalWh += bankWh;
      resolvedSystemVoltage = b.voltageV; 
    } else {
      const stringVoltage = b.voltageV * b.quantity;
      const stringWh = stringVoltage * b.capacityAh;
      totalWh += stringWh;
      resolvedSystemVoltage = stringVoltage; 
    }
  }

  return {
    wh: Math.round(totalWh),
    systemVoltage: resolvedSystemVoltage,
  };
}

function getBatteryDOD(batteries: SolarPackage["batteries"]): number {
  const type = batteries?.[0]?.type ?? "lead-acid";
  return type === "lithium" ? 0.80 : 0.50;
}

function getUsableWh(batteries: SolarPackage["batteries"]): number {
  const { wh } = computeBankCapacity(batteries);
  const dod = getBatteryDOD(batteries);
  const roundTripEff = 0.92; // Battery round-trip efficiency (charge/discharge losses)
  return wh * dod * roundTripEff;
}

function computeUpgradeStringWh(batteries: SolarPackage["batteries"]): {
  addedWh: number;
  upgradeLabel: string;
} {
  if (!batteries?.length) return { addedWh: 0, upgradeLabel: "+1 battery unit" };

  const first = batteries[0];
  const wiring = getBatteryWiring(first);

  if (wiring === "parallel") {
    const addedWh = first.voltageV * first.capacityAh;
    return { addedWh, upgradeLabel: "+1 battery unit" };
  } else {
    const stringWh = first.voltageV * first.quantity * first.capacityAh;
    const stringLabel =
      first.quantity === 1
        ? "+1 battery unit"
        : `+${first.quantity} batteries (1 full string)`;
    return { addedWh: stringWh, upgradeLabel: stringLabel };
  }
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

  const distinctLoadTypes = extraction.appliances.length;
  const diversityFactor =
    distinctLoadTypes <= 2 ? 1.00 :
    distinctLoadTypes <= 5 ? 0.90 :
    distinctLoadTypes <= 9 ? 0.82 : 0.75;

  const continuousLoad = Math.round(rawContinuous * diversityFactor);
  const surgeLoad = Math.round((continuousLoad + largestSurgeAddition) * 1.20);

  const requiredPanelWatts = Math.ceil(
    rawDailyWh / (psh.rainy * SYSTEM_DERATE.combined)
  );

  const targetBackupWh = rawDailyWh * (8 / 24);
  const requiredBatteryWh = targetBackupWh / (0.80 * 0.92);
  const requiredBatteryAh = Math.ceil(requiredBatteryWh / 48); // 48V-equiv Ah for display

  const requiredInverterKva = Math.ceil(surgeLoad / 1000);

  return {
    continuousLoad,
    surgeLoad,
    dailyEnergyWh:    Math.round(rawDailyWh),
    bufferedEnergyWh: Math.round(rawDailyWh * 1.15),
    peakSunHours:     psh.avg,
    requiredPanelWatts,
    requiredBatteryAh,
    requiredInverterKva,
    diversityFactor,
    systemDerate:     SYSTEM_DERATE.combined,
    autonomyHours:    8,
  };
}

// ─── RELIABILITY SCORING ENGINE v3.0 ────────────────────────
function scoreLoadCoverage(inverterKva: number, continuousW: number): number {
  const ratio = (inverterKva * 1000) / (continuousW || 1);
  if (ratio < 1.00) return 0;   // Under-sized — hard engineering fail
  if (ratio < 1.15) return 45;  // Tight margin; load spikes will stress it
  if (ratio < 1.50) return 88;  // Good 15–50% headroom
  if (ratio < 2.50) return 100; // Excellent headroom
  return 80;                    // Over-sized (inefficient at partial load)
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

function scoreSolarCoverage(
  dailyGenWh: number,
  dailyDemandWh: number,
  isPortable: boolean
): number {
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
  const { type, cycleLife } = batteries[0];
  if (type === "lithium") return Math.min(97, 72 + Math.floor(cycleLife / 300));
  if (type === "gel")     return 62;
  if (type === "tubular") return Math.min(72, 60 + Math.floor(cycleLife / 400));
  return 48; // lead-acid (flat-plate flooded)
}

function computeReliability(scores: ScoreBreakdown): number {
  const { load, battery, solar, surge, quality } = scores;
  let base =
    0.20 * load +
    0.30 * battery +
    0.25 * solar +
    0.15 * surge +
    0.10 * quality;

  if (battery < 35) base *= 0.65;
  if (surge < 35)   base *= 0.60;
  if (load < 40)    base *= 0.70;

  return Math.round(Math.min(100, Math.max(5, base)));
}

// ─── 2: BUILD QUOTE OPTIONS ENGINE ──────────────────────────
export function buildQuoteOptions(
  profile: LoadProfile,
  extraction: AIExtractionResult,
  location: string
): RankedPackage[] {
  const pshRecord = getPSH(location);

  // ─── DATA INJECTION FOR UI ──────────────────────────────────
  const acTotalRatedW = extraction.appliances.filter(a => a.category === "cooling").reduce((sum, a) => sum + a.unitWatts * a.quantity, 0);
  const acEffectiveW = acTotalRatedW * DUTY_CYCLES.cooling * (HEAT_PENALTY.cooling || 1.0);

  // ─── PACKAGE FILTERING ────────────────────────────────────
  let safePackages = SOLAR_PACKAGES.filter((pkg) => {
    if (!pkg) return false;
    const inverterUsableW =
      (pkg.inverter?.kva ?? 1) * 1000 * ((pkg.inverter?.efficiency ?? 90) / 100);
    const isPortable = pkg.installationFee === 0;

    if (profile.continuousLoad > inverterUsableW) return false;
    if (profile.surgeLoad > pkg.maxSurgeWatts)   return false;

    const usableWh = getUsableWh(pkg.batteries);
    if (usableWh < profile.dailyEnergyWh * 0.50) return false;

    if (!isPortable) {
      const totalPanelWatts = (pkg.panels ?? []).reduce(
        (sum, p) => sum + p.watts * p.quantity, 0
      );
      const rainySolarWh = totalPanelWatts * pshRecord.rainy * SYSTEM_DERATE.combined;
      if (rainySolarWh < profile.dailyEnergyWh * 0.50) return false;
    }
    return true;
  });

  safePackages.sort((a, b) => (a.basePrice ?? 0) - (b.basePrice ?? 0));

  // Optimization window: avoid massively over-sized inverters.
  let optimizedPackages = safePackages.filter((pkg) => {
    const inverterW = (pkg.inverter?.kva ?? 1) * 1000;
    return inverterW <= profile.surgeLoad * 4;
  });
  if (optimizedPackages.length === 0 && safePackages.length > 0) {
    optimizedPackages = safePackages;
  }

  if (optimizedPackages.length === 0) {
    extraction.warnings.push(
      "CRITICAL: Your load requires a custom enterprise-scale installation. " +
      "Showing largest available tier as a reference point only."
    );
    const fallback =
      SOLAR_PACKAGES.find((p) => p?.slug?.includes("oga")) ??
      SOLAR_PACKAGES[SOLAR_PACKAGES.length - 1];
    optimizedPackages = fallback ? [fallback] : [];
  }

  const selectedOptions: SolarPackage[] = [];
  if (optimizedPackages.length > 0) selectedOptions.push(optimizedPackages[0]);
  if (optimizedPackages.length > 1) selectedOptions.push(optimizedPackages[1]);
  if (optimizedPackages.length > 2)
    selectedOptions.push(optimizedPackages[Math.min(optimizedPackages.length - 1, 3)]);
  const uniqueOptions = [...new Set(selectedOptions)];

  const tierLabels: RankedPackage["tierLabel"][] = [
    "🟢 Survival Tier",
    "🟡 Conditionally Reliable",
    "🔵 Full Comfort Tier",
  ];

  return uniqueOptions.map((pkg, index) => {
    const items: LineItem[] = [];
    const safeInstFee   = pkg.installationFee ?? 0;
    const safeBasePrice = pkg.basePrice ?? 0;
    const isPortable    = safeInstFee === 0;

    if (isPortable) {
      items.push({
        description: `${pkg.name} Portable Power Station`,
        category: "hardware",
        quantity: 1,
        unitPrice: safeBasePrice,
        total: safeBasePrice,
      });
    } else {
      items.push({
        description: `${pkg.inverter.brand} ${pkg.inverter.kva}KVA Hybrid Inverter`,
        quantity: 1,
        unitPrice: getInverterPrice(pkg.inverter.kva),
        total: getInverterPrice(pkg.inverter.kva),
        category: "hardware",
      });
      for (const b of pkg.batteries) {
        const unitPrice = getBatteryPrice(b.type, b.capacityAh, b.voltageV);
        items.push({
          description: `${b.brand} ${b.capacityAh}Ah ${b.voltageV}V ${b.type.toUpperCase()} Battery`,
          quantity: b.quantity,
          unitPrice,
          total: unitPrice * b.quantity,
          category: "hardware",
        });
      }
      for (const p of pkg.panels) {
        const unitPrice = getPanelPrice(p.watts);
        items.push({
          description: `${p.brand} ${p.watts}W Monocrystalline Solar Panel`,
          quantity: p.quantity,
          unitPrice,
          total: unitPrice * p.quantity,
          category: "hardware",
        });
      }
      const hardwareSub = items.reduce((s, i) => s + i.total, 0);
      const bos = Math.round(hardwareSub * 0.08);
      items.push({
        description: "Balance of System (MC4 connectors, breakers, cables, racking)",
        quantity: 1,
        unitPrice: bos,
        total: bos,
        category: "hardware",
      });
      items.push({
        description: "NAESCO-Certified Professional Installation",
        quantity: 1,
        unitPrice: safeInstFee,
        total: safeInstFee,
        category: "installation",
      });
    }

    const totalPriceNGN = items.reduce((s, i) => s + i.total, 0);
    const monthlyPaymentOption = Math.ceil(
      (totalPriceNGN * 0.03 * Math.pow(1.03, 36)) / (Math.pow(1.03, 36) - 1)
    );

    const usableWh = getUsableWh(pkg.batteries);
    const dod      = getBatteryDOD(pkg.batteries);

    const { wh: grossWh } = computeBankCapacity(pkg.batteries);

    const totalPanelWatts = (pkg.panels ?? []).reduce(
      (sum, p) => sum + p.watts * p.quantity, 0
    );
    const avgDailyGenWh   = totalPanelWatts * pshRecord.avg   * SYSTEM_DERATE.combined;
    const rainyDailyGenWh = totalPanelWatts * pshRecord.rainy * SYSTEM_DERATE.combined;
    const dryDailyGenWh   = totalPanelWatts * pshRecord.dry   * SYSTEM_DERATE.combined;

    const baseRuntime         = usableWh / (profile.continuousLoad || 1);
    const estimatedRuntimeRange = `${Math.max(1, Math.floor(baseRuntime * 0.80))}–${Math.ceil(baseRuntime * 1.05)}`;
    
    // NEW UI FIELDS
    const rawBackupDays = usableWh / (profile.dailyEnergyWh || 1);
    const overProvisioningRatio = Math.round(rawBackupDays * 10) / 10;
    const isOverProvisioned = overProvisioningRatio > 5.0 && !isPortable;
    const backupCapacityDays    = `~${rawBackupDays.toFixed(1)} days`;

    const acRuntimeHours: number | null = acEffectiveW > 0 ? Math.round((usableWh / acEffectiveW) * 10) / 10 : null;

    const loadScore    = scoreLoadCoverage(pkg.inverter.kva, profile.continuousLoad);
    const batteryScore = scoreBatteryAutonomy(usableWh, profile.dailyEnergyWh);
    const solarScore   = scoreSolarCoverage(avgDailyGenWh, profile.dailyEnergyWh, isPortable);
    const surgeScore   = scoreSurgeHeadroom(pkg.maxSurgeWatts, profile.surgeLoad);
    const qualityScore = scoreBatteryQuality(pkg.batteries);

    const scoreBreakdown: ScoreBreakdown = {
      load:    Math.round(loadScore),
      battery: Math.round(batteryScore),
      solar:   Math.round(solarScore),
      surge:   Math.round(surgeScore),
      quality: Math.round(qualityScore),
    };
    const reliabilityScore = computeReliability(scoreBreakdown);

    let systemLimitedBy = "Optimally Balanced";
    if (reliabilityScore < 85) {
      if (scoreBreakdown.battery <= scoreBreakdown.solar && scoreBreakdown.battery <= scoreBreakdown.surge) systemLimitedBy = "Battery Capacity";
      else if (scoreBreakdown.solar < scoreBreakdown.battery && scoreBreakdown.solar <= scoreBreakdown.surge) systemLimitedBy = "Solar Generation";
      else systemLimitedBy = "Inverter Peak Limit";
    }

    let acCompatibilityText = "❄️ No ACs detected in load.";
    if (acRuntimeHours !== null) {
      if (acRuntimeHours >= 8.0) acCompatibilityText = `❄️ AC Supported: Full overnight runtime (~${acRuntimeHours.toFixed(1)} hrs capacity)`;
      else if (acRuntimeHours >= 3.0) acCompatibilityText = `❄️ AC Supported: Limited daytime/evening use (~${acRuntimeHours.toFixed(1)} hrs capacity)`;
      else acCompatibilityText = `❌ AC Not Recommended: Battery will drain rapidly (< 3 hrs capacity)`;
    }

    const rainySolarScore = scoreSolarCoverage(rainyDailyGenWh, profile.dailyEnergyWh, isPortable);
    const drySolarScore   = scoreSolarCoverage(dryDailyGenWh,   profile.dailyEnergyWh, isPortable);

    const seasonalAnalysis: SeasonalAnalysis = {
      drySeasonReliability:   computeReliability({ ...scoreBreakdown, solar: Math.round(drySolarScore) }),
      rainySeasonReliability: computeReliability({ ...scoreBreakdown, solar: Math.round(rainySolarScore) }),
      worstCasePSH:           pshRecord.rainy,
      worstCaseDailyGenWh:    Math.round(rainyDailyGenWh),
    };

    const rainyDrop = reliabilityScore - seasonalAnalysis.rainySeasonReliability;
    if (!isPortable && rainyDrop > 12 && seasonalAnalysis.rainySeasonReliability < 70) {
      extraction.warnings.push(
        `⛈️ SEASONAL GAP [${pkg.name}]: Reliability drops from ${reliabilityScore}% (annual avg) ` +
        `to ~${seasonalAnalysis.rainySeasonReliability}% in rainy season ` +
        `(April–Oct, ${pshRecord.rainy} PSH vs ${pshRecord.avg} avg in ${location}). ` +
        `Consider adding 2 extra panels to close this gap.`
      );
    }

    let consequenceText: string;
    let realityCheckText: string;
    let bestForText: string;
    let notIdealForText: string;

    if (reliabilityScore >= 85) {
      consequenceText  = "Provides excellent autonomy and strong resilience against multi-day outages and extended rainy periods.";
      realityCheckText = "Freezer and ACs will run reliably overnight regardless of grid availability.";
      bestForText      = "24/7 off-grid independence, all appliances including heavy cyclic loads";
      notIdealForText  = "Those who want a budget-first, install-fast setup";
    } else if (reliabilityScore >= 70) {
      consequenceText  = "Reliable for standard daily cycles, but may show strain during multi-day cloudy weather.";
      realityCheckText = `Strong daily performer. Rainy season score (~${seasonalAnalysis.rainySeasonReliability}%) suggests adding extra panels would provide full year-round independence.`;
      bestForText      = "Full house backup for 90%+ of the year";
      notIdealForText  = "Zero grid dependency during the peak of rainy season";
    } else if (reliabilityScore >= 50) {
      consequenceText  = "Reliable for daytime use and light overnight load. Heavy cyclic appliances may exhaust the battery before morning on high-demand days.";
      realityCheckText = "Freezers and ACs may not complete full overnight cycles during rainy season. Monitor battery levels during April–October.";
      bestForText      = "Standard household essentials with moderated overnight load";
      notIdealForText  = "Running multiple ACs or large freezers overnight in rainy season";
    } else {
      consequenceText  = "This system is best treated as daytime-only backup. It will struggle to sustain overnight load on a fully loaded day.";
      realityCheckText = "Heavy cyclic appliances (freezers, ACs) will likely exhaust this battery before morning. Not suitable for overnight compressor operation.";
      bestForText      = "Daytime lighting, phone charging, and light entertainment";
      notIdealForText  = "Overnight operation of freezers, ACs, or water pumps";
    }

    const upgradeProjections: UpgradeProjection[] = [];
    if (!isPortable && reliabilityScore < 95) {

      const newPanelWatts = totalPanelWatts + 800;
      const newGenWh      = newPanelWatts * pshRecord.avg * SYSTEM_DERATE.combined;
      const newSolarScore = scoreSolarCoverage(newGenWh, profile.dailyEnergyWh, false);
      const panelRel      = computeReliability({ ...scoreBreakdown, solar: Math.round(newSolarScore) });
      if (panelRel > reliabilityScore + 2) {
        upgradeProjections.push({ icon: "☀️", action: "+2 panels (~800W)", projectedScore: panelRel, reasoning: "Improves charging and reduces cloudy day risk" });
      }

      const { addedWh, upgradeLabel } = computeUpgradeStringWh(pkg.batteries);
      if (addedWh > 0) {
        const newUsableWh  = (grossWh + addedWh) * dod * 0.92;
        const newBattScore = scoreBatteryAutonomy(newUsableWh, profile.dailyEnergyWh);
        const battRel      = computeReliability({ ...scoreBreakdown, battery: Math.round(newBattScore) });
        if (battRel > reliabilityScore + 2) {
          upgradeProjections.push({ icon: "🔋", action: upgradeLabel, projectedScore: battRel, reasoning: "Improves overnight performance directly" });
        }
      }
    }

    return {
      tierLabel: uniqueOptions.length === 1
        ? "🟡 Conditionally Reliable"
        : tierLabels[index] ?? "Alternative Option",
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
      upgradeProjections,
      seasonalAnalysis,
      batteryUsableWh:     Math.round(usableWh),
      batteryDOD:          dod,
      systemDerateFactors: SYSTEM_DERATE,
      diversityFactor:     profile.diversityFactor ?? 1.0,
      acRuntimeHours,
      isOverProvisioned,
      overProvisioningRatio,
      systemLimitedBy,
      acCompatibilityText
    };
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
      `🌡️ HIGH-DEMAND SYSTEM: Your calibrated daily demand is ` +
      `${(profile.dailyEnergyWh / 1000).toFixed(1)} kWh. ` +
      `This includes the Nigeria heat penalty on cooling/refrigeration loads only — ` +
      `not a blanket 30% uplift on everything.`
    );
  }

  const options   = buildQuoteOptions(profile, extraction, location);
  const installers =
    options.length > 0 && (options[0].package?.installationFee ?? 0) > 0
      ? getInstallersByLocation(location, 3)
      : [];

  return {
    success:               true,
    requestId:             `P24-${nanoid(8).toUpperCase()}`,
    generatedAt:           new Date().toISOString(),
    appliances:            extraction.appliances,
    loadProfile:           profile,
    options,
    warnings:              extraction.warnings,
    engineersVerdict:      extraction.engineersVerdict,
    confidenceScore:       extraction.confidenceScore,
    recommendedInstallers: installers,
  };
}
