"use client";
import { useState } from "react";
import type {
  QuoteResult,
  RankedPackage,
  BatterySpec,
  PanelSpec,
  RecommendedInstaller,
  SystemDerateBreakdown,
  LoadProfile,
  LineItem,
} from "@/lib/types";

// ─── TYPES ───────────────────────────────────────────────────

interface QuoteCardProps {
  quote: QuoteResult;
  onReset: () => void;
}

type TierColors = { bg: string; accent: string; badge: string };
type TabKey = "overview" | "specs" | "pricing" | "installers";

// ─── TIER COLOR MAP ───────────────────────────────────────────
const TIER_COLORS: Record<string, TierColors> = {
  "lumos-l1":            { bg: "bg-white",        accent: "text-[#008751]",  badge: "bg-green-50 text-[#008751] border-green-200"    },
  "ecoflow-river-2":     { bg: "bg-white",        accent: "text-[#008751]",  badge: "bg-green-50 text-[#008751] border-green-200"    },
  "ecoflow-river-2-max": { bg: "bg-white",        accent: "text-[#008751]",  badge: "bg-green-50 text-[#008751] border-green-200"    },
  "ecoflow-river-2-pro": { bg: "bg-white",        accent: "text-[#008751]",  badge: "bg-green-50 text-[#008751] border-green-200"    },
  "basic-home-1kva":     { bg: "bg-white",        accent: "text-[#008751]",  badge: "bg-green-50 text-[#008751] border-green-200"    },
  "sapa-lite":           { bg: "bg-white",        accent: "text-[#008751]",  badge: "bg-green-50 text-[#008751] border-green-200"    },
  "hustler-plus":        { bg: "bg-white",        accent: "text-[#008751]",  badge: "bg-green-50 text-[#008751] border-green-200"    },
  "odogwu-premium":      { bg: "bg-orange-50/30", accent: "text-orange-600", badge: "bg-orange-100 text-orange-700 border-orange-200" },
  "oga-boss":            { bg: "bg-red-50/30",    accent: "text-red-600",    badge: "bg-red-100 text-red-700 border-red-200"         },
};
const DEFAULT_COLORS: TierColors = {
  bg: "bg-white", accent: "text-[#008751]", badge: "bg-green-50 text-[#008751] border-green-200",
};

// ─── HELPERS ─────────────────────────────────────────────────
const formatNGN = (amount?: number): string =>
  amount ? `₦${amount.toLocaleString("en-NG")}` : "₦0";

