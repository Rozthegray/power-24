// ============================================================
// lib/engine/mapper.ts  v4.0
// ============================================================
//
// v4.0 Fixes vs v3.0:
//
//   FIX 1 — AC RUNTIME ENGINE (new):
//     Computes `acRuntimeHours` per package: usableWh ÷ effective AC draw.
//     Effective draw = rated watts × duty cycle (0.40) × heat penalty (1.35).
//     This is the only number that honestly answers "will my AC run overnight?"
//     The field is null when no cooling appliances are in the load.
//
//   FIX 2 — COPYWRITING TRUTHFULNESS:
//     `realityCheckText` and `bestForText` now gate on `overnightAcSupported`
//     (acRuntimeHours ≥ 8.0, or no AC in load) before claiming overnight AC
//     works. The old code granted this at reliabilityScore ≥ 85 regardless of
//     battery capacity vs AC energy demand — factually wrong.
//
//   FIX 3 — HONEST TIER LABELS (rename + score-gating):
//     "Survival Tier"       → "🟢 Smart Entry"   (v3 name implied barely alive)
//     "Conditionally Reliable" → "🟡 Daily Reliable"
//     "Full Comfort Tier"   → "🔵 Total Freedom"
//     Assignment is now score-driven: a 90%-reliable 5KVA system no longer
//     gets "Survival Tier" just because it's the cheapest of three options.
//
//   FIX 4 — OVER-PROVISIONING DETECTION:
//     When usableWh / dailyEnergyWh > 5×, the engine emits a sizing note and
//     sets `isOverProvisioned: true`. The Oga Boss at 8.5× daily demand now
//     gets an explicit note rather than being silently presented as a
//     routine "Full Comfort" upgrade.
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

// Nigeria heat penalty — thermal loads only
const HEAT_PENALTY: Partial<Record<ApplianceCategory, number>> = {
  cooling:       1.35,
  refrigeration: 1.25,
};

// ─── SYSTEM DERATE FACTORS  (0.97 × 0.97 × 0.88 × 0.95 ≈ 0.787) ──
export const SYSTEM_DERATE: SystemDerateBreakdown = {
  wiring: 0.97, mppt: 0.97, temperature: 0.88, soiling: 0.95, combined: 0,
};
SYSTEM_DERATE.combined = parseFloat(
  (SYSTEM_DERATE.wiring * SYSTEM_DERATE.mppt * SYSTEM_DERATE.temperature * SYSTEM_DERATE.soiling).toFixed(3)
);

// ─── SEASONAL PSH DATABASE ───────────────────────────────────
interface PSHRecord { dry: number; rainy: number; avg: number }
const PSH_DATABASE: Record<string, PSHRecord> = {
  sokoto:          { dry: 6.8, rainy: 5.2, avg: 6.2 },
  kano:            { dry: 6.5, rainy: 5.0, avg: 6.0 },
  maiduguri:       { dry: 6.5, rainy: 5.0, avg: 6.0 },
  kaduna:          { dry: 6.0, rainy: 4.8, avg: 5.6 },
  abuja:           { dry: 5.5, rainy: 4.5, avg: 5.0 },
  ibadan:          { dry: 5.2, rainy: 4.0, avg: 4.6 },
  enugu:           { dry: 5.0, rainy: 4.0, avg: 4.5 },
  owerri:          { dry: 4.8, rainy: 3.5, avg: 4.2 },
  benin:           { dry: 4.8, rainy: 3.6, avg: 4.2 },
  warri:           { dry: 4.6, rainy: 3.4, avg: 4.0 },
  asaba:           { dry: 4.8, rainy: 3.8, avg: 4.3 },
  lagos:           { dry: 5.0, rainy: 3.8, avg: 4.4 },
  ph:              { dry: 4.5, rainy: 3.2, avg: 3.8 },
  "port harcourt": { dry: 4.5, rainy: 3.2, avg: 3.8 },
  calabar:         { dry: 4.3, rainy: 3.0, avg: 3.7 },
  uyo:             { dry: 4.4, rainy: 3.1, avg: 3.8 },
};
const DEFAULT_PSH: PSHRecord = { dry: 5.0, rainy: 3.8, avg: 4.4 };
function getPSH(loc?: string): PSHRecord {
  return PSH_DATABASE[(loc ?? "lagos").toLowerCase().trim()] ?? DEFAULT_PSH;
}

