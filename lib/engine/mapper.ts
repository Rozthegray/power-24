// ============================================================
// lib/engine/mapper.ts
// ─── THE PHYSICS & SURGE ROUTING ENGINE ──────────────────────
// Takes raw AI extraction, applies Nigerian solar engineering
// rules, and returns the optimal package + line-item pricing.
// ============================================================

import type {
  AIExtractionResult,
  LoadProfile,
  SolarPackage,
  LineItem,
  QuoteResult,
} from "@/lib/types";
import { SOLAR_PACKAGES } from "@/lib/data/packages";
import { getInstallersByLocation } from "@/lib/data/installers";
import { nanoid } from "nanoid";

// ─── Step 1: Compute Load Profile ────────────────────────────

export function computeLoadProfile(
  extraction: AIExtractionResult,
  location: string = "lagos"
): LoadProfile {
  const loc = location.toLowerCase().trim();

  // 1. RECALCULATE LOADS NATIVELY (Never trust LLM math)
  let trueContinuous = 0;
  let maxSurgeAddition = 0;

  for (const app of extraction.appliances) {
    const appTotalWatts = app.unitWatts * app.quantity;
    trueContinuous += appTotalWatts;

    // If it has a motor/compressor, calculate its surge footprint
    if (app.hasSurge && app.surgeMultiplier > 1) {
      const surgeAddition = app.unitWatts * (app.surgeMultiplier - 1); // Only the extra surge watts
      if (surgeAddition > maxSurgeAddition) {
        maxSurgeAddition = surgeAddition; // We only care about the single highest surge
      }
    }
  }

  const trueSurge = trueContinuous + maxSurgeAddition;

  // 2. Harmattan & Heat Derating (15%-25% loss due to heat and dust)
  const isNorth = ["kano", "sokoto", "maiduguri", "abuja", "kaduna", "jos", "fct"].some(l => loc.includes(l));
  const environmentDerating = isNorth ? 0.75 : 0.85;

  // 3. Peak Sun Hours Mapping
  const pshMap: Record<string, number> = {
    sokoto: 7.0, maiduguri: 6.8, kano: 6.5, abuja: 5.8,
    enugu: 5.1, ibadan: 5.0, owerri: 4.9, lagos: 4.8, "port harcourt": 4.5,
    warri: 4.7, benin: 4.9, kaduna: 5.6, jos: 5.9
  };
  
  let psh = 5.0; // National Average Default
  for (const [city, hours] of Object.entries(pshMap)) {
    if (loc.includes(city)) psh = hours;
  }

  // 4. Core Physics Calculations
  const bufferedEnergyWh = extraction.estimatedDailyWattHours * 1.30; 
  const requiredPanelWatts = Math.ceil(bufferedEnergyWh / (psh * environmentDerating));

  const requiredBatteryAh = Math.ceil((trueContinuous * 8 * 1.30) / (48 * 0.80));
  const requiredInverterKva = Math.ceil((trueSurge * 1.20) / 100) / 10;

  return {
    continuousLoad: trueContinuous,
    surgeLoad: trueSurge,
    dailyEnergyWh: extraction.estimatedDailyWattHours,
    bufferedEnergyWh,
    peakSunHours: psh,
    requiredPanelWatts,
    requiredBatteryAh,
    requiredInverterKva,
  };
}

// ─── Step 2: Select Package (The Surge Router) ────────────────

export function selectPackage(profile: LoadProfile, warnings: string[]): SolarPackage {
  // 1. FOOLPROOF PORTABLE CHECK: Trust the math, not just the AI.
  const aiWantsPortable = warnings.includes("PORTABLE_RECOMMENDED");
  const mathWantsPortable = profile.continuousLoad <= 800 && profile.surgeLoad <= 1500;
  const isPortableLoad = aiWantsPortable || mathWantsPortable;

  const surgeRatio = profile.continuousLoad > 0 ? (profile.surgeLoad / profile.continuousLoad) : 1;

  // ─── INDUCTIVE SURGE OVERRIDE ──────────────────────────────
  // If the surge is huge (more than 2x continuous) AND it's not a tiny portable load,
  // route them to heavy-transformer systems (Blue Gate, PRAG, Deye).
  if (!isPortableLoad && surgeRatio > 2.0) {
    const surgeMonsters = ["bluegate-surge-master", "prag-heavy-duty", "deye-flagship"];
    for (const slug of surgeMonsters) {
      const pkg = SOLAR_PACKAGES.find(p => p.slug === slug);
      if (pkg && profile.continuousLoad <= pkg.maxContinuousWatts && profile.surgeLoad <= pkg.maxSurgeWatts) {
        return pkg;
      }
    }
  }

  // ─── STANDARD ROUTING ──────────────────────────────────────
  // Sort packages from smallest to largest continuous watts
  const sorted = [...SOLAR_PACKAGES].sort((a, b) => a.maxContinuousWatts - b.maxContinuousWatts);

  for (const pkg of sorted) {
    const isPortablePkg = ["lumos-l1", "cola-1000-pro", "ecoflow-river-2-pro", "ecoflow-delta-pro"].includes(pkg.slug);

    // If it's a huge house load, hide the portables. If it's a tiny load, allow them!
    if (!isPortableLoad && isPortablePkg) continue;

    // Apply Empirical 0.8 Power Factor Penalty to Budget Inverters
    const isBudgetInverter = ["Felicity", "Lumos", "itel", "Luminous"].includes(pkg.inverter.brand);
    const actualContinuousLimit = isBudgetInverter
      ? pkg.inverter.kva * 1000 * 0.8
      : pkg.maxContinuousWatts;

    // Check if system can handle the load
    if (profile.continuousLoad <= actualContinuousLimit && profile.surgeLoad <= pkg.maxSurgeWatts) {
      return pkg;
    }
  }

  // ─── FALLBACKS ─────────────────────────────────────────────
  if (isPortableLoad) {
    return SOLAR_PACKAGES.find(p => p.slug === "ecoflow-delta-pro") || sorted[sorted.length - 1];
  }
  return sorted[sorted.length - 1]; // Default to Deye Flagship if off the charts
}