const INSTALLMENT_APR_PCT = ((Math.pow(1.03, 12) - 1) * 100).toFixed(1);

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function QuoteCard({ quote, onReset }: QuoteCardProps) {
  const [activeTab,         setActiveTab]         = useState<TabKey>("overview");
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(0);
  const [copiedId,          setCopiedId]          = useState(false);

  if (!quote?.options?.length) return null;

  const currentOption = quote.options[selectedOptionIdx];
  const pkg           = currentOption.package;
  const colors        = TIER_COLORS[pkg.slug] ?? DEFAULT_COLORS;

  const copyRequestId = async () => {
    await navigator.clipboard.writeText(quote.requestId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const seasonal    = currentOption.seasonalAnalysis;
  const seasonalGap = seasonal ? seasonal.drySeasonReliability - seasonal.rainySeasonReliability : 0;
  const showSeasonalWarning = !!seasonal && seasonalGap > 5 && seasonal.rainySeasonReliability < 70;

  return (
    <div
      className={`w-full rounded-2xl ${colors.bg} border border-slate-200 overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,135,81,0.15)] font-sans transition-colors duration-300`}
    >
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2">
        {quote.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => { setSelectedOptionIdx(idx); setActiveTab("overview"); }}
            className={`px-4 py-2 text-xs font-bold rounded-full transition-all border ${
              selectedOptionIdx === idx
                ? "bg-slate-900 text-white border-slate-900 shadow-md"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
            }`}
          >
            {opt.tierLabel}
            {opt.isOverProvisioned && (
              <span
                className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle"
                title={`${opt.overProvisioningRatio}× your current demand`}
              />
            )}
          </button>
        ))}
      </div>

      <div className="relative px-6 pt-6 pb-5 border-b border-slate-200 bg-white">
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-bold ${colors.badge}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {currentOption.tierLabel.replace(/[🟢🟡🔵🟠]/g, "").trim()}
              </div>
              {currentOption.isOverProvisioned && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700">
                  ⚡ {currentOption.overProvisioningRatio}× demand
                </span>
              )}
            </div>
            <h2
              className="text-3xl font-black text-slate-900 tracking-tight leading-none"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {pkg.name}
            </h2>
            <p className="text-sm text-slate-500 mt-2 font-medium">
              Calibrated for Nigerian ambient conditions
              {currentOption.diversityFactor
                ? ` · ${Math.round(currentOption.diversityFactor * 100)}% diversity factor`
                : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-3xl font-black ${colors.accent} leading-none`}>
              {formatNGN(currentOption.totalPriceNGN)}
            </div>
            <div className="text-xs text-slate-400 mt-1.5 font-bold">
              or {formatNGN(currentOption.monthlyPaymentOption)}/mo × 36
            </div>
          </div>
        </div>

        <div className="mt-5 p-4 rounded-xl border border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-black text-slate-700">System Reliability</span>
            <span
              className={`text-sm font-black ${
                currentOption.reliabilityScore >= 80 ? "text-green-600"
                : currentOption.reliabilityScore >= 60 ? "text-yellow-600"
                : "text-red-500"
              }`}
            >
              {currentOption.reliabilityScore}%{" "}
              {currentOption.reliabilityScore >= 80 ? "(High)"
               : currentOption.reliabilityScore >= 60 ? "(Medium)"
               : "(Fragile)"}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-slate-200 w-full mb-3">
            <div
              className={`h-full transition-all duration-700 ${
                currentOption.reliabilityScore >= 80 ? "bg-green-500"
                : currentOption.reliabilityScore >= 60 ? "bg-yellow-400"
                : "bg-red-400"
              }`}
              style={{ width: `${currentOption.reliabilityScore}%` }}
            />
          </div>

          <div className="grid grid-cols-5 gap-1.5 text-center mt-4 pt-4 border-t border-slate-200">
            {(["load", "battery", "solar", "surge", "quality"] as const).map((key, i) => {
              const labels = ["Load", "Battery", "Solar", "Surge", "Quality"];
              const val    = currentOption.scoreBreakdown[key];
              const isWeak = val < 60;
              return (
                <div key={key}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{labels[i]}</p>
                  <p className={`text-xs font-black ${isWeak ? "text-red-500" : "text-slate-700"}`}>
                    {val}%{isWeak ? " ⚠️" : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {currentOption.acRuntimeHours !== null && currentOption.acRuntimeHours !== undefined && (
          <AcRuntimeCallout
            acRuntimeHours={currentOption.acRuntimeHours}
            overProvisioningRatio={currentOption.overProvisioningRatio ?? 0}
          />
        )}

        {showSeasonalWarning && seasonal && (
          <div className="mt-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-amber-800 uppercase tracking-wider">
                ⛅ Seasonal Performance Gap
              </p>
              <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                {seasonalGap}pt gap
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-[10px] font-bold text-yellow-700 uppercase mb-1">☀️ Dry Season</p>
                <p className="text-xl font-black text-yellow-700">{seasonal.drySeasonReliability}%</p>
                <p className="text-[10px] text-yellow-600 mt-0.5">Nov – Mar</p>
              </div>
              <div className="text-center p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">🌧️ Rainy Season</p>
                <p className={`text-xl font-black ${seasonal.rainySeasonReliability < 65 ? "text-red-500" : "text-blue-700"}`}>
                  {seasonal.rainySeasonReliability}%
                </p>
                <p className="text-[10px] text-blue-600 mt-0.5">Apr – Oct</p>
              </div>
            </div>
            <p className="text-xs text-amber-700 mt-2.5 font-medium">
              ⚠️ Rainy season yield drops to ~{seasonal.worstCaseDailyGenWh.toLocaleString()} Wh/day
              ({seasonal.worstCasePSH} PSH). Adding panels closes this gap.
            </p>
          </div>
        )}

        <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">⚠️ What This Means</p>
            <p className="text-sm text-slate-800 font-medium">{currentOption.consequenceText}</p>
          </div>
          <div className="flex flex-col gap-1 pt-2 border-t border-slate-200/60">
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">👤 Best For</p>
            <p className="text-sm text-slate-700 font-medium flex gap-2">
              <span className="text-green-500 shrink-0">✅</span>{currentOption.bestForText}
            </p>
            <p className="text-sm text-slate-700 font-medium flex gap-2">
              <span className="text-red-500 shrink-0">❌</span>{currentOption.notIdealForText}
            </p>
          </div>
        </div>

        <div className="mt-3 p-4 rounded-xl bg-blue-50 border border-blue-100 flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <span className="text-base shrink-0">🧠</span>
            <div>
              <p className="text-xs font-black text-blue-900 uppercase tracking-wider">Reality Check</p>
              <p className="text-sm text-blue-800 mt-1 font-medium">{currentOption.realityCheckText}</p>
            </div>
          </div>
          {currentOption.upgradeProjections?.length > 0 && (
            <div className="flex items-start gap-2 mt-2 pt-3 border-t border-blue-200/50">
              <span className="text-base shrink-0">💡</span>
              <div className="w-full">
                <p className="text-xs font-black text-blue-900 uppercase tracking-wider">Upgrade Path</p>
                <div className="mt-1 space-y-1">
                  {currentOption.upgradeProjections.map((proj, i) => (
                    <p key={i} className="text-sm text-blue-800 font-bold bg-blue-100/50 px-2 py-1 rounded w-full">
                      {proj.icon} {proj.action} → ~{proj.projectedScore}% reliability
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-200 bg-white">
        {(["overview", "specs", "pricing", "installers"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs font-bold capitalize tracking-wide transition-all ${
              activeTab === tab
                ? `border-b-2 border-current ${colors.accent}`
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === "overview"   && <OverviewTab   quote={quote} currentOption={currentOption} colors={colors} />}
        {activeTab === "specs"      && <SpecsTab      quote={quote} currentOption={currentOption} colors={colors} />}
        {activeTab === "pricing"    && <PricingTab    currentOption={currentOption} colors={colors} />}
        {activeTab === "installers" && <InstallersTab quote={quote} colors={colors} />}
      </div>

      <div className="px-6 pb-6 pt-2 bg-white flex flex-col sm:flex-row gap-3">
        <button
          className="flex-1 py-3.5 rounded-xl font-bold text-sm tracking-wide bg-[#008751] hover:bg-[#00683e] text-white transition-all active:scale-[0.98] shadow-md shadow-[#008751]/20"
          onClick={() => window.open("tel:0800POWER24")}
        >
          ⚡ Connect to an Installer Now
        </button>
        <button
          onClick={onReset}
          className="sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200"
        >
          Start Over
        </button>
      </div>

      {quote.warnings?.length > 0 && (
        <div className="mx-6 mb-6 p-4 rounded-xl bg-orange-50 border border-orange-100">
          <p className="text-xs font-bold text-orange-600 mb-2 uppercase tracking-wider">⚠ Engineering Notes</p>
          <ul className="space-y-1">
            {quote.warnings.map((w, i) => (
              <li key={i} className="text-xs text-orange-700/80 flex gap-2">
                <span className="text-orange-400 shrink-0 mt-0.5">›</span>{w}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="px-6 pb-4 flex items-center justify-between bg-slate-50/50 pt-4 border-t border-slate-100">
        <span className="text-xs text-slate-400 font-mono font-medium">
          Generated {quote.generatedAt ? new Date(quote.generatedAt).toLocaleString("en-NG") : "Just now"}
        </span>
        <button
          onClick={copyRequestId}
          className="text-xs text-slate-400 hover:text-[#008751] font-mono font-bold transition-colors"
        >
          {copiedId ? "✓ Copied!" : quote.requestId}
        </button>
      </div>
    </div>
  );
}

interface AcRuntimeCalloutProps {
  acRuntimeHours: number;
  overProvisioningRatio: number;
}
function AcRuntimeCallout({ acRuntimeHours }: AcRuntimeCalloutProps) {
  const isOvernightOk = acRuntimeHours >= 8.0;
  const bgColor  = isOvernightOk ? "bg-green-50 border-green-200" : "bg-rose-50 border-rose-200";
  const icon     = isOvernightOk ? "✅" : "⚠️";
  const headline = isOvernightOk ? "Overnight AC Capable" : "AC Overnight Limit";
  const headColor= isOvernightOk ? "text-green-800" : "text-rose-800";
  const textColor= isOvernightOk ? "text-green-700" : "text-rose-700";

  return (
    <div className={`mt-3 p-4 rounded-xl border ${bgColor} flex items-start gap-3`}>
      <span className="text-lg shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className={`text-xs font-black uppercase tracking-wider mb-1 ${headColor}`}>
          ❄️ {headline}
        </p>
        <p className={`text-sm font-bold ${headColor}`}>
          ~{acRuntimeHours.toFixed(1)} hrs AC-only runtime on a full charge
        </p>
        <p className={`text-xs mt-1 font-medium ${textColor}`}>
          {isOvernightOk
            ? "Battery sustains overnight AC operation. Other loads (fridge, fans, lights) also draw from this — factor them into planning."
            : `That's less than a full overnight cycle. Other loads reduce this further. Add 1 battery unit to reach ≥ 8 hrs and achieve overnight AC independence.`}
        </p>
      </div>
    </div>
  );
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────

