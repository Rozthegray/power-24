// ============================================================
// lib/types/index.ts  v2.0
// Central type registry for Power 24.
// v2.0 additions: SeasonalAnalysis, SystemDerateBreakdown,
//   extended LoadProfile and RankedPackage for engineering fields.
// ============================================================

export interface QuoteRequest {
  description: string;
  location?: string;
  budgetRange?: "economy" | "standard" | "premium";
}

export interface DetectedAppliance {
  name: string;
  quantity: number;
  unitWatts: number;
  dailyHours: number;
  hasSurge: boolean;
  surgeMultiplier: number;
  category: ApplianceCategory;
}

export type ApplianceCategory =
  | "lighting" | "cooling" | "refrigeration" | "entertainment"
  | "computing" | "water_pump" | "cooking" | "security" | "other";

export interface AIExtractionResult {
  appliances: DetectedAppliance[];
  totalContinuousWatts: number;
  totalSurgeWatts: number;
  estimatedDailyWattHours: number;
  confidenceScore: number;
  engineersVerdict: string;
  warnings: string[];
}

export interface LoadProfile {
  continuousLoad: number;
  surgeLoad: number;
  dailyEnergyWh: number;
  bufferedEnergyWh: number;
  peakSunHours: number;
  requiredPanelWatts: number;
  requiredBatteryAh: number;
  requiredInverterKva: number;
  // v2.0 additions
  /** Concurrent load diversity factor applied (0.75–1.0 per IEC 60364) */
  diversityFactor: number;
  /** Combined system derate factor (wiring × MPPT × temp × soiling ≈ 0.765) */
  systemDerate: number;
  /** Target backup autonomy in hours used for battery sizing */
  autonomyHours: number;
}

export type TierSlug = string;

export interface SolarPackage {
  slug: TierSlug;
  name: string;
  tagline: string;
  maxContinuousWatts: number;
  maxSurgeWatts: number;
  inverter: InverterSpec;
  batteries: BatterySpec[];
  panels: PanelSpec[];
  basePrice: number;
  installationFee: number;
  warrantyYears: number;
  includes: string[];
}

export interface InverterSpec {
  brand: string;
  model: string;
  kva: number;
  type: "hybrid" | "off-grid" | "grid-tie";
  efficiency: number;
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

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: "hardware" | "installation" | "warranty" | "misc";
}

export interface ScoreBreakdown {
  load: number;
  battery: number;
  solar: number;
  surge: number;
  /** Battery quality score: chemistry type + cycle life rating */
  environment: number;
}

export interface UpgradeProjection {
  action: string;
  projectedScore: number;
}

// ─── v2.0 NEW TYPES ──────────────────────────────────────────

/**
 * Seasonal reliability analysis.
 * Nigerian solar yield drops significantly during the rainy season
 * (April–October). This type exposes the performance gap so customers
 * know the worst-case they should expect, not just the annual average.
 */
export interface SeasonalAnalysis {
  /** Reliability score during dry season (Nov–Mar): best case */
  drySeasonReliability: number;
  /** Reliability score during rainy season (Apr–Oct): worst case */
  rainySeasonReliability: number;
  /** Rainy-season peak sun hours for this location */
  worstCasePSH: number;
  /** Daily generation (Wh) under rainy-season conditions */
  worstCaseDailyGenWh: number;
}

/**
 * Explicit system derate breakdown.
 * Every solar installation loses efficiency between the panel and the load.
 * These are the standard engineering derates used by NABCEP-certified designers.
 */
export interface SystemDerateBreakdown {
  /** DC + AC wiring resistive losses (~3%) */
  wiring: number;
  /** MPPT charge controller efficiency loss (~3%) */
  mppt: number;
  /** Panel temperature derating at Nigerian ambient (~12%) */
  temperature: number;
  /** Dust and soiling losses — Harmattan season (~5%) */
  soiling: number;
  /** Combined product of all derates above (~0.765) */
  combined: number;
}

// ─── EXTENDED INTERFACES ─────────────────────────────────────

export interface RankedPackage {
  tierLabel: "🟢 Survival Tier" | "🟡 Conditionally Reliable" | "🔵 Full Comfort Tier" | "Alternative Option";
  package: SolarPackage;
  lineItems: LineItem[];
  totalPriceNGN: number;
  monthlyPaymentOption: number;
  estimatedRuntimeRange: string;
  backupCapacityDays: string;
  reliabilityScore: number;
  scoreBreakdown: ScoreBreakdown;
  consequenceText: string;
  realityCheckText: string;
  bestForText: string;
  notIdealForText: string;
  upgradeProjections: UpgradeProjection[];
  // v2.0 additions
  /** Dry vs. rainy season reliability comparison */
  seasonalAnalysis: SeasonalAnalysis;
  /** Actual usable Wh after DoD and round-trip efficiency */
  batteryUsableWh: number;
  /** Depth-of-discharge limit for this battery chemistry */
  batteryDOD: number;
  /** Full system derate breakdown for engineering transparency */
  systemDerateFactors: SystemDerateBreakdown;
  /** Diversity factor applied to concurrent load calculation */
  diversityFactor: number;
}

export interface QuoteResult {
  success: true;
  requestId: string;
  generatedAt: string;
  appliances: DetectedAppliance[];
  loadProfile: LoadProfile;
  options: RankedPackage[];
  warnings: string[];
  engineersVerdict: string;
  confidenceScore: number;
  recommendedInstallers: RecommendedInstaller[];
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

export interface QuoteError {
  success: false;
  error: string;
  code: ErrorCode;
  retryable: boolean;
}

export type ErrorCode =
  | "VALIDATION_ERROR" | "AI_PARSE_FAILURE" | "ENGINE_ERROR"
  | "RATE_LIMITED" | "INTERNAL_ERROR";

export type QuoteResponse = QuoteResult | QuoteError;