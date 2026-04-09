// ============================================================
// lib/data/packages.ts
// The Expanded Power 24 Tiers (Micro-Portables to Industrial)
// Includes Lumos, EcoFlow, itel, Luminous, Felicity, PRAG, Deye, Victron
// ============================================================
import { SolarPackage } from "@/lib/types";

export const SOLAR_PACKAGES: SolarPackage[] = [
  // ─── PORTABLE / MICRO-GRID TIERS (NO INSTALLATION FEE) ────────
  {
    slug: "lumos-eco",
    name: "Lumos Eco",
    tagline: "Ultra-basic plug-and-play for phones, decoders, and LED lights.",
    maxContinuousWatts: 80,
    maxSurgeWatts: 100,
    inverter: { brand: "Lumos", model: "Eco Base", kva: 0.1, type: "off-grid", efficiency: 90 },
    batteries: [{ brand: "Lumos", model: "Integrated", type: "lithium", capacityAh: 16, voltageV: 12, quantity: 1, cycleLife: 2000 }],
    panels: [{ brand: "Lumos", type: "monocrystalline", watts: 80, quantity: 1 }],
    basePrice: 95000,
    installationFee: 0,
    warrantyYears: 3,
    includes: ["200Wh Indoor Battery", "80W Solar Panel", "PAYG Subscription Enabled"]
  },
  {
    slug: "lumos-prime",
    name: "Lumos Prime / LT",
    tagline: "Handles a standard TV, decoder, and laptop charging.",
    maxContinuousWatts: 160,
    maxSurgeWatts: 200,
    inverter: { brand: "Lumos", model: "Prime", kva: 0.2, type: "off-grid", efficiency: 90 },
    batteries: [{ brand: "Lumos", model: "Integrated", type: "lithium", capacityAh: 27, voltageV: 12, quantity: 1, cycleLife: 2000 }],
    panels: [{ brand: "Lumos", type: "monocrystalline", watts: 160, quantity: 1 }],
    basePrice: 150000,
    installationFee: 0,
    warrantyYears: 3,
    includes: ["330Wh Indoor Battery Unit", "160W Solar Panel", "PAYG Setup"]
  },
  {
    slug: "ecoflow-river-2-max",
    name: "EcoFlow RIVER 2 Max",
    tagline: "Compact, rapid-charging powerhouse for premium setups.",
    maxContinuousWatts: 500,
    maxSurgeWatts: 1000,
    inverter: { brand: "EcoFlow", model: "River 2 Max", kva: 0.5, type: "off-grid", efficiency: 95 },
    batteries: [{ brand: "EcoFlow", model: "Internal LFP", type: "lithium", capacityAh: 40, voltageV: 12.8, quantity: 1, cycleLife: 3000 }],
    panels: [{ brand: "EcoFlow", type: "monocrystalline", watts: 160, quantity: 1 }],
    basePrice: 425500,
    installationFee: 0,
    warrantyYears: 5,
    includes: ["512Wh LFP Power Station", "160W Portable Panel", "60-Min Fast Charge"]
  },
  {
    slug: "itel-power-tank",
    name: "itel Power Tank 1000",
    tagline: "Silent 1kWh backup for remote workers and light entertainment.",
    maxContinuousWatts: 500,
    maxSurgeWatts: 600,
    inverter: { brand: "itel", model: "IESS-05K10N", kva: 0.5, type: "off-grid", efficiency: 95 },
    batteries: [{ brand: "itel", model: "Integrated LFP", type: "lithium", capacityAh: 40, voltageV: 25.6, quantity: 1, cycleLife: 6000 }],
    panels: [{ brand: "Generic", type: "monocrystalline", watts: 250, quantity: 1 }],
    basePrice: 380000,
    installationFee: 0,
    warrantyYears: 2,
    includes: ["1000Wh Portable Power Station", "250W Portable Panel", "20ms UPS Switchover"]
  },
  {
    slug: "ecoflow-delta-2",
    name: "EcoFlow DELTA 2",
    tagline: "Premium portable generator. Can start a chest freezer.",
    maxContinuousWatts: 1800,
    maxSurgeWatts: 2700,
    inverter: { brand: "EcoFlow", model: "Delta 2", kva: 1.8, type: "off-grid", efficiency: 96 },
    batteries: [{ brand: "EcoFlow", model: "Internal LFP", type: "lithium", capacityAh: 40, voltageV: 25.6, quantity: 1, cycleLife: 3000 }],
    panels: [{ brand: "EcoFlow", type: "monocrystalline", watts: 400, quantity: 1 }],
    basePrice: 1057000,
    installationFee: 0,
    warrantyYears: 5,
    includes: ["1024Wh Premium Power Station", "400W Foldable Panel", "Smartphone App"]
  },

  // ─── PERMANENT HYBRID TIERS (REQUIRES INSTALLATION) ───────────
  {
    slug: "luminous-standard",
    name: "Luminous Basic Backup",
    tagline: "Trusted Indian engineering for everyday home backup.",
    maxContinuousWatts: 2800,
    maxSurgeWatts: 4500,
    inverter: { brand: "Luminous", model: "Cruze+", kva: 3.5, type: "hybrid", efficiency: 82 },
    batteries: [{ brand: "Luminous", model: "Tubular", type: "lead-acid", capacityAh: 220, voltageV: 12, quantity: 4, cycleLife: 1000 }],
    panels: [{ brand: "Jinko", type: "monocrystalline", watts: 400, quantity: 4 }],
    basePrice: 1250000,
    installationFee: 120000,
    warrantyYears: 1,
    includes: ["3.5KVA Luminous Inverter", "4x 220Ah Tubular Batteries", "Roof Mounts & Wiring"]
  },
  {
    slug: "hustler-plus-felicity",
    name: "Felicity Hustler+",
    tagline: "The Nigerian favorite. Lithium-powered resilience for standard homes.",
    maxContinuousWatts: 4000, // Accounted for 0.8 PF of 5KVA
    maxSurgeWatts: 7500,
    inverter: { brand: "Felicity", model: "FL-IV", kva: 5, type: "hybrid", efficiency: 85 },
    batteries: [{ brand: "Felicity", model: "LFP Wall", type: "lithium", capacityAh: 100, voltageV: 48, quantity: 1, cycleLife: 6000 }],
    panels: [{ brand: "Canadian Solar", type: "monocrystalline", watts: 450, quantity: 6 }],
    basePrice: 1680000,
    installationFee: 150000,
    warrantyYears: 5,
    includes: ["5KVA Felicity Hybrid Inverter", "5.12kWh Lithium Battery", "BMS Integration"]
  },
  {
    slug: "prag-heavy-duty",
    name: "PRAG Heavy-Duty",
    tagline: "Built to withstand brutal surges and heavy pumping loads.",
    maxContinuousWatts: 5000, 
    maxSurgeWatts: 12000,
    inverter: { brand: "PRAG", model: "Heavy Duty Hybrid", kva: 6.3, type: "hybrid", efficiency: 90 },
    batteries: [{ brand: "PRAG", model: "LFP Wall", type: "lithium", capacityAh: 100, voltageV: 48, quantity: 2, cycleLife: 6000 }],
    panels: [{ brand: "Jinko", type: "monocrystalline", watts: 450, quantity: 8 }],
    basePrice: 2850000,
    installationFee: 200000,
    warrantyYears: 5,
    includes: ["6.3KVA PRAG Inverter", "10.24kWh Lithium Storage", "Advanced Surge Protection"]
  },
  {
    slug: "odogwu-premium-deye",
    name: "Deye Premium",
    tagline: "Smart, heavy-duty power for multiple ACs and large water pumps.",
    maxContinuousWatts: 7500,
    maxSurgeWatts: 15000,
    inverter: { brand: "Deye", model: "SUN-8K", kva: 8, type: "hybrid", efficiency: 97 },
    batteries: [{ brand: "Pylontech", model: "US3000C", type: "lithium", capacityAh: 74, voltageV: 48, quantity: 3, cycleLife: 6000 }],
    panels: [{ brand: "Jinko", type: "monocrystalline", watts: 550, quantity: 10 }],
    basePrice: 3800000,
    installationFee: 250000,
    warrantyYears: 10,
    includes: ["8KVA Deye Smart Inverter", "10.6kWh Stacked Lithium", "Full Remote Diagnostics"]
  },
  {
    slug: "oga-boss-victron",
    name: "Victron Oga Boss",
    tagline: "Total energy independence for luxury estates. Zero compromises.",
    maxContinuousWatts: 12000,
    maxSurgeWatts: 24000,
    inverter: { brand: "Victron", model: "Quattro", kva: 15, type: "hybrid", efficiency: 96 },
    batteries: [{ brand: "BYD", model: "Premium LVL", type: "lithium", capacityAh: 154, voltageV: 51.2, quantity: 2, cycleLife: 8000 }],
    panels: [{ brand: "Canadian Solar", type: "monocrystalline", watts: 600, quantity: 16 }],
    basePrice: 7500000,
    installationFee: 500000,
    warrantyYears: 10,
    includes: ["15KVA Victron Architecture", "15.7kWh BYD Blade Battery", "Auto-Gen Start"]
  }
];
