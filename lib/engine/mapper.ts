// ============================================================
// lib/engine/mapper.ts
// ─── THE SECRET SAUCE ────────────────────────────────────────
// Takes raw AI extraction, applies Nigerian solar engineering
// rules, and returns the optimal package + line-item pricing.
//
// Pipeline:
//   AIExtractionResult
//     → computeLoadProfile()     (physics: watts → kWh → sizing)
//     → selectPackage()          (tier matching with headroom)
//     → buildLineItems()         (transparent pricing breakdown)
//     → buildQuoteResult()       (final response shape)
// ============================================================

import type {
  AIExtractionResult,
  LoadProfile,
  SolarPackage,
  LineItem,
  QuoteResult,
  QuoteRequest,
} from "@/lib/types";
import { SOLAR_PACKAGES } from "@/lib/data/packages";
import { getInstallersByLocation } from "@/lib/data/installers";
import { nanoid } from "nanoid";

// ─── Constants ───────────────────────────────────────────────

/** Safety buffer added on top of raw energy demand. 30% is industry standard. */
const SAFETY_BUFFER_FACTOR = 1.30;

/**
 * System loss factor: accounts for inverter inefficiency (~5%),
 * cable losses (~3%), battery charging losses (~5%), temperature
 * derating (~4%). Total ~17% → we use 0.80 (80% round-trip efficiency).
 */
const SYSTEM_EFFICIENCY = 0.80;

/**
 * Peak sun hours for Nigeria.
 * Varies by region: Lagos 4.8, Abuja 5.8, Kano 6.5, PH 4.5.
 * We use 5.2 as a conservative national average.
 */
const DEFAULT_PEAK_SUN_HOURS = 5.2;

const LOCATION_PEAK_SUN: Record<string, number> = {
  lagos: 4.8,
  abuja: 5.8,
  kano: 6.5,
  "port harcourt": 4.5,
  ph: 4.5,
  ibadan: 5.0,
  warri: 4.7,
  enugu: 5.1,
  benin: 4.9,
  kaduna: 5.6,
  jos: 5.9,
  maiduguri: 6.8,
  sokoto: 7.0,
};

/**
 * Battery DoD (Depth of Discharge) — how much of battery
 * capacity is usable. Lithium = 80%, Lead-acid/Gel = 50%.
 * We assume lithium-forward design at this stage.
 */
const BATTERY_DOD = 0.80;

/** Target battery autonomy hours (8h = overnight backup) */
const AUTONOMY_HOURS = 8;

/** System voltage — all packages use 48V for efficiency */
const SYSTEM_VOLTAGE = 48;

/** Monthly payment duration for financing option */
const FINANCE_MONTHS = 36;
const FINANCE_MONTHLY_RATE = 0.03; // 3% per month (approximate NGN lending rate)

// ─── Step 1: Compute Load Profile ────────────────────────────

export function computeLoadProfile(
  extraction: AIExtractionResult,
  location?: string
): LoadProfile {
  const peakSunHours = getPeakSunHours(location);

  // Buffered energy demand
  const bufferedEnergyWh =
    extraction.estimatedDailyWattHours * SAFETY_BUFFER_FACTOR;

  // Panels must generate enough to cover daily demand + system losses
  const requiredPanelWatts = Math.ceil(
    bufferedEnergyWh / (peakSunHours * SYSTEM_EFFICIENCY)
  );

  // Battery bank: cover AUTONOMY_HOURS of continuous load
  // Capacity (Ah) = Energy (Wh) / Voltage (V) / DoD
  const autonomyEnergyWh =
    extraction.totalContinuousWatts * AUTONOMY_HOURS * SAFETY_BUFFER_FACTOR;
  const requiredBatteryAh = Math.ceil(
    autonomyEnergyWh / (SYSTEM_VOLTAGE * BATTERY_DOD)
  );

  // Inverter sizing: must handle worst-case surge with 20% headroom
  const requiredInverterKva =
    Math.ceil((extraction.totalSurgeWatts * 1.2) / 100) / 10; // round up to 0.1 kVA

  return {
    continuousLoad: extraction.totalContinuousWatts,
    surgeLoad: extraction.totalSurgeWatts,
    dailyEnergyWh: extraction.estimatedDailyWattHours,
    bufferedEnergyWh,
    peakSunHours,
    requiredPanelWatts,
    requiredBatteryAh,
    requiredInverterKva,
  };
}

