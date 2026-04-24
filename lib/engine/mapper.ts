// ============================================================
// lib/engine/mapper.ts  v6.0
// THE HONEST INSTALLER EDITION
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

const DUTY_CYCLES: Record<ApplianceCategory, number> = {
  lighting: 0.85, cooling: 0.40, refrigeration: 0.33,
  entertainment: 0.90, computing: 0.80, water_pump: 0.20,
  cooking: 0.12, security: 0.95, other: 0.70,
};

const HEAT_PENALTY: Partial<Record<ApplianceCategory, number>> = {
  cooling: 1.35, refrigeration: 1.25,
};

export const SYSTEM_DERATE: SystemDerateBreakdown = {
  wiring: 0.97, mppt: 0.97, temperature: 0.88, soiling: 0.95, combined: 0,
};
SYSTEM_DERATE.combined = parseFloat((0.97 * 0.97 * 0.88 * 0.95).toFixed(3));

interface PSHRecord { dry: number; rainy: number; avg: number }
const PSH_DATABASE: Record<string, PSHRecord> = {
  lagos: { dry: 5.0, rainy: 3.8, avg: 4.4 },
  abuja: { dry: 5.5, rainy: 4.5, avg: 5.0 },
  ph: { dry: 4.5, rainy: 3.2, avg: 3.8 },
  kano: { dry: 6.5, rainy: 5.0, avg: 6.0 },
};
const DEFAULT_PSH: PSHRecord = { dry: 5.0, rainy: 3.8, avg: 4.4 };

function getPSH(loc?: string): PSHRecord {
  return PSH_DATABASE[(loc ?? "lagos").toLowerCase().trim()] ?? DEFAULT_PSH;
}

function getInverterPrice(kva: number): number {
  const P: Record<number, number> = { 1: 120_000, 2: 185_000, 3: 275_000, 5: 480_000, 10: 950_000, 15: 1_650_000 };
  const keys = Object.keys(P).map(Number).sort((a, b) => a - b);
  for (const k of keys) if (kva <= k) return P[k];
  return P[keys[keys.length - 1]];
}

function getBatteryPrice(type: string, ah: number, v: number): number {
  if (type === "lithium") return ah * v * 7.5;
  if (type === "tubular") return ah * 12 * 3.0;
  if (type === "gel") return ah * 12 * 3.5;
  return ah * 12 * 2.8;
}

function getPanelPrice(watts: number): number { return Math.round(watts * 550); }

function getBatteryWiring(b: BatterySpec): "series" | "parallel" {
  return b.wiring ?? (b.voltageV >= 48 ? "parallel" : "series");
}

export function computeBankCapacity(batteries: SolarPackage["batteries"]): { wh: number; systemVoltage: number } {
  if (!batteries?.length) return { wh: 0, systemVoltage: 12 };
  let totalWh = 0, sysV = 12;
  for (const b of batteries) {
    if (getBatteryWiring(b) === "parallel") {
      totalWh += b.voltageV * b.capacityAh * b.quantity;
      sysV = b.voltageV;
    } else {
      const sv = b.voltageV * b.quantity;
      totalWh += sv * b.capacityAh;
      sysV = sv;
    }
  }
  return { wh: Math.round(totalWh), systemVoltage: sysV };
}

function getBatteryDOD(batteries: SolarPackage["batteries"]): number {
  return (batteries?.[0]?.type ?? "lead-acid") === "lithium" ? 0.80 : 0.50;
}

function getUsableWh(batteries: SolarPackage["batteries"]): number {
  const { wh } = computeBankCapacity(batteries);
  return wh * getBatteryDOD(batteries) * 0.92; // 0.92 = round-trip efficiency
}

function computeUpgradeStringWh(batteries: SolarPackage["batteries"]): { addedWh: number; upgradeLabel: string } {
  if (!batteries?.length) return { addedWh: 0, upgradeLabel: "+1 battery unit" };
  const first = batteries[0];
  if (getBatteryWiring(first) === "parallel") {
    return { addedWh: first.voltageV * first.capacityAh, upgradeLabel: "+1 battery unit" };
  }
  const sw = first.voltageV * first.quantity * first.capacityAh;
  return { addedWh: sw, upgradeLabel: first.quantity === 1 ? "+1 battery unit" : `+${first.quantity} batteries (1 string)` };
}