interface TabProps {
  quote: QuoteResult;
  currentOption: RankedPackage;
  colors: TierColors;
}

// ─── Overview Tab ────────────────────────────────────────────
function OverviewTab({ quote, currentOption, colors }: TabProps) {
  const pkg     = currentOption.package;
  const profile = quote.loadProfile;
  const totalPanelWatts = (pkg.panels ?? []).reduce(
    (s: number, p: PanelSpec) => s + p.watts * p.quantity, 0
  );

  const stats: any[] = [
    { label: "Night Runtime (Light)", value: `~${currentOption.estimatedRuntimeLight || currentOption.estimatedRuntimeRange} hrs`, icon: "🌙" },
  ];

  if (currentOption.estimatedRuntimeHeavy) {
    stats.push({ label: "Night Runtime (+AC)", value: `~${currentOption.estimatedRuntimeHeavy} hrs`, icon: "❄️" });
  }

  stats.push(
    { label: "Backup Autonomy", value: currentOption.backupCapacityDays, icon: "🔋" },
    {
      label: "Usable Battery",
      value: currentOption.batteryUsableWh
        ? `${(currentOption.batteryUsableWh / 1000).toFixed(1)} kWh`
        : "—",
      icon: "⚡",
    },
    { label: "Panel Array", value: totalPanelWatts > 0 ? `${totalPanelWatts}W` : "No panels", icon: "☀️" },
    { label: "Daily Demand", value: `${(profile.dailyEnergyWh / 1000).toFixed(1)} kWh`, icon: "📊" }
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-slate-50 border border-slate-100 p-4 shadow-sm">
            <div className="text-xl mb-1.5">{stat.icon}</div>
            <div className={`text-base font-black ${colors.accent}`}>{stat.value}</div>
            <div className="text-xs text-slate-500 mt-1 font-semibold">{stat.label}</div>
          </div>
        ))}
      </div>

      {currentOption.batteryDOD != null && (
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs text-slate-500 font-medium">
          <span className="font-black text-slate-700">Battery chemistry: </span>
          {pkg.batteries[0]?.type?.toUpperCase()} ·{" "}
          <span className="font-black text-slate-700">
            {Math.round(currentOption.batteryDOD * 100)}% safe DoD
          </span>{" "}
          · {(currentOption.batteryUsableWh / 1000).toFixed(1)} kWh usable of{" "}
          {(currentOption.batteryUsableWh / currentOption.batteryDOD / 0.92 / 1000).toFixed(1)} kWh gross
        </div>
      )}

      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">What's Included</h3>
        <ul className="space-y-2.5">
          {pkg.includes.map((item: string, i: number) => (
            <li key={i} className="flex gap-3 text-sm text-slate-600 font-medium">
              <span className={`shrink-0 mt-0.5 ${colors.accent}`}>✓</span>{item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Specs Tab ───────────────────────────────────────────────
function SpecsTab({ quote, currentOption, colors }: TabProps) {
  const pkg     = currentOption.package;
  const profile = quote.loadProfile;
  const derate  = currentOption.systemDerateFactors;

  return (
    <div className="space-y-5 font-mono text-sm">
      <SpecSection title="⚡ Inverter" color={colors.accent}>
        <SpecRow label="Brand / Model" value={`${pkg.inverter.brand} ${pkg.inverter.model}`} />
        <SpecRow label="Capacity"      value={`${pkg.inverter.kva} KVA`} />
        <SpecRow label="Efficiency"    value={`${pkg.inverter.efficiency}%`} />
        <SpecRow label="Type"          value={pkg.inverter.type} />
      </SpecSection>

      {pkg.batteries.map((b: BatterySpec, i: number) => (
        <SpecSection key={i} title="🔋 Battery Bank" color={colors.accent}>
          <SpecRow label="Configuration" value={`${b.quantity} × ${b.capacityAh}Ah @ ${b.voltageV}V`} />
          <SpecRow label="Wiring"        value={b.wiring ? b.wiring.toUpperCase() : "—"} />
          <SpecRow label="Chemistry"     value={b.type.toUpperCase()} />
          <SpecRow label="Safe DoD"      value={`${Math.round((currentOption.batteryDOD ?? 0.5) * 100)}%`} />
          <SpecRow label="Usable"        value={`${(currentOption.batteryUsableWh / 1000).toFixed(2)} kWh`} />
          <SpecRow label="Cycle Life"    value={`${b.cycleLife.toLocaleString()} cycles`} />
        </SpecSection>
      ))}

      {currentOption.acRuntimeHours !== null && currentOption.acRuntimeHours !== undefined && (
        <SpecSection title="❄️ AC Runtime Analysis" color={colors.accent}>
          <SpecRow label="AC-only battery runtime" value={`~${currentOption.acRuntimeHours.toFixed(1)} hrs`} />
          <SpecRow
            label="Overnight AC capable?"
            value={currentOption.acRuntimeHours >= 8 ? "Yes (≥ 8 hrs)" : `No (${currentOption.acRuntimeHours.toFixed(1)} hrs < 8 hrs threshold)`}
          />
          <SpecRow label="Method" value="usableWh ÷ (ratedW × 0.40 duty × 1.35 heat)" />
        </SpecSection>
      )}

      {derate && (
        <SpecSection title="📐 System Derate Factors" color={colors.accent}>
          <SpecRow label="Wiring losses"      value={`${Math.round((1 - derate.wiring)      * 100)}%`} />
          <SpecRow label="MPPT losses"        value={`${Math.round((1 - derate.mppt)        * 100)}%`} />
          <SpecRow label="Temperature derate" value={`${Math.round((1 - derate.temperature) * 100)}%`} />
          <SpecRow label="Soiling / dust"     value={`${Math.round((1 - derate.soiling)     * 100)}%`} />
          <SpecRow label="Combined derate"    value={`×${derate.combined}`} />
        </SpecSection>
      )}

      <SpecSection title="🏠 Engineered Load Profile" color={colors.accent}>
        <SpecRow label="Continuous Load"  value={`${profile.continuousLoad}W`} />
        <SpecRow label="Surge (Peak)"     value={`${profile.surgeLoad}W`} />
        <SpecRow label="Daily Energy"     value={`${(profile.dailyEnergyWh / 1000).toFixed(2)} kWh`} />
        <SpecRow label="Displayed Demand" value={`${(profile.bufferedEnergyWh / 1000).toFixed(2)} kWh (15% margin)`} />
        <SpecRow label="Diversity Factor" value={`${Math.round((profile.diversityFactor ?? 1) * 100)}%`} />
        <SpecRow label="Target Backup"    value={`${profile.autonomyHours ?? 8} hours`} />
        {(currentOption.overProvisioningRatio ?? 0) > 1 && (
          <SpecRow
            label="Provisioning Ratio"
            value={`${currentOption.overProvisioningRatio}× daily demand${currentOption.isOverProvisioned ? " ⚠ high" : ""}`}
          />
        )}
      </SpecSection>
    </div>
  );
}

interface SpecSectionProps { title: string; color: string; children: React.ReactNode }
function SpecSection({ title, color, children }: SpecSectionProps) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className={`px-4 py-2.5 bg-slate-50 text-xs font-black ${color} uppercase tracking-wider`}>
        {title}
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

interface SpecRowProps { label: string; value: string }
function SpecRow({ label, value }: SpecRowProps) {
  return (
    <div className="flex justify-between px-4 py-3 bg-white">
      <span className="text-slate-500 text-xs font-semibold">{label}</span>
      <span className="text-slate-900 text-xs font-bold text-right max-w-[60%]">{value}</span>
    </div>
  );
}

// ─── Pricing Tab ─────────────────────────────────────────────
interface PricingTabProps { currentOption: RankedPackage; colors: TierColors }
function PricingTab({ currentOption, colors }: PricingTabProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-slate-50 text-xs font-black text-slate-500 uppercase tracking-wider">
          Itemized Breakdown
        </div>
        <div className="divide-y divide-slate-100">
          {currentOption.lineItems.map((item: LineItem, i: number) => (
            <div key={i} className="px-4 py-3.5 flex justify-between items-start gap-4 bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 font-semibold">{item.description}</p>
                {item.quantity > 1 && (
                  <p className="text-xs text-slate-400 mt-1 font-mono font-medium">
                    {item.quantity} × {formatNGN(item.unitPrice)}
                  </p>
                )}
              </div>
              <span className="text-sm font-black text-slate-900 shrink-0">{formatNGN(item.total)}</span>
            </div>
          ))}
        </div>
        <div className="px-4 py-3.5 bg-slate-50 flex justify-between border-t-2 border-slate-200">
          <span className="text-sm font-black text-slate-700">Total</span>
          <span className={`text-sm font-black ${colors.accent}`}>{formatNGN(currentOption.totalPriceNGN)}</span>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Financing Option</p>
        <p className="text-base font-black text-slate-900">
          {formatNGN(currentOption.monthlyPaymentOption)}
          <span className="text-xs font-medium text-slate-400"> / month for 36 months</span>
        </p>
        <p className="text-xs text-slate-400 mt-1">
          3% monthly rate (~{INSTALLMENT_APR_PCT}% APR). Subject to credit approval.
          Prices are indicative — contact an installer for a firm quote.
        </p>
      </div>
    </div>
  );
}

// ─── Installers Tab ──────────────────────────────────────────
interface InstallersTabProps { quote: QuoteResult; colors: TierColors }
function InstallersTab({ quote, colors }: InstallersTabProps) {
  if (!quote.recommendedInstallers?.length) {
    return (
      <p className="text-sm text-slate-500">
        No verified installers on record for your area yet — call{" "}
        <a href="tel:0800POWER24" className={`font-bold ${colors.accent} underline`}>0800-POWER24</a>
        {" "}to be connected manually.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {quote.recommendedInstallers.map((installer: RecommendedInstaller) => (
        <div key={installer.id} className="rounded-xl border border-slate-200 p-5 bg-white shadow-sm">
          <div className="flex justify-between gap-3">
            <div>
              <h4 className="font-black text-slate-900 text-base">{installer.name}</h4>
              <p className="text-xs text-slate-500 mt-1 font-medium">📍 {installer.city}, {installer.state}</p>
              {installer.certifications?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {installer.certifications.map((cert: string) => (
                    <span key={cert} className="text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                      {cert}
                    </span>
                  ))}
                </div>
              )}
              {installer.specialties?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {installer.specialties.map((spec: string) => (
                    <span key={spec} className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      {spec}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className={`text-lg font-black ${colors.accent}`}>★ {installer.rating.toFixed(1)}</div>
              <p className="text-[10px] text-slate-400">{installer.reviewCount} reviews</p>
              <a href={`tel:${installer.phone}`} className={`mt-2 inline-block text-xs font-bold ${colors.accent} underline`}>
                {installer.phone}
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