// ─── PRICE HELPERS ──────────────────────────────────────────
function getInverterPrice(kva: number): number {
  const P: Record<number, number> = {
    1: 120_000, 2: 185_000, 3: 275_000, 5: 480_000, 10: 950_000, 15: 1_650_000,
  };
  const keys = Object.keys(P).map(Number).sort((a, b) => a - b);
  for (const k of keys) if (kva <= k) return P[k];
  return P[keys[keys.length - 1]];
}
function getBatteryPrice(type: string, ah: number, v: number): number {
  if (type === "lithium") return ah * v * 7.5;
  if (type === "tubular") return ah * 12 * 3.0;
  if (type === "gel")     return ah * 12 * 3.5;
  return ah * 12 * 2.8;
}
function getPanelPrice(watts: number): number { return Math.round(watts * 550); }

// ─── BATTERY HELPERS ─────────────────────────────────────────
function getBatteryWiring(b: BatterySpec): "series" | "parallel" {
  return b.wiring ?? (b.voltageV >= 48 ? "parallel" : "series");
}

export function computeBankCapacity(
  batteries: SolarPackage["batteries"]
): { wh: number; systemVoltage: number } {
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
  return wh * getBatteryDOD(batteries) * 0.92;
}

function computeUpgradeStringWh(batteries: SolarPackage["batteries"]): {
  addedWh: number; upgradeLabel: string;
} {
  if (!batteries?.length) return { addedWh: 0, upgradeLabel: "+1 battery unit" };
  const first = batteries[0];
  if (getBatteryWiring(first) === "parallel") {
    return { addedWh: first.voltageV * first.capacityAh, upgradeLabel: "+1 battery unit" };
  }
  const sw = first.voltageV * first.quantity * first.capacityAh;
  return {
    addedWh: sw,
    upgradeLabel: first.quantity === 1 ? "+1 battery unit" : `+${first.quantity} batteries (1 full string)`,
  };
}

// ─── 1: LOAD PROFILE ENGINE ─────────────────────────────────
export function computeLoadProfile(
  extraction: AIExtractionResult,
  location = "lagos"
): LoadProfile {
  const psh = getPSH(location);
  let rawContinuous = 0, largestSurge = 0, rawDailyWh = 0;

  for (const app of extraction.appliances) {
    const watts = app.unitWatts * app.quantity;
    rawContinuous += watts;
    rawDailyWh += watts
      * (DUTY_CYCLES[app.category] ?? 0.70)
      * app.dailyHours
      * (HEAT_PENALTY[app.category] ?? 1.0);
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
    dailyEnergyWh:    Math.round(rawDailyWh),
    bufferedEnergyWh: Math.round(rawDailyWh * 1.15),
    peakSunHours:     psh.avg,
    requiredPanelWatts: Math.ceil(rawDailyWh / (psh.rainy * SYSTEM_DERATE.combined)),
    requiredBatteryAh:  Math.ceil((rawDailyWh * 8 / 24) / (0.80 * 0.92) / 48),
    requiredInverterKva: Math.ceil(surgeLoad / 1000),
    diversityFactor,
    systemDerate:  SYSTEM_DERATE.combined,
    autonomyHours: 8,
  };
}

// ─── SCORING ─────────────────────────────────────────────────

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
  if (type === "gel")     return 62;
  if (type === "tubular") return Math.min(72, 60 + Math.floor(cycleLife / 400));
  return 48;
}

function computeReliability(scores: ScoreBreakdown): number {
  const { load, battery, solar, surge, quality } = scores;
  let base = 0.20 * load + 0.30 * battery + 0.25 * solar + 0.15 * surge + 0.10 * quality;
  if (battery < 35) base *= 0.65;
  if (surge < 35)   base *= 0.60;
  if (load < 40)    base *= 0.70;
  return Math.round(Math.min(100, Math.max(5, base)));
}

