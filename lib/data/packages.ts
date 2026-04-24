// ============================================================
// lib/data/packages.ts  v2.1
// The Ultimate Power 24 Hardware Database
//
// v2.1 changes:
//   • REAL MARKET PRICING SCRAPE: Adjusted all base prices to reflect
//     current Nigerian market realities (Panels ~₦220/W, Lithium ~₦200/Wh).
//   • ECOFLOW FIX: River 2 Max now explicitly ₦450k with 110W panel included.
//     River 2 is ₦270k without panel.
//   • PYLONTECH FIX: US5000 is mathematically 48V 100Ah (4.8kWh), not 148Ah.
//     Corrected the capacityAh across Odogwu and Oga Boss to prevent
//     phantom storage calculations.
// ============================================================

import type { SolarPackage } from "@/lib/types";

export const SOLAR_PACKAGES: SolarPackage[] = [
  // ─── ULTRA-LIGHT PORTABLE ──────────────────────────────────
  {
    slug: "lumos-l1",
    name: "Lumos L1 Smart Solar",
    tagline: "Perfect for a single TV, DSTV, and phones.",
    maxContinuousWatts: 200,
    maxSurgeWatts: 400,
    inverter: { brand: "Lumos", model: "L1", kva: 0.2, type: "off-grid", efficiency: 90 },
    batteries: [{
      brand: "Lumos", model: "Internal", type: "lithium",
      voltageV: 12, capacityAh: 20, quantity: 1, cycleLife: 1000,
      wiring: "parallel", 
    }],
    panels: [{ brand: "Lumos", model: "Portable", watts: 80, type: "monocrystalline", quantity: 1 }],
    basePrice: 150_000,
    installationFee: 0,
    warrantyYears: 1,
    includes: [
      "200W Output Hub",
      "240Wh Built-in Lithium Battery",
      "80W Portable Solar Panel",
      "Plug & Play Setup (No Installation Required)",
    ],
  },

  // ─── PREMIUM PORTABLES (ECOFLOW) ────────────────────────────
  {
    slug: "ecoflow-river-2",
    name: "EcoFlow RIVER 2",
    tagline: "Ultra-fast charging for laptops, WiFi, and entertainment.",
    maxContinuousWatts: 300,
    maxSurgeWatts: 600,
    inverter: { brand: "EcoFlow", model: "RIVER 2", kva: 0.3, type: "off-grid", efficiency: 92 },
    batteries: [{
      brand: "EcoFlow", model: "LiFePO4", type: "lithium",
      voltageV: 12, capacityAh: 21.3, quantity: 1, cycleLife: 3000,
      wiring: "parallel",
    }],
    panels: [{ brand: "EcoFlow", model: "Portable", watts: 110, type: "monocrystalline", quantity: 0 }],
    basePrice: 270_000, // Real market value without panel
    installationFee: 0,
    warrantyYears: 5,
    includes: [
      "300W Output (X-Boost to 600W)",
      "256Wh LiFePO4 Battery (3000 Cycles)",
      "0-100% Charge in 60 Minutes",
      "EcoFlow App Control",
    ],
  },
  {
    slug: "ecoflow-river-2-max",
    name: "EcoFlow RIVER 2 Max",
    tagline: "The sweet spot for remote workers and gamers (PS5 + TV).",
    maxContinuousWatts: 500,
    maxSurgeWatts: 1000,
    inverter: { brand: "EcoFlow", model: "RIVER 2 Max", kva: 0.5, type: "off-grid", efficiency: 92 },
    batteries: [{
      brand: "EcoFlow", model: "LiFePO4", type: "lithium",
      voltageV: 12, capacityAh: 42.6, quantity: 1, cycleLife: 3000,
      wiring: "parallel",
    }],
    panels: [{ brand: "EcoFlow", model: "Portable", watts: 110, type: "monocrystalline", quantity: 1 }], // Adjusted to include 1 panel
    basePrice: 450_000, // Real market value WITH 110W panel included
    installationFee: 0,
    warrantyYears: 5,
    includes: [
      "500W Output (X-Boost to 1000W)",
      "512Wh LiFePO4 Battery",
      "110W Portable Solar Panel",
      "Multiple AC & USB-C Fast Charge Ports",
      "Plug & Play Setup",
    ],
  },
  {
    slug: "ecoflow-river-2-pro",
    name: "EcoFlow RIVER 2 Pro",
    tagline: "High-end portable power. Runs blenders, TVs, and desktops.",
    maxContinuousWatts: 800,
    maxSurgeWatts: 1600,
    inverter: { brand: "EcoFlow", model: "RIVER 2 Pro", kva: 0.8, type: "off-grid", efficiency: 92 },
    batteries: [{
      brand: "EcoFlow", model: "LiFePO4", type: "lithium",
      voltageV: 12, capacityAh: 64, quantity: 1, cycleLife: 3000,
      wiring: "parallel",
    }],
    panels: [{ brand: "EcoFlow", model: "Portable", watts: 220, type: "monocrystalline", quantity: 0 }],
    basePrice: 650_000,
    installationFee: 0,
    warrantyYears: 5,
    includes: [
      "800W Output (X-Boost to 1600W)",
      "768Wh High-Capacity LiFePO4 Battery",
      "Can power 80% of essential home appliances",
      "Zero Installation Required",
    ],
  },

  // ─── ENTRY LEVEL PERMANENT HYBRID ───────────────────────────
  {
    slug: "basic-home-1kva",
    name: "Basic Home 1KVA",
    tagline: "Permanent sine-wave setup for lighting, fans, and TV.",
    maxContinuousWatts: 800,
    maxSurgeWatts: 2000,
    inverter: { brand: "Techfine", model: "Hybrid", kva: 1, type: "hybrid", efficiency: 85 },
    batteries: [{
      brand: "Tubular", model: "Deep Cycle",
      type: "tubular",
      voltageV: 12, capacityAh: 100, quantity: 1, cycleLife: 600,
      wiring: "parallel", 
    }],
    panels: [{ brand: "Generic", model: "Mono", watts: 150, type: "monocrystalline", quantity: 2 }],
    basePrice: 440_000, 
    installationFee: 65_000,
    warrantyYears: 1,
    includes: [
      "1KVA Pure Sine Wave Inverter",
      "100Ah Tubular Deep Cycle Battery",
      "300W Solar Array",
      "Professional Installation",
    ],
  },

  // ─── TIER 1: Sapa Lite (2KVA) ────────────────────────────────
  {
    slug: "sapa-lite",
    name: "Sapa Lite (2KVA)",
    tagline: "End NEPA wahala. Power your essentials 24/7.",
    maxContinuousWatts: 1_500,
    maxSurgeWatts: 3_000,
    inverter: { brand: "Felicity Solar", model: "FL-2KVA-24", kva: 2, type: "hybrid", efficiency: 93 },
    batteries: [{
      brand: "Felicity Solar", model: "FE-12V-200AH", type: "gel",
      voltageV: 12, capacityAh: 200, quantity: 2, cycleLife: 800,
      wiring: "series",
    }],
    panels: [{ brand: "Jinko Solar", model: "JKM330M", watts: 330, type: "monocrystalline", quantity: 3 }],
    basePrice: 1_080_000, // Adjusted to match real hardware costs
    installationFee: 85_000,
    warrantyYears: 2,
    includes: [
      "2KVA Hybrid Inverter Charger",
      "2 × 200Ah 12V Gel Deep Cycle Batteries (24V system, series-wired)",
      "3 × 330W Monocrystalline Solar Panels",
      "Professional Installation & BOS",
    ],
  },

  // ─── TIER 2: Hustler+ (5KVA) ─────────────────────────────────
  {
    slug: "hustler-plus",
    name: "Hustler+ (5KVA)",
    tagline: "Run your fridge, fans, TVs and more. All day, every day.",
    maxContinuousWatts: 3_500,
    maxSurgeWatts: 7_000,
    inverter: { brand: "Schneider Electric", model: "XW+ 5548", kva: 5, type: "hybrid", efficiency: 95 },
    batteries: [{
      brand: "CATL", model: "LiFePO4-48V", type: "lithium",
      voltageV: 48, capacityAh: 100, quantity: 2, cycleLife: 3_500,
      wiring: "parallel",
    }],
    panels: [{ brand: "Jinko Solar", model: "JKM400M", watts: 400, type: "monocrystalline", quantity: 5 }],
    basePrice: 2_950_000, // Adjusted to current Lithium & 5KVA Inverter pricing
    installationFee: 150_000,
    warrantyYears: 3,
    includes: [
      "5KVA Hybrid Inverter Charger",
      "2 × 100Ah LiFePO4 48V Lithium Batteries (parallel, 9.6 kWh gross)",
      "5 × 400W Monocrystalline Solar Panels",
      "Professional Installation & BOS",
    ],
  },

  // ─── TIER 3: Odogwu Premium (10KVA) ──────────────────────────
  {
    slug: "odogwu-premium",
    name: "Odogwu Premium (10KVA)",
    tagline: "One AC. Full house. Zero compromise.",
    maxContinuousWatts: 7_000,
    maxSurgeWatts: 13_000,
    inverter: { brand: "Victron Energy", model: "MultiPlus-II", kva: 10, type: "hybrid", efficiency: 96 },
    batteries: [{
      brand: "Pylontech", model: "US5000", type: "lithium",
      voltageV: 48, capacityAh: 100, quantity: 2, cycleLife: 6_000, // CORRECTED Ah from 148 to 100 (Real US5000 spec)
      wiring: "parallel",
    }],
    panels: [{ brand: "Canadian Solar", model: "CS6R", watts: 410, type: "monocrystalline", quantity: 9 }],
    basePrice: 4_850_000, // Adjusted for 2x US5000 + 10KVA Victron
    installationFee: 280_000,
    warrantyYears: 5,
    includes: [
      "10KVA Victron Hybrid Inverter",
      "2 × Pylontech US5000 LiFePO4 (48V/100Ah, parallel, 9.6 kWh gross)", // Corrected text
      "9 × 410W Canadian Solar Panels",
      "Victron Color Control GX Monitoring",
      "Professional Installation & BOS",
    ],
  },

  // ─── TIER 4: Oga Boss (15KVA) ────────────────────────────────
  {
    slug: "oga-boss",
    name: "Oga Boss (15KVA)",
    tagline: "Total energy independence. No generator. No excuses.",
    maxContinuousWatts: 15_000,
    maxSurgeWatts: 28_000,
    inverter: { brand: "Victron Energy", model: "Quattro", kva: 15, type: "hybrid", efficiency: 96 },
    batteries: [{
      brand: "Pylontech", model: "US5000", type: "lithium",
      voltageV: 48, capacityAh: 100, quantity: 4, cycleLife: 6_000, // CORRECTED Ah
      wiring: "parallel",
    }],
    panels: [{ brand: "Canadian Solar", model: "CS6R", watts: 415, type: "monocrystalline", quantity: 16 }],
    basePrice: 8_800_000, // Adjusted for 4x US5000 + 15KVA Victron
    installationFee: 480_000,
    warrantyYears: 7,
    includes: [
      "15KVA Victron Quattro Hybrid Inverter",
      "4 × Pylontech US5000 LiFePO4 (48V/100Ah, parallel, 19.2 kWh gross)", // Corrected text
      "16 × 415W Canadian Solar Panels",
      "Generator Auto-Start with ATS",
      "Professional Installation & BOS",
    ],
  },
];

export function getPackageBySlug(slug: string): SolarPackage | undefined {
  return SOLAR_PACKAGES.find(p => p.slug === slug);
}

export function getPackagesSortedByPrice(): SolarPackage[] {
  return [...SOLAR_PACKAGES].sort((a, b) => a.basePrice - b.basePrice);
}
