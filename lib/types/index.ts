// ============================================================
// lib/types/index.ts  v3.0
// Central type registry for Power 24.
//
// v3.0 changes vs v2.0:
//   • BatterySpec: added `wiring` field ("series" | "parallel") — removes
//     the implicit voltage-based topology assumption from computeBankCapacity
//     and makes upgrade-projection battery math unambiguous.
//   • BatterySpec.type: added "tubular" — tubular-plate lead-acid is the
//     dominant Nigerian battery technology and deserves its own chemistry
//     entry (different cycle life, DoD, and quality score than flat-plate LA).
//   • ScoreBreakdown: renamed `environment` → `quality` — the field was
//     repurposed from an environmental score to a battery-quality score in v2;
//     the old name was misleading and caused confusion in QuoteCard rendering.
//   • LoadProfile: `bufferedEnergyWh` now documented — it is the 15% safety
//     margin on daily demand used for customer-facing display; the engine
//     uses `dailyEnergyWh` for all internal sizing math.
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
  | "lighting"
  | "cooling"
  | "refrigeration"
  | "entertainment"
  | "computing"
  | "water_pump"
  | "cooking"
  | "security"
  | "other";

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
  /**
   * Daily energy demand with a 15% safety margin applied.
   * Used for customer-facing display ("your home uses ~X kWh/day")
   * to set conservative expectations. All internal engine calculations
   * (battery sizing, solar sizing, scoring) use `dailyEnergyWh` instead.
   */
  bufferedEnergyWh: number;
  peakSunHours: number;
  requiredPanelWatts: number;
  requiredBatteryAh: number;
  requiredInverterKva: number;
  /** Concurrent load diversity factor applied (0.75–1.0 per IEC 60364) */
  diversityFactor: number;
  /** Combined system derate factor (wiring × MPPT × temp × soiling ≈ 0.787) */
  systemDerate: number;
  /** Target backup autonomy in hours used for battery sizing (default: 8h) */
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
  /**
   * Battery chemistry type.
   */
  type: "lithium" | "lead-acid" | "gel" | "tubular";
  /**
   * Physical wiring topology of this battery spec within the bank.
   */
  wiring?: "series" | "parallel";
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
  /**
   * Battery quality score: chemistry type + cycle life rating.
   */
  quality: number;
}

export interface UpgradeProjection {
  icon?: string; // Added to support new UI
  action: string;
  projectedScore: number;
  reasoning?: string; // Added to support new UI
}

// ─── SEASONAL ANALYSIS ───────────────────────────────────────

export interface SeasonalAnalysis {
  drySeasonReliability: number;
  rainySeasonReliability: number;
  worstCasePSH: number;
  worstCaseDailyGenWh: number;
}

// ─── SYSTEM DERATE BREAKDOWN ─────────────────────────────────

export interface SystemDerateBreakdown {
  wiring: number;
  mppt: number;
  temperature: number;
  soiling: number;
  combined: number;
}

// ─── EXTENDED INTERFACES ─────────────────────────────────────

export interface RankedPackage {
  tierLabel: string; // Relaxed to string to stop strict validation errors
  package: SolarPackage;
  lineItems: LineItem[];
  totalPriceNGN: number;
  monthlyPaymentOption: number;
  
  // UNIFIED ENGINE UPDATES:
  estimatedRuntimeRange: string; // Kept for fallback
  estimatedRuntimeLight: string;
  estimatedRuntimeHeavy: string | null;

  backupCapacityDays: string;
  reliabilityScore: number;
  scoreBreakdown: ScoreBreakdown;
  consequenceText: string;
  realityCheckText: string;
  bestForText: string;
  notIdealForText: string;
  upgradeProjections: UpgradeProjection[];
  seasonalAnalysis: SeasonalAnalysis;
  batteryUsableWh: number;
  batteryDOD: number;
  systemDerateFactors: SystemDerateBreakdown;
  diversityFactor: number;

  // Added fields to support QuoteCard.tsx UI
  acRuntimeHours?: number | null;
  isOverProvisioned?: boolean;
  overProvisioningRatio?: number;
  systemLimitedBy?: string;
  acCompatibilityText?: string;
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
  | "VALIDATION_ERROR"
  | "AI_PARSE_FAILURE"
  | "ENGINE_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type QuoteResponse = QuoteResult | QuoteError;
