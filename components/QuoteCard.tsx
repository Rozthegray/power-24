"use client";
import { useState } from "react";
import type { QuoteResult, RankedPackage } from "@/lib/types";

interface QuoteCardProps {
  quote: QuoteResult;
  onReset: () => void;
}

const TIER_COLORS: Record<string, { bg: string; accent: string; badge: string }> = {
  "sapa-lite": { bg: "bg-white", accent: "text-[#008751]", badge: "bg-green-50 text-[#008751] border-green-200" },
  "hustler-plus": { bg: "bg-white", accent: "text-[#008751]", badge: "bg-green-50 text-[#008751] border-green-200" },
  "odogwu-premium": { bg: "bg-orange-50/30", accent: "text-orange-600", badge: "bg-orange-100 text-orange-700 border-orange-200" },
  "oga-boss": { bg: "bg-red-50/30", accent: "text-red-600", badge: "bg-red-100 text-red-700 border-red-200" },
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

  return (
    <div className={`w-full rounded-2xl ${colors.bg} border border-slate-200 overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,135,81,0.15)] font-sans transition-colors duration-300`}>
      
      {/* ─── Package Selector Pills ───────────────────────────── */}
      {quote.options.length > 1 && (
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2">
          {quote.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedOptionIdx(idx)}
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
              Tested for Nigeria Reality Factor (1.3x)
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

        {/* ─── Reliability Score & Consequence ──────────────── */}
        <div className="mt-5 p-4 rounded-xl border border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-black text-slate-700">System Reliability</span>
            <span className={`text-sm font-black ${
              currentOption.reliabilityScore >= 80 ? "text-green-600" : currentOption.reliabilityScore >= 60 ? "text-yellow-600" : "text-red-500"
            }`}>
              {currentOption.reliabilityScore}% {currentOption.reliabilityScore >= 80 ? "(High)" : currentOption.reliabilityScore >= 60 ? "(Medium)" : "(Fragile)"}
            </span>
          </div>
          <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-slate-200 w-full mb-3">
            <div className={`h-full transition-all duration-700 ${currentOption.reliabilityScore >= 80 ? "bg-green-500" : currentOption.reliabilityScore >= 60 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${currentOption.reliabilityScore}%` }} />
          </div>
          
          <div className="grid grid-cols-4 gap-2 text-center mt-4 pt-4 border-t border-slate-200">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Load</p>
              <p className="text-xs font-black text-slate-700">{currentOption.scoreBreakdown.load}%</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Battery</p>
              <p className={`text-xs font-black ${currentOption.scoreBreakdown.battery < 60 ? 'text-red-500' : 'text-slate-700'}`}>
                {currentOption.scoreBreakdown.battery}% {currentOption.scoreBreakdown.battery < 60 && '⚠️'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Solar</p>
              <p className={`text-xs font-black ${currentOption.scoreBreakdown.solar < 80 ? 'text-red-500' : 'text-slate-700'}`}>
                {currentOption.scoreBreakdown.solar}% {currentOption.scoreBreakdown.solar < 80 && '⚠️'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Surge</p>
              <p className="text-xs font-black text-slate-700">{currentOption.scoreBreakdown.surge}%</p>
            </div>
          </div>
        </div>

        {/* ─── What This Means & Best For ────────────────────── */}
        <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
          <div>
             <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">⚠️ What This Means</p>
             <p className="text-sm text-slate-800 font-medium">{currentOption.consequenceText}</p>
          </div>
          <div className="flex flex-col gap-1 pt-2 border-t border-slate-200/60">
             <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">👤 Best For</p>
             <p className="text-sm text-slate-700 font-medium flex gap-2"><span className="text-green-500">✅</span> {currentOption.bestForText}</p>
             <p className="text-sm text-slate-700 font-medium flex gap-2"><span className="text-red-500">❌</span> {currentOption.notIdealForText}</p>
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

      {/* ─── Tab Navigation ─────────────────────────────────── */}
      <div className="flex border-b border-slate-200 bg-slate-50/50">
        {(["overview", "specs", "pricing", "installers"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === tab ? `${colors.accent} border-b-2 border-current bg-white` : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-6 bg-white">
        {activeTab === "overview" && <OverviewTab quote={quote} currentOption={currentOption} colors={colors} />}
        {activeTab === "specs" && <SpecsTab quote={quote} currentOption={currentOption} colors={colors} />}
        {activeTab === "pricing" && <PricingTab currentOption={currentOption} colors={colors} formatNGN={formatNGN} />}
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
              <li key={i} className="text-xs text-orange-700/80 flex gap-2"><span className="text-orange-400 shrink-0 mt-0.5">›</span>{w}</li>
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
    { label: "Night Runtime", value: `~${currentOption.estimatedRuntimeRange} hrs`, icon: "🕒" },
    { label: "Backup Autonomy", value: `~${currentOption.backupCapacityDays} days`, icon: "🔋" },
    { label: "Peak Surge", value: `${(profile.surgeLoad / 1000).toFixed(1)} kW`, icon: "⚡" },
    { label: "Inverter", value: `${pkg.inverter.kva} KVA`, icon: "🔌" },
    { label: "Panel Array", value: `${pkg.panels.reduce((s:number, p:any) => s + p.watts * p.quantity, 0)}W`, icon: "☀" },
    { label: "Daily Demand", value: `${(profile.dailyEnergyWh / 1000).toFixed(1)} kWh`, icon: "⚡" },
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
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">What's Included</h3>
        <ul className="space-y-2.5">
          {pkg.includes.map((item:string, i:number) => (
            <li key={i} className="flex gap-3 text-sm text-slate-600 font-medium"><span className={`shrink-0 mt-0.5 ${colors.accent}`}>✓</span>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SpecsTab({ quote, currentOption, colors }: any) {
  const pkg = currentOption.package;
  const profile = quote.loadProfile;
  return (
    <div className="space-y-5 font-mono text-sm">
      <SpecSection title="⚡ Inverter" color={colors.accent}>
        <SpecRow label="Brand / Model" value={`${pkg.inverter.brand} ${pkg.inverter.model}`} />
        <SpecRow label="Capacity" value={`${pkg.inverter.kva} KVA`} />
      </SpecSection>
      {pkg.batteries.map((batt:any, i:number) => (
        <SpecSection key={i} title="🔋 Battery Bank" color={colors.accent}>
          <SpecRow label="Configuration" value={`${batt.quantity} × ${batt.capacityAh}Ah @ ${batt.voltageV}V`} />
          <SpecRow label="Type" value={batt.type.toUpperCase()} />
        </SpecSection>
      ))}
      <SpecSection title="📐 Engineered Load Profile" color={colors.accent}>
        <SpecRow label="Continuous Load" value={`${profile.continuousLoad}W`} />
        <SpecRow label="Surge (Peak)" value={`${profile.surgeLoad}W`} />
        <SpecRow label="Daily Energy" value={`${profile.dailyEnergyWh.toFixed(0)} Wh`} />
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
    <div className="flex justify-between px-4 py-3 bg-white"><span className="text-slate-500 text-xs font-semibold">{label}</span><span className="text-slate-900 text-xs font-bold text-right">{value}</span></div>
  );
}

function PricingTab({ currentOption, colors, formatNGN }: any) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-slate-50 text-xs font-black text-slate-500 uppercase tracking-wider">Itemized Breakdown</div>
        <div className="divide-y divide-slate-100">
          {currentOption.lineItems.map((item:any, i:number) => (
            <div key={i} className="px-4 py-3.5 flex justify-between items-start gap-4 bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 font-semibold">{item.description}</p>
                {item.quantity > 1 && <p className="text-xs text-slate-400 mt-1 font-mono font-medium">{item.quantity} × {formatNGN(item.unitPrice)}</p>}
              </div>
              <span className="text-sm font-black text-slate-900 shrink-0">{formatNGN(item.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InstallersTab({ quote, pkg, colors }: any) {
  if (!quote.recommendedInstallers?.length) return <p className="text-sm text-slate-500">No installers available in your area yet.</p>;
  return (
    <div className="space-y-4">
      {quote.recommendedInstallers.map((installer:any) => (
        <div key={installer.id} className="rounded-xl border border-slate-200 p-5 bg-white shadow-sm">
          <div className="flex justify-between gap-3">
            <div>
              <h4 className="font-black text-slate-900 text-base">{installer.name}</h4>
              <p className="text-xs text-slate-500 mt-1 font-medium">📍 {installer.city}, {installer.state}</p>
            </div>
            <div className="text-right">
              <div className={`text-lg font-black ${colors.accent}`}>★ {installer.rating}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}