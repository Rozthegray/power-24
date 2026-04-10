// ============================================================
// lib/data/packages.ts
// The Power 24 Tier Matrix
// Fully integrated with Q2 2026 Nigerian Forensic Market Data
// ============================================================
import { SolarPackage } from "@/lib/types";

export const SOLAR_PACKAGES: SolarPackage[] = [
  // ─── MICRO-PORTABLES & PAYG ───────────────────────────────
  {
    slug: "lumos-l1",
    name: "Lumos L1 (MTN)",
    tagline: "Basic PAYG illumination and laptop charging. (Strictly no heating loads)",
    maxContinuousWatts: 150,
    maxSurgeWatts: 150,
    inverter: { brand: "Lumos", model: "L1 Integrated", kva: 0.15, type: "off-grid", efficiency: 90 },
    batteries: [{ brand: "Lumos", model: "Internal", type: "lithium", capacityAh: 26, voltageV: 12, quantity: 1, cycleLife: 2000 }],
    panels: [{ brand: "Lumos", type: "monocrystalline", watts: 160, quantity: 1 }],
    basePrice: 499500, // Outright verified price
    installationFee: 0,
    warrantyYears: 3,
    includes: ["320Wh Indoor Battery", "160W Solar Panel", "MTN PAYG Integration"]
  },
  {
    slug: "cola-1000-pro",
    name: "Cola 1000 Pro",
    tagline: "The budget champion for students and studio apartments.",
    maxContinuousWatts: 1000,
    maxSurgeWatts: 2000,
    inverter: { brand: "Cola", model: "1000 Pro", kva: 1.0, type: "off-grid", efficiency: 92 },
    batteries: [{ brand: "Cola", model: "Integrated LFP", type: "lithium", capacityAh: 40, voltageV: 25.6, quantity: 1, cycleLife: 4000 }],
    panels: [{ brand: "Generic", type: "monocrystalline", watts: 200, quantity: 1 }],
    basePrice: 270000, 
    installationFee: 0,
    warrantyYears: 1,
    includes: ["1000Wh Portable Station", "Pure Sine Wave Inverter", "Plug-and-Play"]
  },
  {
    slug: "ecoflow-river-2-pro",
    name: "EcoFlow RIVER 2 Pro",
    tagline: "X-Boost technology for premium, rapid-charging portable power.",
    maxContinuousWatts: 800,
    maxSurgeWatts: 1600, // X-Boost enabled
    inverter: { brand: "EcoFlow", model: "River 2 Pro", kva: 0.8, type: "off-grid", efficiency: 95 },
    batteries: [{ brand: "EcoFlow", model: "Internal LFP", type: "lithium", capacityAh: 60, voltageV: 12.8, quantity: 1, cycleLife: 3000 }],
    panels: [{ brand: "EcoFlow", type: "monocrystalline", watts: 220, quantity: 1 }],
    basePrice: 528500,
    installationFee: 0,
    warrantyYears: 5,
    includes: ["768Wh LFP Battery", "60-Min Grid Fast Charge", "Smartphone Monitoring App"]
  },

  // ─── ENTRY PERMANENT & HEAVY SURGE ──────────────────────────
  {
    slug: "luminous-eco-volt",
    name: "Luminous Basic Backup",
    tagline: "Rugged Indian engineering to survive the harshest grid fluctuations.",
    maxContinuousWatts: 1260, // True watts from 1.5KVA @ 0.84 PF
    maxSurgeWatts: 2520,
    inverter: { brand: "Luminous", model: "Eco Volt Neo 1500", kva: 1.5, type: "hybrid", efficiency: 84 },
    batteries: [{ brand: "Luminous", model: "Inverlast", type: "lead-acid", capacityAh: 220, voltageV: 12, quantity: 2, cycleLife: 1000 }],
    panels: [{ brand: "Jinko", type: "monocrystalline", watts: 300, quantity: 4 }],
    basePrice: 821000, // ₦165k Inv + ₦328k*2 Batt
    installationFee: 100000,
    warrantyYears: 1,
    includes: ["1.5KVA Luminous Inverter", "2x 220Ah Tubular Batteries", "ABCC Charging Tech"]
  },
  {
    slug: "sako-alaba-special",
    name: "Sako High-Volume",
    tagline: "The Alaba market favorite. High capacity, pure off-grid value.",
    maxContinuousWatts: 4000,
    maxSurgeWatts: 8400,
    inverter: { brand: "Sako", model: "Sunon 4.2KVA", kva: 4.2, type: "off-grid", efficiency: 95 },
    batteries: [{ brand: "Generic", model: "LFP Wall", type: "lithium", capacityAh: 100, voltageV: 24, quantity: 1, cycleLife: 4000 }],
    panels: [{ brand: "Canadian Solar", type: "monocrystalline", watts: 400, quantity: 6 }],
    basePrice: 1110000, // ₦410k Inv + ₦700k Batt
    installationFee: 120000,
    warrantyYears: 1,
    includes: ["4.2KVA Sako Inverter", "2.5kWh Lithium Storage", "High-Voltage MPPT"]
  },
  {
    slug: "bluegate-surge-master",
    name: "Blue Gate Surge Master",
    tagline: "Massive internal transformers designed to start heavy AC compressors.",
    maxContinuousWatts: 3500, // True continuous of BG5500
    maxSurgeWatts: 10500, // 300% surge capability!
    inverter: { brand: "Blue Gate", model: "BG5500", kva: 5.5, type: "hybrid", efficiency: 80 },
    batteries: [{ brand: "Felicity", model: "LFP Wall", type: "lithium", capacityAh: 100, voltageV: 48, quantity: 1, cycleLife: 6000 }],
    panels: [{ brand: "Jinko", type: "monocrystalline", watts: 450, quantity: 6 }],
    basePrice: 1877000, // ₦380k Inv + ₦1.49M Batt
    installationFee: 150000,
    warrantyYears: 2,
    includes: ["5.5KVA Blue Gate Inverter", "5.12kWh Lithium Battery", "Extreme Inductive Resilience"]
  },

  // ─── PREMIUM & COMMERCIAL ───────────────────────────────────
  {
    slug: "felicity-commercial",
    name: "Felicity Standard Home",
    tagline: "The reliable workhorse of the Nigerian residential class.",
    maxContinuousWatts: 5000, 
    maxSurgeWatts: 10000,
    inverter: { brand: "Felicity", model: "IVEM 5048-LV", kva: 5, type: "hybrid", efficiency: 90 },
    batteries: [{ brand: "Felicity", model: "LFP Wall", type: "lithium", capacityAh: 100, voltageV: 48, quantity: 1, cycleLife: 6000 }],
    panels: [{ brand: "Canadian Solar", type: "monocrystalline", watts: 450, quantity: 8 }],
    basePrice: 2247200, // ₦750k Inv + ₦1.49M Batt
    installationFee: 150000,
    warrantyYears: 5,
    includes: ["5KVA Felicity Hybrid Inverter", "5.12kWh Lithium Storage", "Full Local Warranty Support"]
  },
  {
    slug: "prag-heavy-duty",
    name: "PRAG Swiss-Engineered",
    tagline: "Unbreakable European internal componentry with 0ms transfer time.",
    maxContinuousWatts: 5000,
    maxSurgeWatts: 10000,
    inverter: { brand: "PRAG", model: "Advanced Modular Online", kva: 5, type: "hybrid", efficiency: 94 },
    batteries: [{ brand: "PRAG", model: "LFP Wall", type: "lithium", capacityAh: 100, voltageV: 48, quantity: 1, cycleLife: 6000 }],
    panels: [{ brand: "Jinko", type: "monocrystalline", watts: 550, quantity: 8 }],
    basePrice: 1750000, // ₦600k Inv + ₦1.15M Batt
    installationFee: 200000,
    warrantyYears: 5,
    includes: ["5KVA PRAG Online Inverter", "Zero-Millisecond UPS Switchover", "Server-Grade Reliability"]
  },
  {
    slug: "ecoflow-delta-pro",
    name: "EcoFlow DELTA Pro",
    tagline: "The ultimate 3.6kWh portable flagship. Powers heavy home loads.",
    maxContinuousWatts: 3600,
    maxSurgeWatts: 7200,
    inverter: { brand: "EcoFlow", model: "Delta Pro", kva: 3.6, type: "off-grid", efficiency: 96 },
    batteries: [{ brand: "EcoFlow", model: "Internal LFP", type: "lithium", capacityAh: 75, voltageV: 48, quantity: 1, cycleLife: 6500 }],
    panels: [{ brand: "EcoFlow", type: "monocrystalline", watts: 400, quantity: 2 }],
    basePrice: 2038399,
    installationFee: 0,
    warrantyYears: 5,
    includes: ["3600Wh Power Station", "2.7-Hour Grid Fast Charge", "Zero Installation Required"]
  },
  {
    slug: "deye-flagship",
    name: "Deye Advanced Flagship",
    tagline: "The gold standard. Smart load separation and massive surge handling.",
    maxContinuousWatts: 8000,
    maxSurgeWatts: 16000, // 10-second sustained surge window
    inverter: { brand: "Deye", model: "SUN-8K-SG04LP3-EU", kva: 8, type: "hybrid", efficiency: 97 },
    batteries: [{ brand: "Deye", model: "SE-G5.1Pro-B", type: "lithium", capacityAh: 100, voltageV: 51.2, quantity: 2, cycleLife: 6000 }],
    panels: [{ brand: "Jinko", type: "monocrystalline", watts: 550, quantity: 12 }],
    basePrice: 3360000, // ₦1.68M Inv + (₦840k * 2) Batt
    installationFee: 250000,
    warrantyYears: 10,
    includes: ["8KVA Deye Hybrid Architecture", "10.24kWh Proprietary Storage", "Fouani Warranty Network"]
  }
];