// ─── Step 2: Select Package ───────────────────────────────────

export function selectPackage(profile: LoadProfile): SolarPackage {
  // Sort packages from smallest to largest
  const sorted = [...SOLAR_PACKAGES].sort(
    (a, b) => a.maxContinuousWatts - b.maxContinuousWatts
  );

  for (const pkg of sorted) {
    const inverterCapacityWatts = pkg.inverter.kva * 1_000 * 0.8; // 80% rated output

    // Check 1: Continuous load fits within 80% of inverter rated output
    const continuousFits = profile.continuousLoad <= inverterCapacityWatts;

    // Check 2: Surge load fits within inverter peak rating (kva × 1000)
    const surgeFits = profile.surgeLoad <= pkg.maxSurgeWatts;

    // Check 3: Panel capacity covers required generation
    const totalPanelWatts = pkg.panels.reduce(
      (sum, p) => sum + p.watts * p.quantity,
      0
    );
    const panelsFit = totalPanelWatts >= profile.requiredPanelWatts * 0.85; // 15% tolerance

    // Check 4: Battery capacity covers autonomy requirement
    const totalBatteryAh = pkg.batteries.reduce((sum, b) => {
      // Handle series/parallel configurations:
      // If batteries are 12V in series → capacity stays same but voltage adds
      // If batteries are same voltage in parallel → capacity adds
      const systemAh =
        b.voltageV >= 48
          ? b.capacityAh * b.quantity // parallel 48V packs
          : b.capacityAh; // series 12V packs at same Ah
      return sum + systemAh;
    }, 0);
    const batteryFits = totalBatteryAh >= profile.requiredBatteryAh * 0.80; // 20% tolerance

    if (continuousFits && surgeFits && panelsFit && batteryFits) {
      return pkg;
    }
  }

  // If nothing fits, return the largest package
  return sorted[sorted.length - 1];
}

// ─── Step 3: Build Line Items ─────────────────────────────────

export function buildLineItems(pkg: SolarPackage): LineItem[] {
  const items: LineItem[] = [];

  // Inverter
  items.push({
    description: `${pkg.inverter.brand} ${pkg.inverter.model} ${pkg.inverter.kva}KVA Hybrid Inverter`,
    quantity: 1,
    unitPrice: getInverterPrice(pkg.inverter.kva),
    total: getInverterPrice(pkg.inverter.kva),
    category: "hardware",
  });

  // Batteries
  for (const battery of pkg.batteries) {
    const unitPrice = getBatteryPrice(battery.type, battery.capacityAh, battery.voltageV);
    items.push({
      description: `${battery.brand} ${battery.model} ${battery.capacityAh}Ah ${battery.voltageV}V ${battery.type} Battery`,
      quantity: battery.quantity,
      unitPrice,
      total: unitPrice * battery.quantity,
      category: "hardware",
    });
  }

  // Solar panels
  for (const panel of pkg.panels) {
    const unitPrice = getPanelPrice(panel.watts);
    items.push({
      description: `${panel.brand} ${panel.watts}W ${panel.type} Solar Panel`,
      quantity: panel.quantity,
      unitPrice,
      total: unitPrice * panel.quantity,
      category: "hardware",
    });
  }

  // Balance of System (BOS): cables, combiner, isolators
  const bosPrice = Math.round(pkg.basePrice * 0.08); // ~8% of base
  items.push({
    description: "Balance of System (BOS): DC/AC Cables, Combiner Box, SPD, MCBs",
    quantity: 1,
    unitPrice: bosPrice,
    total: bosPrice,
    category: "hardware",
  });

  // Monitoring system
  const monitoringPrice = pkg.slug === "oga-boss" || pkg.slug === "odogwu-premium"
    ? 85_000
    : 35_000;
  items.push({
    description: "Remote Monitoring System + Power 24 App (Annual Subscription)",
    quantity: pkg.warrantyYears,
    unitPrice: monitoringPrice / pkg.warrantyYears,
    total: monitoringPrice,
    category: "misc",
  });

  // Installation
  items.push({
    description: "Professional Installation by NAESCO-Certified Technician",
    quantity: 1,
    unitPrice: pkg.installationFee,
    total: pkg.installationFee,
    category: "installation",
  });

  // Warranty & support
  const supportPrice = Math.round(pkg.installationFee * 0.25);
  items.push({
    description: `${pkg.warrantyYears}-Year System Warranty & Preventive Maintenance`,
    quantity: 1,
    unitPrice: supportPrice,
    total: supportPrice,
    category: "warranty",
  });

  return items;
}