// ─── FIX 3: SCORE-DRIVEN TIER LABEL ─────────────────────────
// A 90%-reliable 5KVA system is never labelled "Survival Tier".
// Score < 65        → "🟢 Smart Entry"    (entry-level, manage expectations)
// Score 65–81       → "🟡 Daily Reliable" (solid everyday workhorse)
// Score ≥ 82        → "🔵 Total Freedom"  (strong autonomy)
// When multiple options score ≥ 82, the cheapest gets "🟡 Daily Reliable"
// so the selector pills remain distinguishable in the UI.
function assignTierLabel(
  score: number,
  pos: number,
  highCount: number // how many options in this quote score ≥ 82
): RankedPackage["tierLabel"] {
  if (score < 65) return "🟢 Smart Entry";
  if (score >= 82) {
    return (pos === 0 && highCount > 1) ? "🟡 Daily Reliable" : "🔵 Total Freedom";
  }
  return "🟡 Daily Reliable";
}

// ─── 2: BUILD QUOTE OPTIONS ──────────────────────────────────
export function buildQuoteOptions(
  profile: LoadProfile,
  extraction: AIExtractionResult,
  location: string
): RankedPackage[] {
  const psh = getPSH(location);

  // ─── FIX 1: Compute total AC load once (same for all packages) ────
  // acEffectiveW = the average watts the AC bank draws while running:
  //   rated watts × duty cycle (0.40) × heat penalty (1.35) ≈ ×0.54
  const acTotalRatedW = extraction.appliances
    .filter(a => a.category === "cooling")
    .reduce((sum, a) => sum + a.unitWatts * a.quantity, 0);
  const acEffectiveW = acTotalRatedW * 0.40 * 1.35;

  // Filter: packages that can handle this load
  let safePackages = SOLAR_PACKAGES.filter(pkg => {
    if (!pkg) return false;
    const invW = (pkg.inverter?.kva ?? 1) * 1000 * ((pkg.inverter?.efficiency ?? 90) / 100);
    const isP  = (pkg.installationFee ?? 0) === 0;
    if (profile.continuousLoad > invW)               return false;
    if (profile.surgeLoad > pkg.maxSurgeWatts)        return false;
    if (getUsableWh(pkg.batteries) < profile.dailyEnergyWh * 0.50) return false;
    if (!isP) {
      const pw    = (pkg.panels ?? []).reduce((s, p) => s + p.watts * p.quantity, 0);
      const rainW = pw * psh.rainy * SYSTEM_DERATE.combined;
      if (rainW < profile.dailyEnergyWh * 0.50) return false;
    }
    return true;
  });
  safePackages.sort((a, b) => (a.basePrice ?? 0) - (b.basePrice ?? 0));

  let opts = safePackages.filter(p => (p.inverter?.kva ?? 1) * 1000 <= profile.surgeLoad * 4);
  if (opts.length === 0) opts = safePackages;
  if (opts.length === 0) {
    extraction.warnings.push(
      "CRITICAL: Load requires a custom enterprise installation. Showing largest available tier for reference."
    );
    const fb = SOLAR_PACKAGES.find(p => p?.slug?.includes("oga")) ?? SOLAR_PACKAGES[SOLAR_PACKAGES.length - 1];
    opts = fb ? [fb] : [];
  }

  const sel: SolarPackage[] = [];
  if (opts.length > 0) sel.push(opts[0]);
  if (opts.length > 1) sel.push(opts[1]);
  if (opts.length > 2) sel.push(opts[Math.min(3, opts.length - 1)]);
  const uniq = [...new Set(sel)];

  // Pre-score to know how many score ≥ 82 (for tier label logic)
  const preScores = uniq.map(pkg => {
    const isP  = (pkg.installationFee ?? 0) === 0;
    const uWh  = getUsableWh(pkg.batteries);
    const panW = (pkg.panels ?? []).reduce((s, p) => s + p.watts * p.quantity, 0);
    const genWh= panW * psh.avg * SYSTEM_DERATE.combined;
    return computeReliability({
      load:    Math.round(scoreLoadCoverage(pkg.inverter.kva, profile.continuousLoad)),
      battery: Math.round(scoreBatteryAutonomy(uWh, profile.dailyEnergyWh)),
      solar:   Math.round(scoreSolarCoverage(genWh, profile.dailyEnergyWh, isP)),
      surge:   Math.round(scoreSurgeHeadroom(pkg.maxSurgeWatts, profile.surgeLoad)),
      quality: Math.round(scoreBatteryQuality(pkg.batteries)),
    });
  });
  const highCount = preScores.filter(s => s >= 82).length;

  return uniq.map((pkg, index) => {
    const isPortable = (pkg.installationFee ?? 0) === 0;

    // ─── LINE ITEMS ──────────────────────────────────────────────
    const items: LineItem[] = [];
    if (isPortable) {
      items.push({
        description: `${pkg.name} Portable Power Station`,
        category: "hardware", quantity: 1, unitPrice: pkg.basePrice, total: pkg.basePrice,
      });
    } else {
      items.push({
        description: `${pkg.inverter.brand} ${pkg.inverter.kva}KVA Hybrid Inverter`,
        quantity: 1, category: "hardware",
        unitPrice: getInverterPrice(pkg.inverter.kva),
        total: getInverterPrice(pkg.inverter.kva),
      });
      for (const b of pkg.batteries) {
        const u = getBatteryPrice(b.type, b.capacityAh, b.voltageV);
        items.push({
          description: `${b.brand} ${b.capacityAh}Ah ${b.voltageV}V ${b.type.toUpperCase()} Battery`,
          quantity: b.quantity, category: "hardware", unitPrice: u, total: u * b.quantity,
        });
      }
      for (const p of pkg.panels) {
        const u = getPanelPrice(p.watts);
        items.push({
          description: `${p.brand} ${p.watts}W Monocrystalline Solar Panel`,
          quantity: p.quantity, category: "hardware", unitPrice: u, total: u * p.quantity,
        });
      }
      const hwSub = items.reduce((s, i) => s + i.total, 0);
      const bos   = Math.round(hwSub * 0.08);
      items.push({
        description: "Balance of System (MC4 connectors, breakers, cables, racking)",
        quantity: 1, unitPrice: bos, total: bos, category: "hardware",
      });
      items.push({
        description: "NAESCO-Certified Professional Installation",
        quantity: 1, unitPrice: pkg.installationFee, total: pkg.installationFee, category: "installation",
      });
    }

    const totalPriceNGN = items.reduce((s, i) => s + i.total, 0);
    const monthly = Math.ceil((totalPriceNGN * 0.03 * Math.pow(1.03, 36)) / (Math.pow(1.03, 36) - 1));

    // ─── CAPACITY METRICS ────────────────────────────────────────
    const usableWh  = getUsableWh(pkg.batteries);
    const dod       = getBatteryDOD(pkg.batteries);
    const { wh: grossWh } = computeBankCapacity(pkg.batteries);

    const panW         = (pkg.panels ?? []).reduce((s, p) => s + p.watts * p.quantity, 0);
    const avgGenWh     = panW * psh.avg   * SYSTEM_DERATE.combined;
    const rainyGenWh   = panW * psh.rainy * SYSTEM_DERATE.combined;
    const dryGenWh     = panW * psh.dry   * SYSTEM_DERATE.combined;

    const baseRT             = usableWh / (profile.continuousLoad || 1);
    const estimatedRuntimeRange = `${Math.max(1, Math.floor(baseRT * 0.80))}–${Math.ceil(baseRT * 1.05)}`;
    const backupCapacityDays    = (usableWh / (profile.dailyEnergyWh || 1)).toFixed(1);

    // ─── FIX 1: AC RUNTIME PER PACKAGE ──────────────────────────
    // "If only the AC loads were running, how many hours would this battery last?"
    // Effective draw already factors in duty cycle and heat penalty (×0.54 total).
    // This is an OPTIMISTIC ceiling; other overnight loads reduce it further.
    // null = no cooling appliances in this quote.
    const acRuntimeHours: number | null = acEffectiveW > 0
      ? Math.round((usableWh / acEffectiveW) * 10) / 10
      : null;

    // Threshold: overnight AC runtime requires ≥ 8 hrs of AC-only battery headroom.
    // If AC-only runtime is 8 hrs, the battery has buffer even after other loads.
    // Below 8 hrs, overnight AC will exhaust the battery before dawn.
    const overnightAcOk = acRuntimeHours === null || acRuntimeHours >= 8.0;

    // ─── FIX 4: OVER-PROVISIONING ───────────────────────────────
    const ovRatio = usableWh / (profile.dailyEnergyWh || 1);
    const isOverProvisioned = ovRatio > 5.0 && !isPortable;
    if (isOverProvisioned) {
      extraction.warnings.push(
        `📦 SIZING NOTE [${pkg.name}]: This system stores ${ovRatio.toFixed(1)}× your ` +
        `current daily demand (${(profile.dailyEnergyWh / 1000).toFixed(1)} kWh). ` +
        `Excellent for significant load growth or business use; potentially over-budget ` +
        `if your load is fixed.`
      );
    }

    // ─── SCORING ─────────────────────────────────────────────────
    const sb: ScoreBreakdown = {
      load:    Math.round(scoreLoadCoverage(pkg.inverter.kva, profile.continuousLoad)),
      battery: Math.round(scoreBatteryAutonomy(usableWh, profile.dailyEnergyWh)),
      solar:   Math.round(scoreSolarCoverage(avgGenWh, profile.dailyEnergyWh, isPortable)),
      surge:   Math.round(scoreSurgeHeadroom(pkg.maxSurgeWatts, profile.surgeLoad)),
      quality: Math.round(scoreBatteryQuality(pkg.batteries)),
    };
    const reliabilityScore = computeReliability(sb);

    // ─── SEASONAL ANALYSIS ───────────────────────────────────────
    const seasonal: SeasonalAnalysis = {
      drySeasonReliability:   computeReliability({ ...sb, solar: Math.round(scoreSolarCoverage(dryGenWh,   profile.dailyEnergyWh, isPortable)) }),
      rainySeasonReliability: computeReliability({ ...sb, solar: Math.round(scoreSolarCoverage(rainyGenWh, profile.dailyEnergyWh, isPortable)) }),
      worstCasePSH:           psh.rainy,
      worstCaseDailyGenWh:    Math.round(rainyGenWh),
    };
    const rainyDrop = reliabilityScore - seasonal.rainySeasonReliability;
    if (!isPortable && rainyDrop > 12 && seasonal.rainySeasonReliability < 70) {
      extraction.warnings.push(
        `⛈️ SEASONAL GAP [${pkg.name}]: Drops from ${reliabilityScore}% (avg) to ` +
        `~${seasonal.rainySeasonReliability}% in rainy season (${psh.rainy} PSH, Apr–Oct in ${location}). +2 panels closes this gap.`
      );
    }

    // ─── FIX 2: HONEST COPYWRITING ──────────────────────────────
    // Principle: claims about specific appliances must be derivable from measured numbers,
    // not granted as a perk for hitting an arbitrary reliability threshold.
    let consequenceText: string;
    let realityCheckText: string;
    let bestForText: string;
    let notIdealForText: string;

    if (reliabilityScore >= 85) {
      consequenceText = isOverProvisioned
        ? `Exceptionally well-provisioned: ${ovRatio.toFixed(1)}× your current daily demand. Ideal if your load is expected to grow or if you're running a small business from home.`
        : "Strong autonomy and resilience. Handles consecutive cloudy days without meaningful disruption.";

      // FIX 2: the AC claim is now conditional on actual battery math
      if (overnightAcOk) {
        realityCheckText = acRuntimeHours !== null
          ? `AC-only battery runtime: ~${acRuntimeHours.toFixed(1)} hrs on a full charge. ` +
            `Other overnight loads (fridge, fans, lights) will reduce this — factor them into your planning.`
          : "System handles your full load with strong overnight autonomy. All appliances run reliably through the night.";
      } else {
        // High overall score but AC overnight fails the battery math
        realityCheckText =
          `⚠️ AC OVERNIGHT LIMIT: Battery supports ~${acRuntimeHours!.toFixed(1)} hrs of AC-only ` +
          `runtime — not a full overnight cycle. Other overnight loads reduce this further. ` +
          `Add 1 battery unit to achieve full overnight AC capability.`;
      }

      bestForText     = overnightAcOk
        ? "24/7 off-grid independence including overnight AC operation"
        : "Full daily backup including AC; add 1 battery unit for guaranteed overnight AC";
      notIdealForText = "Those prioritising the smallest upfront investment";

    } else if (reliabilityScore >= 70) {
      consequenceText = "Reliable for standard daily cycles; may need grid top-up during multi-day cloudy spells.";
      realityCheckText = overnightAcOk
        ? `AC-only battery runtime: ~${acRuntimeHours?.toFixed(1) ?? "—"} hrs. Good daily performer. ` +
          `Rainy season score (~${seasonal.rainySeasonReliability}%) — adding 2 panels gives full year-round independence.`
        : `⚠️ AC OVERNIGHT LIMIT: ~${acRuntimeHours!.toFixed(1)} hrs AC-only runtime on a full charge. ` +
          `Running AC overnight alongside fridge and lights will exhaust this battery before dawn. ` +
          `Upgrade battery capacity for overnight AC.`;
      bestForText     = overnightAcOk
        ? "Full house backup including daytime and early-evening AC"
        : "Full house backup without overnight AC; excellent for daytime AC use";
      notIdealForText = overnightAcOk
        ? "Absolute zero grid dependency during peak rainy season"
        : "Overnight AC operation without grid supplement";

    } else if (reliabilityScore >= 50) {
      consequenceText = "Good for daytime and light overnight loads. Heavy cyclic appliances may exhaust the battery before morning.";
      realityCheckText = acRuntimeHours !== null
        ? `⚠️ AC RUNTIME: ~${acRuntimeHours.toFixed(1)} hrs on this battery (AC loads alone). ` +
          `Not designed for overnight AC. Daytime AC use is viable while solar is generating.`
        : "Fridge and fans run reliably overnight. Monitor battery during April–October rainy season.";
      bestForText     = "Lighting, fans, entertainment, and supervised daytime appliance use";
      notIdealForText = "Overnight compressor operation (AC, freezer) without grid backup";

    } else {
      consequenceText = "Daytime-only backup. Will not sustain a loaded overnight cycle.";
      realityCheckText = "Not suitable for overnight compressor loads. Use as a grid/generator supplement, not a replacement.";
      bestForText     = "Daytime lighting, phone and laptop charging";
      notIdealForText = "Overnight operation of any heavy or compressor-driven appliance";
    }

    // ─── UPGRADE PROJECTIONS ─────────────────────────────────────
    const upgrades: UpgradeProjection[] = [];
    if (!isPortable && reliabilityScore < 95) {
      const newPanW  = panW + 800;
      const newGenWh = newPanW * psh.avg * SYSTEM_DERATE.combined;
      const pRel     = computeReliability({ ...sb, solar: Math.round(scoreSolarCoverage(newGenWh, profile.dailyEnergyWh, false)) });
      if (pRel > reliabilityScore + 2)
        upgrades.push({ action: "+2 panels (~800W)", projectedScore: pRel });

      const { addedWh, upgradeLabel } = computeUpgradeStringWh(pkg.batteries);
      if (addedWh > 0) {
        const newUWh = (grossWh + addedWh) * dod * 0.92;
        const bRel   = computeReliability({ ...sb, battery: Math.round(scoreBatteryAutonomy(newUWh, profile.dailyEnergyWh)) });
        if (bRel > reliabilityScore + 2)
          upgrades.push({ action: upgradeLabel, projectedScore: bRel });
      }
    }

    return {
      tierLabel: uniq.length === 1 ? "🟡 Daily Reliable" : assignTierLabel(reliabilityScore, index, highCount),
      package: pkg,
      lineItems: items,
      totalPriceNGN,
      monthlyPaymentOption: monthly,
      estimatedRuntimeRange,
      backupCapacityDays,
      reliabilityScore,
      scoreBreakdown: sb,
      consequenceText,
      realityCheckText,
      bestForText,
      notIdealForText,
      upgradeProjections: upgrades,
      seasonalAnalysis: seasonal,
      batteryUsableWh:     Math.round(usableWh),
      batteryDOD:          dod,
      systemDerateFactors: SYSTEM_DERATE,
      diversityFactor:     profile.diversityFactor ?? 1.0,
      // v4.0 new fields
      acRuntimeHours,
      isOverProvisioned,
      overProvisioningRatio: Math.round(ovRatio * 10) / 10,
    };
  });
}

// ─── 3: ASSEMBLE FINAL QUOTE ─────────────────────────────────
export function buildQuoteResult(
  extraction: AIExtractionResult,
  location = "Lagos"
): QuoteResult {
  const profile = computeLoadProfile(extraction, location);
  if (profile.dailyEnergyWh > 2000) {
    extraction.warnings.push(
      `🌡️ HIGH-DEMAND: Calibrated demand is ${(profile.dailyEnergyWh / 1000).toFixed(1)} kWh/day. ` +
      `Heat penalty applied to cooling/refrigeration only.`
    );
  }
  const options    = buildQuoteOptions(profile, extraction, location);
  const installers = options.length > 0 && (options[0].package?.installationFee ?? 0) > 0
    ? getInstallersByLocation(location, 3) : [];
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
