// ============================================================
// lib/types/index.ts
// Central type registry for Power 24.
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
  environment: number;
}

export interface UpgradeProjection {
  action: string;
  projectedScore: number;
}

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