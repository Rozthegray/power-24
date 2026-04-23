"use client";
import { useState } from "react";
import type { QuoteResult, RankedPackage } from "@/lib/types";

interface QuoteCardProps {
  quote: QuoteResult;
  onReset: () => void;
}

const TIER_COLORS: Record<string, { bg: string; accent: string; badge: string }> = {
  "sapa-lite":      { bg: "bg-white",         accent: "text-[#008751]", badge: "bg-green-50 text-[#008751] border-green-200" },
  "hustler-plus":   { bg: "bg-white",         accent: "text-[#008751]", badge: "bg-green-50 text-[#008751] border-green-200" },
  "odogwu-premium": { bg: "bg-orange-50/30",  accent: "text-orange-600", badge: "bg-orange-100 text-orange-700 border-orange-200" },
  "oga-boss":       { bg: "bg-red-50/30",     accent: "text-red-600",   badge: "bg-red-100 text-red-700 border-red-200" },
};
const DEFAULT_COLORS = { bg: "bg-white", accent: "text-[#008751]", badge: "bg-green-50 text-[#008751] border-green-200" };

export default function QuoteCard({ quote, onReset }: QuoteCardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "pricing" | "installers">("overview");
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(0);
  const [copiedId, setCopiedId] = useState(false);

  if (!quote || !quote.options || quote.options.length === 0) return null;

  const currentOption = quote.options[selectedOptionIdx];
  const pkg = currentOption.package;
  const colors = TIER_COLORS[pkg.slug] ?? DEFAULT_COLORS;
  const formatNGN = (amount?: number) => amount ? `₦${amount.toLocaleString("en-NG")}` : "₦0";

  const copyRequestId = async () => {
    await navigator.clipboard.writeText(quote.requestId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const seasonal = currentOption.seasonalAnalysis;
  const seasonalGap = seasonal
    ? seasonal.drySeasonReliability - seasonal.rainySeasonReliability
    : 0;

  return (
    <div className={`w-full rounded-2xl ${colors.bg} border border-slate-200 overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,135,81,0.15)] font-sans transition-colors duration-300`}>

      {/* ─── Package Selector Pills ─────────────────────────── */}
      {quote.options.length > 1 && (
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
            </button>
          ))}
        </div>
      )}

      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="relative px-6 pt-6 pb-5 border-b border-slate-200 bg-white">
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-bold mb-3 ${colors.badge}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {currentOption.tierLabel.toUpperCase().replace(/[🟢🟡🔵]/g, '').trim()}
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none" style={{ fontFamily: "'Syne', sans-serif" }}>
              {pkg.name}
            </h2>
            <p className="text-sm text-slate-500 mt-2 font-medium">
              Calibrated for Nigerian ambient conditions · {currentOption.diversityFactor ? `${Math.round(currentOption.diversityFactor * 100)}% diversity factor` : ""}
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

        {/* ─── Reliability Score ─────────────────────────────── */}
        <div className="mt-5 p-4 rounded-xl border border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-black text-slate-700">System Reliability</span>
            <span className={`text-sm font-black ${
              currentOption.reliabilityScore >= 80 ? "text-green-600" :
              currentOption.reliabilityScore >= 60 ? "text-yellow-600" : "text-red-500"
            }`}>
              {currentOption.reliabilityScore}%{" "}
              {currentOption.reliabilityScore >= 80 ? "(High)" :
               currentOption.reliabilityScore >= 60 ? "(Medium)" : "(Fragile)"}
            </span>
          </div>
          <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-slate-200 w-full mb-3">
            <div
              className={`h-full transition-all duration-700 ${
                currentOption.reliabilityScore >= 80 ? "bg-green-500" :
                currentOption.reliabilityScore >= 60 ? "bg-yellow-400" : "bg-red-400"
              }`}
              style={{ width: `${currentOption.reliabilityScore}%` }}
            />
          </div>

          {/* Score breakdown */}
          <div className="grid grid-cols-5 gap-1.5 text-center mt-4 pt-4 border-t border-slate-200">
            {(["load","battery","solar","surge","environment"] as const).map((key, i) => {
              const labels = ["Load", "Battery", "Solar", "Surge", "Quality"];
              const val = currentOption.scoreBreakdown[key];
              const isWeak = val < 60;
              return (
                <div key={key}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{labels[i]}</p>
                  <p className={`text-xs font-black ${isWeak ? "text-red-500" : "text-slate-700"}`}>
                    {val}% {isWeak && "⚠️"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Seasonal Performance (v2.0 new section) ──────── */}
        {seasonal && seasonalGap > 5 && (
          <div className="mt-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-amber-800 uppercase tracking-wider">⛅ Seasonal Performance</p>
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
            {seasonal.rainySeasonReliability < 65 && (
              <p className="text-xs text-amber-700 mt-2.5 font-medium">
                ⚠️ Rainy season yield drops to ~{seasonal.worstCaseDailyGenWh.toLocaleString()} Wh/day
                ({seasonal.worstCasePSH} PSH). Add 2 extra panels to maintain strong year-round performance.
              </p>
            )}
          </div>
        )}

        {/* ─── Consequence & Best For ────────────────────────── */}
        <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">⚠️ What This Means</p>
            <p className="text-sm text-slate-800 font-medium">{currentOption.consequenceText}</p>
          </div>
          <div className="flex flex-col gap-1 pt-2 border-t border-slate-200/60">
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">👤 Best For</p>
            <p className="text-sm text-slate-700 font-medium flex gap-2"><span className="text-green-500">✅</span>{currentOption.bestForText}</p>
            <p className="text-sm text-slate-700 font-medium flex gap-2"><span className="text-red-500">❌</span>{currentOption.notIdealForText}</p>
          </div>
        </div>

        {/* ─── Reality Check & Upgrades ──────────────────────── */}
        <div className="mt-3 p-4 rounded-xl bg-blue-50 border border-blue-100 flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <span className="text-base">🧠</span>
            <div>
              <p className="text-xs font-black text-blue-900 uppercase tracking-wider">Reality Check</p>
              <p className="text-sm text-blue-800 mt-1 font-medium">{currentOption.realityCheckText}</p>
            </div>
          </div>
          {currentOption.upgradeProjections && currentOption.upgradeProjections.length > 0 && (
            <div className="flex items-start gap-2 mt-2 pt-3 border-t border-blue-200/50">
              <span className="text-base">💡</span>
              <div className="w-full">
                <p className="text-xs font-black text-blue-900 uppercase tracking-wider">Upgrade Path</p>
                <div className="mt-1 space-y-1">
                  {currentOption.upgradeProjections.map((proj, i) => (
                    <p key={i} className="text-sm text-blue-800 font-bold bg-blue-100/50 px-2 py-1 rounded inline-block w-full">
                      📈 With {proj.action} → ~{proj.projectedScore}% reliability
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Tab Bar ────────────────────────────────────────── */}
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
            {tab === "installers" ? "Installers" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ────────────────────────────────────── */}
      <div className="p-6">
        {activeTab === "overview" && <OverviewTab quote={quote} currentOption={currentOption} colors={colors} />}
        {activeTab === "specs"    && <SpecsTab    quote={quote} currentOption={currentOption} colors={colors} />}
        {activeTab === "pricing"  && <PricingTab  currentOption={currentOption} colors={colors} formatNGN={formatNGN} />}
        {activeTab === "installers" && <InstallersTab quote={quote} pkg={pkg} colors={colors} />}
      </div>

      {/* ─── Footer CTA ─────────────────────────────────────── */}
      <div className="px-6 pb-6 pt-2 bg-white flex flex-col sm:flex-row gap-3">
        <button
          className="flex-1 py-3.5 rounded-xl font-bold text-sm tracking-wide bg-[#008751] hover:bg-[#00683e] text-white transition-all active:scale-[0.98] shadow-md shadow-[#008751]/20"
          onClick={() => window.open(`tel:0800POWER24`)}
        >
          ⚡ Connect to an Installer Now
        </button>
        <button onClick={onReset} className="sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200">
          Start Over
        </button>
      </div>

      {/* ─── Warnings ───────────────────────────────────────── */}
      {quote.warnings && quote.warnings.length > 0 && (
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
        <button onClick={copyRequestId} className="text-xs text-slate-400 hover:text-[#008751] font-mono font-bold transition-colors">
          {copiedId ? "✓ Copied!" : quote.requestId}
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function OverviewTab({ quote, currentOption, colors }: any) {
  const pkg = currentOption.package;
  const profile = quote.loadProfile;
  const stats = [
    { label: "Night Runtime",    value: `~${currentOption.estimatedRuntimeRange} hrs`, icon: "🕒" },
    { label: "Backup Autonomy",  value: `~${currentOption.backupCapacityDays} days`,   icon: "🔋" },
    { label: "Usable Battery",   value: currentOption.batteryUsableWh ? `${(currentOption.batteryUsableWh / 1000).toFixed(1)} kWh` : "—", icon: "⚡" },
    { label: "Inverter",         value: `${pkg.inverter.kva} KVA`,                     icon: "🔌" },
    { label: "Panel Array",      value: `${pkg.panels.reduce((s: number, p: any) => s + p.watts * p.quantity, 0)}W`, icon: "☀️" },
    { label: "Daily Demand",     value: `${(profile.dailyEnergyWh / 1000).toFixed(1)} kWh`,  icon: "📊" },
  ];

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

      {/* Battery DOD callout */}
      {currentOption.batteryDOD && (
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs text-slate-500 font-medium">
          <span className="font-black text-slate-700">Battery chemistry: </span>
          {pkg.batteries[0]?.type?.toUpperCase()} ·{" "}
          <span className="font-black text-slate-700">{Math.round(currentOption.batteryDOD * 100)}% safe DoD</span>
          {" "}· {(currentOption.batteryUsableWh / 1000).toFixed(1)} kWh usable of{" "}
          {((currentOption.batteryUsableWh / currentOption.batteryDOD / 0.92) / 1000).toFixed(1)} kWh gross
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

function SpecsTab({ quote, currentOption, colors }: any) {
  const pkg = currentOption.package;
  const profile = quote.loadProfile;
  const derate = currentOption.systemDerateFactors;

  return (
    <div className="space-y-5 font-mono text-sm">
      <SpecSection title="⚡ Inverter" color={colors.accent}>
        <SpecRow label="Brand / Model"    value={`${pkg.inverter.brand} ${pkg.inverter.model}`} />
        <SpecRow label="Capacity"         value={`${pkg.inverter.kva} KVA`} />
        <SpecRow label="Efficiency"       value={`${pkg.inverter.efficiency}%`} />
        <SpecRow label="Type"             value={pkg.inverter.type} />
      </SpecSection>

      {pkg.batteries.map((batt: any, i: number) => (
        <SpecSection key={i} title="🔋 Battery Bank" color={colors.accent}>
          <SpecRow label="Configuration" value={`${batt.quantity} × ${batt.capacityAh}Ah @ ${batt.voltageV}V`} />
          <SpecRow label="Chemistry"     value={batt.type.toUpperCase()} />
          <SpecRow label="Safe DoD"      value={`${Math.round((currentOption.batteryDOD ?? 0.5) * 100)}%`} />
          <SpecRow label="Usable"        value={`${(currentOption.batteryUsableWh / 1000).toFixed(2)} kWh`} />
          <SpecRow label="Cycle Life"    value={`${batt.cycleLife.toLocaleString()} cycles`} />
        </SpecSection>
      ))}

      {derate && (
        <SpecSection title="📐 System Derate Factors" color={colors.accent}>
          <SpecRow label="Wiring losses"      value={`${Math.round((1 - derate.wiring) * 100)}%`} />
          <SpecRow label="MPPT losses"        value={`${Math.round((1 - derate.mppt) * 100)}%`} />
          <SpecRow label="Temperature derate" value={`${Math.round((1 - derate.temperature) * 100)}%`} />
          <SpecRow label="Soiling / dust"     value={`${Math.round((1 - derate.soiling) * 100)}%`} />
          <SpecRow label="Combined derate"    value={`×${derate.combined}`} />
        </SpecSection>
      )}

      <SpecSection title="🏠 Engineered Load Profile" color={colors.accent}>
        <SpecRow label="Continuous Load"  value={`${profile.continuousLoad}W`} />
        <SpecRow label="Surge (Peak)"     value={`${profile.surgeLoad}W`} />
        <SpecRow label="Daily Energy"     value={`${(profile.dailyEnergyWh / 1000).toFixed(2)} kWh`} />
        <SpecRow label="Diversity Factor" value={`${Math.round((profile.diversityFactor ?? 1) * 100)}%`} />
        <SpecRow label="Target Backup"    value={`${profile.autonomyHours ?? 8} hours`} />
      </SpecSection>
    </div>
  );
}

function SpecSection({ title, color, children }: any) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className={`px-4 py-2.5 bg-slate-50 text-xs font-black ${color} uppercase tracking-wider`}>{title}</div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}
function SpecRow({ label, value }: any) {
  return (
    <div className="flex justify-between px-4 py-3 bg-white">
      <span className="text-slate-500 text-xs font-semibold">{label}</span>
      <span className="text-slate-900 text-xs font-bold text-right">{value}</span>
    </div>
  );
}

function PricingTab({ currentOption, colors, formatNGN }: any) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-slate-50 text-xs font-black text-slate-500 uppercase tracking-wider">
          Itemized Breakdown
        </div>
        <div className="divide-y divide-slate-100">
          {currentOption.lineItems.map((item: any, i: number) => (
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
        <p className="text-base font-black text-slate-900">{formatNGN(currentOption.monthlyPaymentOption)}<span className="text-xs font-medium text-slate-400"> / month for 36 months</span></p>
        <p className="text-xs text-slate-400 mt-1">At 3% monthly interest rate. Subject to credit approval.</p>
      </div>
    </div>
  );
}

function InstallersTab({ quote, pkg, colors }: any) {
  if (!quote.recommendedInstallers?.length) {
    return <p className="text-sm text-slate-500">No installers available in your area yet.</p>;
  }
  return (
    <div className="space-y-4">
      {quote.recommendedInstallers.map((installer: any) => (
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
            </div>
            <div className="text-right">
              <div className={`text-lg font-black ${colors.accent}`}>★ {installer.rating}</div>
              <p className="text-[10px] text-slate-400">{installer.reviewCount} reviews</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}