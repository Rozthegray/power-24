// ============================================================
// lib/types/index.ts
// Central type registry for Power 24. Every shape that crosses
// a boundary (AI → Engine → API → UI) is defined here.
// ============================================================

// ─── Raw input from the user ────────────────────────────────
export interface QuoteRequest {
  description: string; // Free-text appliance list
  location?: string;   // Optional: Lagos, Abuja, etc.
  budgetRange?: "economy" | "standard" | "premium";
}

// ─── What the AI extracts ───────────────────────────────────
export interface DetectedAppliance {
  name: string;
  quantity: number;
  unitWatts: number;          // Rated wattage per unit
  dailyHours: number;         // Hours of use per day
  hasSurge: boolean;          // Motor/compressor load?
  surgeMultiplier: number;    // 1x–3x
  category: ApplianceCategory;
}

export type ApplianceCategory =
  | "lighting"
  | "cooling"
  | "refrigeration"
  | "entertainment"
  | "computing"
  | "water_pump"
  | "cooking"
  | "security"
  | "other";

// ─── AI's raw output (enforced by Zod) ──────────────────────
export interface AIExtractionResult {
  appliances: DetectedAppliance[];
  totalContinuousWatts: number;
  totalSurgeWatts: number;
  estimatedDailyWattHours: number;
  confidenceScore: number;    // 0–1
  warnings: string[];         // e.g. "AC wattage assumed"
}

// ─── Engine computed values ─────────────────────────────────
export interface LoadProfile {
  continuousLoad: number;       // watts
  surgeLoad: number;            // watts (peak)
  dailyEnergyWh: number;        // watt-hours per day
  bufferedEnergyWh: number;     // with 30% safety buffer
  peakSunHours: number;         // location-adjusted (avg 5.5 NG)
  requiredPanelWatts: number;
  requiredBatteryAh: number;    // at 48V system
  requiredInverterKva: number;
}

// ─── Package / Tier ─────────────────────────────────────────
export type TierSlug = string; // Relaxed to allow all 10 of our new tiers!

export interface SolarPackage {
  slug: TierSlug;
  name: string;
  tagline: string;
  maxContinuousWatts: number;
  maxSurgeWatts: number;
  inverter: InverterSpec;
  batteries: BatterySpec[];
  panels: PanelSpec[];
  basePrice: number;           // NGN, hardware only
  installationFee: number;     // NGN flat fee
  warrantyYears: number;
  includes: string[];
}

export interface InverterSpec {
  brand: string;
  model: string;
  kva: number;
  type: "hybrid" | "off-grid" | "grid-tie";
  efficiency: number;          // percentage e.g. 93
}

export interface BatterySpec {
  brand: string;
  model: string;
  type: "lithium" | "lead-acid" | "gel";
  voltageV: number;
  capacityAh: number;
  quantity: number;
  cycleLife: number;
}

export interface PanelSpec {
  brand: string;
  model?: string;
  watts: number;
  type: "monocrystalline" | "polycrystalline";
  quantity: number;
}

// ─── Final quote response ────────────────────────────────────
export interface QuoteResult {
  success: true;
  requestId: string;
  generatedAt: string;          // ISO timestamp
  appliances: DetectedAppliance[];
  loadProfile: LoadProfile;
  selectedPackage: SolarPackage;
  lineItems: LineItem[];
  totalPriceNGN: number;
  monthlyPaymentOption: number; // ~36 months estimate
  warnings: AIExtractionResult["warnings"];
  confidenceScore: number;
  recommendedInstallers: RecommendedInstaller[];
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: "hardware" | "installation" | "warranty" | "misc";
}

export interface RecommendedInstaller {
  id: string;
  name: string;
  city: string;
  state: string;
  rating: number;
  reviewCount: number;
  phone: string;
  certifications: string[];
  specialties: string[];
}

// ─── API error shape ─────────────────────────────────────────
export interface QuoteError {
  success: false;
  error: string;
  code: ErrorCode;
  retryable: boolean;
}

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AI_PARSE_FAILURE"
  | "ENGINE_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type QuoteResponse = QuoteResult | QuoteError;
