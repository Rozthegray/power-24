// ============================================================
// lib/data/packages.ts
// The four commercial tiers Power 24 sells. Prices are in NGN
// and reflect mid-2024 Nigerian solar market rates.
// ============================================================

import type { SolarPackage } from "@/lib/types";

export const SOLAR_PACKAGES: SolarPackage[] = [
  // ─── TIER 1: Sapa Lite ────────────────────────────────────
  {
    slug: "sapa-lite",
    name: "Sapa Lite",
    tagline: "End NEPA wahala. Power your essentials 24/7.",
    maxContinuousWatts: 1_500,
    maxSurgeWatts: 3_000,
    inverter: {
      brand: "Felicity Solar",
      model: "FL-2KVA-24",
      kva: 2,
      type: "hybrid",
      efficiency: 93,
    },
    batteries: [
      {
        brand: "Felicity Solar",
        model: "FE-12V-200AH",
        type: "gel",
        voltageV: 12,
        capacityAh: 200,
        quantity: 2, // series for 24V
        cycleLife: 800,
      },
    ],
    panels: [
      {
        brand: "Jinko Solar",
        model: "JKM330M-60HL4",
        watts: 330,
        type: "monocrystalline",
        quantity: 3,
      },
    ],
    basePrice: 680_000,
    installationFee: 85_000,
    warrantyYears: 2,
    includes: [
      "2KVA Hybrid Inverter Charger",
      "2 × 200Ah 12V Gel Deep Cycle Batteries (24V system)",
      "3 × 330W Monocrystalline Solar Panels",
      "DC Isolator & Combiner Box",
      "4mm² & 6mm² PV Cables",
      "Manual Transfer Switch",
      "Professional Installation by NAESCO-certified technician",
      "1-year system monitoring via mobile app",
    ],
  },

  // ─── TIER 2: Hustler+ ─────────────────────────────────────
  {
    slug: "hustler-plus",
    name: "Hustler+",
    tagline: "Run your fridge, fans, TVs and more. All day, every day.",
    maxContinuousWatts: 3_500,
    maxSurgeWatts: 7_000,
    inverter: {
      brand: "Schneider Electric",
      model: "XW+ 5548",
      kva: 5,
      type: "hybrid",
      efficiency: 95,
    },
    batteries: [
      {
        brand: "CATL",
        model: "LiFePO4-100Ah-48V",
        type: "lithium",
        voltageV: 48,
        capacityAh: 100,
        quantity: 2,
        cycleLife: 3_500,
      },
    ],
    panels: [
      {
        brand: "Jinko Solar",
        model: "JKM400M-54HL4",
        watts: 400,
        type: "monocrystalline",
        quantity: 5,
      },
    ],
    basePrice: 1_680_000,
    installationFee: 150_000,
    warrantyYears: 3,
    includes: [
      "5KVA Hybrid Inverter Charger",
      "2 × 100Ah LiFePO4 48V Lithium Batteries",
      "5 × 400W Monocrystalline Solar Panels",
      "48V Battery Management System (BMS)",
      "DC Isolator, SPD & Combiner Box",
      "10mm² PV Cables",
      "Automatic Transfer Switch (ATS)",
      "Power 24 Mobile Monitoring App (3 years)",
      "Professional Installation by NAESCO-certified technician",
      "Annual preventive maintenance visit (Year 1)",
    ],
  },

  // ─── TIER 3: Odogwu Premium ───────────────────────────────
  {
    slug: "odogwu-premium",
    name: "Odogwu Premium",
    tagline: "One AC. Full house. Zero compromise.",
    maxContinuousWatts: 7_000,
    maxSurgeWatts: 13_000,
    inverter: {
      brand: "Victron Energy",
      model: "MultiPlus-II 48/10000",
      kva: 10,
      type: "hybrid",
      efficiency: 96,
    },
    batteries: [
      {
        brand: "Pylontech",
        model: "US5000 48V 74Ah",
        type: "lithium",
        voltageV: 48,
        capacityAh: 148, // 2 × 74Ah parallel
        quantity: 2,
        cycleLife: 6_000,
      },
    ],
    panels: [
      {
        brand: "Canadian Solar",
        model: "CS6R-410MS",
        watts: 410,
        type: "monocrystalline",
        quantity: 9,
      },
    ],
    basePrice: 3_750_000,
    installationFee: 280_000,
    warrantyYears: 5,
    includes: [
      "10KVA Victron MultiPlus-II Hybrid Inverter",
      "2 × Pylontech US5000 LiFePO4 Battery Stacks (148Ah@48V)",
      "9 × 410W Canadian Solar Monocrystalline Panels",
      "Victron Color Control GX Monitoring System",
      "Full DC & AC Protection: SPD, RCCB, MCBs",
      "16mm² PV Cables & Armoured AC Cable",
      "Generator Auto-Start Interface",
      "Power 24 Pro App (5 years) + Remote Diagnostics",
      "5-year inverter warranty / 2-year battery warranty",
      "2 × Annual preventive maintenance visits",
      "Priority 24/7 support hotline",
    ],
  },

  // ─── TIER 4: Oga Boss ─────────────────────────────────────
  {
    slug: "oga-boss",
    name: "Oga Boss",
    tagline: "Total energy independence. No generator. No excuses.",
    maxContinuousWatts: 15_000,
    maxSurgeWatts: 28_000,
    inverter: {
      brand: "Victron Energy",
      model: "Quattro 48/15000",
      kva: 15,
      type: "hybrid",
      efficiency: 96,
    },
    batteries: [
      {
        brand: "Pylontech",
        model: "US5000 48V 74Ah",
        type: "lithium",
        voltageV: 48,
        capacityAh: 296, // 4 × 74Ah parallel
        quantity: 4,
        cycleLife: 6_000,
      },
    ],
    panels: [
      {
        brand: "Canadian Solar",
        model: "CS6R-415MS",
        watts: 415,
        type: "monocrystalline",
        quantity: 16,
      },
    ],
    basePrice: 7_200_000,
    installationFee: 480_000,
    warrantyYears: 7,
    includes: [
      "15KVA Victron Quattro Hybrid Inverter",
      "4 × Pylontech US5000 LiFePO4 Battery Stacks (296Ah@48V)",
      "16 × 415W Canadian Solar Monocrystalline Panels",
      "Victron Cerbo GX + Touch 50 Display",
      "Full Electrical BOS: SPD, RCCB, MCBs, Fused DC Bus",
      "25mm² PV Cables & Full Armoured Wiring",
      "Generator Auto-Start with ATS",
      "Power 24 Enterprise Dashboard (7 years)",
      "7-year inverter warranty / 5-year battery warranty",
      "Quarterly preventive maintenance (Year 1 & 2)",
      "Dedicated account manager + 24/7 priority support",
      "Post-installation NAESCO compliance certificate",
    ],
  },
];

// ─── Helper: find package by slug ────────────────────────────
export function getPackageBySlug(slug: string): SolarPackage | undefined {
  return SOLAR_PACKAGES.find((p) => p.slug === slug);
}

// ─── Helper: get all packages sorted by price ────────────────
export function getPackagesSortedByPrice(): SolarPackage[] {
  return [...SOLAR_PACKAGES].sort((a, b) => a.basePrice - b.basePrice);
}