export function computeLoadProfile(extraction: AIExtractionResult, location = "lagos"): LoadProfile {
  const psh = getPSH(location);
  let rawContinuous = 0, largestSurge = 0, rawDailyWh = 0;

  for (const app of extraction.appliances) {
    const watts = app.unitWatts * app.quantity;
    rawContinuous += watts;
    rawDailyWh += watts * (DUTY_CYCLES[app.category] ?? 0.70) * app.dailyHours * (HEAT_PENALTY[app.category] ?? 1.0);
    if (app.hasSurge && app.surgeMultiplier > 1) {
      const s = app.unitWatts * (app.surgeMultiplier - 1);
      if (s > largestSurge) largestSurge = s;
    }
  }

  const n = extraction.appliances.length;
  const diversityFactor = n <= 2 ? 1.00 : n <= 5 ? 0.90 : n <= 9 ? 0.82 : 0.75;
  const continuousLoad = Math.round(rawContinuous * diversityFactor);
  const surgeLoad = Math.round((continuousLoad + largestSurge) * 1.20);

  return {
    continuousLoad,
    surgeLoad,
    dailyEnergyWh: Math.round(rawDailyWh),
    bufferedEnergyWh: Math.round(rawDailyWh * 1.15),
    peakSunHours: psh.avg,
    requiredPanelWatts: Math.ceil(rawDailyWh / (psh.rainy * SYSTEM_DERATE.combined)),
    requiredBatteryAh: Math.ceil((rawDailyWh * 8 / 24) / (0.80 * 0.92) / 48),
    requiredInverterKva: Math.ceil(surgeLoad / 1000),
    diversityFactor,
    systemDerate: SYSTEM_DERATE.combined,
    autonomyHours: 8,
  };
}

function scoreLoadCoverage(kva: number, contW: number): number {
  const r = (kva * 1000) / (contW || 1);
  if (r < 1.00) return 0;
  if (r < 1.15) return 45;
  if (r < 1.50) return 88;
  if (r < 2.50) return 100;
  return 80;
}

function scoreBatteryAutonomy(usableWh: number, dailyWh: number): number {
  const d = usableWh / (dailyWh || 1);
  if (d < 0.30) return 10;
  if (d < 0.50) return 28;
  if (d < 0.80) return 50;
  if (d < 1.00) return 65;
  if (d < 1.50) return 80;
  if (d < 2.00) return 90;
  return 97;
}

function scoreSolarCoverage(genWh: number, demandWh: number, isPortable: boolean): number {
  if (isPortable) return 50;
  const r = genWh / (demandWh || 1);
  if (r < 0.50) return 15;
  if (r < 0.70) return 40;
  if (r < 0.90) return 62;
  if (r < 1.10) return 80;
  if (r < 1.30) return 90;
  return 98;
}

function scoreSurgeHeadroom(maxSurgeW: number, sysW: number): number {
  const r = maxSurgeW / (sysW || 1);
  if (r < 1.00) return 0;
  if (r < 1.10) return 35;
  if (r < 1.30) return 65;
  if (r < 1.50) return 85;
  return 100;
}

function scoreBatteryQuality(batteries: SolarPackage["batteries"]): number {
  if (!batteries?.length) return 50;
  const { type, cycleLife } = batteries[0];
  if (type === "lithium") return Math.min(97, 72 + Math.floor(cycleLife / 300));
  if (type === "gel") return 62;
  if (type === "tubular") return Math.min(72, 60 + Math.floor(cycleLife / 400));
  return 48;
}

function computeReliability(scores: ScoreBreakdown, acRuntimeHours: number | null): number {
  const { load, battery, solar, surge, quality } = scores;
  let base = 0.20 * load + 0.30 * battery + 0.25 * solar + 0.15 * surge + 0.10 * quality;
  if (battery < 35) base *= 0.65;
  if (surge < 35) base *= 0.60;
  if (load < 40) base *= 0.70;
  
  if (acRuntimeHours !== null && acRuntimeHours < 4.0) {
      base *= 0.85; 
  }
  return Math.round(Math.min(100, Math.max(5, base)));
}

function assignTierLabel(score: number, pos: number, highCount: number): RankedPackage["tierLabel"] {
  if (score < 60) return "🟠 Low Reliability (Conditional)";
  if (score >= 82) return (pos === 0 && highCount > 1) ? "🟡 Daily Reliable" : "🔵 High Reliability";
  return "🟡 Conditionally Reliable";
}