// ─── Step 3: Build Line Items ─────────────────────────────────

export function buildLineItems(pkg: SolarPackage): LineItem[] {
  const items: LineItem[] = [];

  // If it's a portable/all-in-one system, no installation fee
  if (pkg.installationFee === 0) {
    items.push({
      description: `${pkg.name} Portable Power Station (${pkg.batteries[0].capacityAh}Ah / ${pkg.inverter.kva * 1000}W)`,
      category: "hardware",
      quantity: 1,
      unitPrice: pkg.basePrice,
      total: pkg.basePrice,
    });
    return items;
  }

  // Otherwise, breakdown the permanent installation
  const inverterTotal = pkg.basePrice * 0.4;
  const batteryTotal = pkg.basePrice * 0.4;
  const panelTotal = pkg.basePrice * 0.2;

  items.push({
    description: `${pkg.inverter.brand} ${pkg.inverter.model} ${pkg.inverter.kva}KVA ${pkg.inverter.type === "hybrid" ? "Hybrid " : ""}Inverter`,
    quantity: 1,
    unitPrice: inverterTotal,
    total: inverterTotal,
    category: "hardware",
  });

  const batt = pkg.batteries[0];
  items.push({
    description: `${batt.brand} ${batt.capacityAh}Ah ${batt.voltageV}V ${batt.type.toUpperCase()} Battery`,
    quantity: batt.quantity,
    unitPrice: batteryTotal / batt.quantity,
    total: batteryTotal,
    category: "hardware",
  });

  const panel = pkg.panels[0];
  items.push({
    description: `${panel.brand} ${panel.watts}W ${panel.type} Solar Panel`,
    quantity: panel.quantity,
    unitPrice: panelTotal / panel.quantity,
    total: panelTotal,
    category: "hardware",
  });

  items.push({
    description: "Professional Installation & Balance of System (Cables, Mounts, Breakers)",
    quantity: 1,
    unitPrice: pkg.installationFee,
    total: pkg.installationFee,
    category: "installation",
  });

  return items;
}

// ─── Step 4: Assemble Final Quote ─────────────────────────────

export function buildQuoteResult(
  extraction: AIExtractionResult,
  location: string = "Lagos"
): QuoteResult {
  const profile = computeLoadProfile(extraction, location);

  // Inject Yohako Scam Warning if mentioned
  const allText = JSON.stringify(extraction.appliances).toLowerCase();
  if (allText.includes("yohako") || allText.includes("yako")) {
    extraction.warnings.push("CRITICAL WARNING: Yohako batteries have been widely reported as counterfeit (sand-weighted) in Nigeria. Avoid them for your safety.");
  }

  // 1. DECLARE THE PACKAGE FIRST
  const pkg = selectPackage(profile, extraction.warnings);

  // 2. NOW CHECK IF IT IS AN ECOFLOW
  // Inject EcoFlow X-Boost Warning for heating/smart appliances
  if (pkg.slug.includes("ecoflow-river-2") && profile.surgeLoad > 800) {
    extraction.warnings.push("ECOFLOW X-BOOST WARNING: This unit drops voltage to handle loads above 800W. It is safe for basic kettles and irons, but DO NOT use it on digital/smart appliances (like digital microwaves or smart fridges) as the low voltage can damage their motherboards.");
  }

  const lineItems = buildLineItems(pkg);

  const totalPriceNGN = pkg.basePrice + pkg.installationFee;
  // Monthly payment with finance charge (approximate 3% monthly rate over 36 months)
  const r = 0.03;
  const n = 36;
  const monthlyPaymentOption = Math.ceil((totalPriceNGN * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));

  const installers = pkg.installationFee > 0
    ? getInstallersByLocation(location, 3)
    : [];

  return {
    success: true,
    requestId: `P24-${nanoid(8).toUpperCase()}`,
    generatedAt: new Date().toISOString(),
    appliances: extraction.appliances,
    loadProfile: profile,
    selectedPackage: pkg,
    lineItems,
    totalPriceNGN,
    monthlyPaymentOption,
    warnings: extraction.warnings,
    confidenceScore: extraction.confidenceScore,
    recommendedInstallers: installers,
  };
}
