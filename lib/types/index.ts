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
   *
   * "tubular"   — tubular-plate lead-acid; dominant in Nigerian installs.
   * Better partial-SoC tolerance and cycle life than flat-plate
   * lead-acid. DoD: 50%. Typical cycle life: 500–800 cycles.
   * "gel"       — VRLA gel; sealed, maintenance-free. DoD: 50%.
   * Typical cycle life: 300–500 cycles.
   * "lead-acid" — standard flat-plate flooded lead-acid. DoD: 50%.
   * Typical cycle life: 200–350 cycles. Cheapest upfront.
   * "lithium"   — LiFePO4 rack batteries. DoD: 80%, protected by BMS.
   * Typical cycle life: 3,000–6,000 cycles.
   */
  type: "lithium" | "lead-acid" | "gel" | "tubular";
  /**
   * Physical wiring topology of this battery spec within the bank.
   *
   * "series"   — units are wired in series to increase system voltage.
   * Ah capacity stays at a single unit's rating;
   * voltage = voltageV × quantity.
   * Example: 2 × 12V/200Ah in series → 24V/200Ah bank.
   *
   * "parallel" — units are wired in parallel to increase capacity.
   * Voltage stays at a single unit's rating;
   * Ah = capacityAh × quantity.
   * Example: 2 × 48V/100Ah in parallel → 48V/200Ah bank.
   *
   * If omitted, the engine falls back to a voltage heuristic:
   * voltageV ≥ 48V → parallel; voltageV < 48V → series.
   * Explicitly setting this field is strongly recommended for new packages.
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
   * Formerly named "environment" in v2.0 — renamed for clarity.
   * Higher is better: lithium > gel > tubular > lead-acid.
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

// ─── SYSTEM DERATE BREAKDOWN ─────────────────────────────────

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
  /** Combined product of all derates above (~0.787) */
  combined: number;
}

// ─── EXTENDED INTERFACES ─────────────────────────────────────

export interface RankedPackage {
  tierLabel: string; // Relaxed to string to stop strict validation errors
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