export function buildQuoteOptions(profile: LoadProfile, extraction: AIExtractionResult, location: string): RankedPackage[] {
  const psh = getPSH(location);

  // TRUE NIGHT LOAD CALCULATION
  let nightLoadW = 0;
  let acTotalRatedW = 0;
  for (const app of extraction.appliances) {
    if (app.category === "cooling") {
      acTotalRatedW += app.unitWatts * app.quantity;
      nightLoadW += app.unitWatts * app.quantity * DUTY_CYCLES.cooling * HEAT_PENALTY.cooling!;
    } else if (app.category === "refrigeration") {
      nightLoadW += app.unitWatts * app.quantity * DUTY_CYCLES.refrigeration * HEAT_PENALTY.refrigeration!;
    } else if (["lighting", "entertainment", "security"].includes(app.category)) {
      nightLoadW += app.unitWatts * app.quantity * 0.50; // Assume 50% concurrent night use
    }
  }
  if (nightLoadW < 100) nightLoadW = profile.continuousLoad * 0.40; // Fallback if no specific night loads
  const acEffectiveW = acTotalRatedW * DUTY_CYCLES.cooling * HEAT_PENALTY.cooling!;

  let safePackages = SOLAR_PACKAGES.filter(pkg => {
    if (!pkg) return false;
    const invW = (pkg.inverter?.kva ?? 1) * 1000 * ((pkg.inverter?.efficiency ?? 90) / 100);
    const isP = (pkg.installationFee ?? 0) === 0;
    if (profile.continuousLoad > invW) return false;
    if (profile.surgeLoad > pkg.maxSurgeWatts) return false;
    if (getUsableWh(pkg.batteries) < profile.dailyEnergyWh * 0.50) return false;
    return true;
  });

  safePackages.sort((a, b) => (a.basePrice ?? 0) - (b.basePrice ?? 0));

  // SCALING CAP: Stop blindly suggesting 40kWh batteries for 4kWh loads
  let opts = safePackages.filter(p => {
      const invW = (p.inverter?.kva ?? 1) * 1000;
      const usableWh = getUsableWh(p.batteries);
      return invW <= profile.surgeLoad * 3.5 && usableWh <= profile.dailyEnergyWh * 4.0;
  });
  if (opts.length === 0) opts = safePackages;

  const sel: SolarPackage[] = [];
  if (opts.length > 0) sel.push(opts[0]);
  if (opts.length > 1) sel.push(opts[1]);
  if (opts.length > 2) sel.push(opts[Math.min(3, opts.length - 1)]);
  const uniq = [...new Set(sel)];

  return uniq.map((pkg, index) => {
    const isPortable = (pkg.installationFee ?? 0) === 0;
    const items: LineItem[] = [];

    const safeInstFee = pkg.installationFee ?? 0;
    const safeBasePrice = pkg.basePrice ?? 0;
    if (isPortable) {
      items.push({ description: `${pkg.name} Portable Power Station`, category: "hardware", quantity: 1, unitPrice: safeBasePrice, total: safeBasePrice });
    } else {
      items.push({ description: `${pkg.inverter.brand} ${pkg.inverter.kva}KVA Hybrid Inverter`, quantity: 1, category: "hardware", unitPrice: getInverterPrice(pkg.inverter.kva), total: getInverterPrice(pkg.inverter.kva) });
      for (const b of pkg.batteries) { const u = getBatteryPrice(b.type, b.capacityAh, b.voltageV); items.push({ description: `${b.brand} ${b.capacityAh}Ah ${b.voltageV}V ${b.type.toUpperCase()}`, quantity: b.quantity, category: "hardware", unitPrice: u, total: u * b.quantity }); }
      for (const p of pkg.panels) { const u = getPanelPrice(p.watts); items.push({ description: `${p.brand} ${p.watts}W Mono Panel`, quantity: p.quantity, category: "hardware", unitPrice: u, total: u * p.quantity }); }
      const hwSub = items.reduce((s, i) => s + i.total, 0); const bos = Math.round(hwSub * 0.08);
      items.push({ description: "Balance of System", quantity: 1, unitPrice: bos, total: bos, category: "hardware" });
      items.push({ description: "Professional Installation", quantity: 1, unitPrice: safeInstFee, total: safeInstFee, category: "installation" });
    }

    const totalPriceNGN = items.reduce((s, i) => s + i.total, 0);
    const monthly = Math.ceil((totalPriceNGN * 0.03 * Math.pow(1.03, 36)) / (Math.pow(1.03, 36) - 1));

    const usableWh = getUsableWh(pkg.batteries);
    const dod = getBatteryDOD(pkg.batteries);
    const { wh: grossWh } = computeBankCapacity(pkg.batteries);
    const panW = (pkg.panels ?? []).reduce((s, p) => s + p.watts * p.quantity, 0);
    const avgGenWh = panW * psh.avg * SYSTEM_DERATE.combined;

    // TRUE NIGHT RUNTIME (battery ÷ night load)
    const nightRuntimeHrs = usableWh / nightLoadW;
    const estimatedRuntimeRange = `${Math.max(1, Math.floor(nightRuntimeHrs * 0.80))}–${Math.ceil(nightRuntimeHrs * 1.15)}`;
    
    const rawBackupDays = usableWh / (profile.dailyEnergyWh || 1);
    let backupCapacityDays = `~${rawBackupDays.toFixed(1)} days`;
    if (rawBackupDays < 1.0) backupCapacityDays += " (cannot handle 1 full cloudy day)";
    else if (rawBackupDays > 1.5) backupCapacityDays += " (resilient)";

    const acRuntimeHours: number | null = acEffectiveW > 0 ? Math.round((usableWh / acEffectiveW) * 10) / 10 : null;

    const sb: ScoreBreakdown = {
      load: Math.round(scoreLoadCoverage(pkg.inverter.kva, profile.continuousLoad)),
      battery: Math.round(scoreBatteryAutonomy(usableWh, profile.dailyEnergyWh)),
      solar: Math.round(scoreSolarCoverage(avgGenWh, profile.dailyEnergyWh, isPortable)),
      surge: Math.round(scoreSurgeHeadroom(pkg.maxSurgeWatts, profile.surgeLoad)),
      quality: Math.round(scoreBatteryQuality(pkg.batteries)),
    };
    
    const reliabilityScore = computeReliability(sb, acRuntimeHours);

    let systemLimitedBy = "Optimally Balanced";
    if (reliabilityScore < 85) {
      if (sb.battery <= sb.solar && sb.battery <= sb.surge) systemLimitedBy = "Battery Capacity";
      else if (sb.solar < sb.battery && sb.solar <= sb.surge) systemLimitedBy = "Solar Generation";
      else systemLimitedBy = "Inverter Peak Limit";
    }

    // AC COMPATIBILITY ENGINE
    let acCompatibilityText = "❄️ No ACs detected in load.";
    if (acRuntimeHours !== null) {
      if (acRuntimeHours >= 10.0) acCompatibilityText = `❄️ AC Supported: Full overnight runtime (~${acRuntimeHours.toFixed(1)} hrs capacity)`;
      else if (acRuntimeHours >= 4.0) acCompatibilityText = `❄️ AC Supported: Limited evening use (~${acRuntimeHours.toFixed(1)} hrs capacity)`;
      else acCompatibilityText = `❌ AC Not Recommended: Battery will drain rapidly (< 4 hrs capacity)`;
    }

    // HONEST COPYWRITING
    let consequenceText: string; let realityCheckText: string; let bestForText: string; let notIdealForText: string;

    if (reliabilityScore >= 82) {
      consequenceText = "Strong autonomy. Handles consecutive cloudy days reliably.";
      realityCheckText = acRuntimeHours !== null && acRuntimeHours < 8.0 
        ? "⚠️ Limited AC Runtime. Other appliances run perfectly, but AC must be managed." 
        : "Supports overnight AC usage depending on runtime and battery state.";
      bestForText = "24/7 off-grid independence";
      notIdealForText = "Budget-constrained rapid setups";
    } else if (reliabilityScore >= 60) {
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

    const upgrades: UpgradeProjection[] = [];
    if (!isPortable && reliabilityScore < 90) {
      const { addedWh, upgradeLabel } = computeUpgradeStringWh(pkg.batteries);
      if (addedWh > 0) {
        const newUWh = (grossWh + addedWh) * dod * 0.92;
        const bRel = computeReliability({ ...sb, battery: Math.round(scoreBatteryAutonomy(newUWh, profile.dailyEnergyWh)) }, acRuntimeHours !== null ? (newUWh/acEffectiveW) : null);
        if (bRel > reliabilityScore + 2) upgrades.push({ action: upgradeLabel, projectedScore: bRel, icon: "🔋", reasoning: "Fixes overnight performance" });
      }
    }

    return {
      tierLabel: uniq.length === 1 ? "🟡 Conditionally Reliable" : assignTierLabel(reliabilityScore, index, 0) as any,
      package: pkg,
      lineItems: items,
      totalPriceNGN,
      monthlyPaymentOption: monthly,
      estimatedRuntimeRange,
      backupCapacityDays,
      reliabilityScore,
      scoreBreakdown: sb,
      systemLimitedBy,
      consequenceText,
      realityCheckText,
      acCompatibilityText,
      bestForText,
      notIdealForText,
      upgradeProjections: upgrades,
    };
  });
}

export function buildQuoteResult(extraction: AIExtractionResult, location = "Lagos"): QuoteResult {
  const profile = computeLoadProfile(extraction, location);
  const options = buildQuoteOptions(profile, extraction, location);
  const installers = options.length > 0 && (options[0].package?.installationFee ?? 0) > 0 ? getInstallersByLocation(location, 3) : [];
  return { success: true, requestId: `P24-${nanoid(8).toUpperCase()}`, generatedAt: new Date().toISOString(), appliances: extraction.appliances, loadProfile: profile, options, warnings: extraction.warnings, engineersVerdict: extraction.engineersVerdict, confidenceScore: extraction.confidenceScore, recommendedInstallers: installers };
}