// ─── Step 4: Assemble Final Quote ─────────────────────────────

export function buildQuoteResult(
  request: QuoteRequest,
  extraction: AIExtractionResult,
  profile: LoadProfile,
  pkg: SolarPackage
): QuoteResult {
  const lineItems = buildLineItems(pkg);
  const totalPriceNGN = lineItems.reduce((sum, item) => sum + item.total, 0);

  // Monthly payment with finance charge
  const monthlyPayment = Math.ceil(
    (totalPriceNGN *
      FINANCE_MONTHLY_RATE *
      Math.pow(1 + FINANCE_MONTHLY_RATE, FINANCE_MONTHS)) /
      (Math.pow(1 + FINANCE_MONTHLY_RATE, FINANCE_MONTHS) - 1)
  );

  return {
    success: true,
    requestId: `P24-${nanoid(8).toUpperCase()}`,
    generatedAt: new Date().toISOString(),
    appliances: extraction.appliances,
    loadProfile: profile,
    selectedPackage: pkg,
    lineItems,
    totalPriceNGN,
    monthlyPaymentOption: monthlyPayment,
    warnings: extraction.warnings,
    confidenceScore: extraction.confidenceScore,
    recommendedInstallers: getInstallersByLocation(request.location, 3),
  };
}

// ─── Utility: Peak sun hours lookup ──────────────────────────

function getPeakSunHours(location?: string): number {
  if (!location) return DEFAULT_PEAK_SUN_HOURS;
  const loc = location.toLowerCase().trim();
  return LOCATION_PEAK_SUN[loc] ?? DEFAULT_PEAK_SUN_HOURS;
}

// ─── Utility: Unit pricing lookups ───────────────────────────
// These are approximate mid-2024 NGN market prices.
// In production, drive these from a CMS or pricing database.

function getInverterPrice(kva: number): number {
  const INVERTER_PRICES: Record<number, number> = {
    2: 185_000,
    3: 275_000,
    5: 480_000,
    10: 950_000,
    15: 1_650_000,
  };
  // Find closest kva tier
  const keys = Object.keys(INVERTER_PRICES).map(Number).sort((a, b) => a - b);
  for (const key of keys) {
    if (kva <= key) return INVERTER_PRICES[key];
  }
  return INVERTER_PRICES[keys[keys.length - 1]];
}

function getBatteryPrice(
  type: "lithium" | "lead-acid" | "gel",
  capacityAh: number,
  voltageV: number
): number {
  if (type === "lithium") {
    // LiFePO4: ~₦7,500 per Ah at 48V
    return capacityAh * voltageV * 7.5;
  } else if (type === "gel") {
    // Gel deep cycle: ~₦800 per Ah at 12V
    return capacityAh * 12 * 3.5;
  } else {
    // Lead acid: ~₦600 per Ah at 12V
    return capacityAh * 12 * 2.8;
  }
}

function getPanelPrice(watts: number): number {
  // ~₦550 per watt for quality monocrystalline in Nigeria (2024)
  return Math.round(watts * 550);
}
