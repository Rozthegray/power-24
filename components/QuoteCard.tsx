"use client";
// ============================================================
// components/QuoteCard.tsx
// The result panel. Shows tier, specs, price, and installers.
// Updated for Naija-Solar Light Mode & Strict Types
// ============================================================

import { useState } from "react";
import type { QuoteResult } from "@/lib/types";

interface QuoteCardProps {
  quote: QuoteResult;
  onReset: () => void;
}

// ─── Light Mode Tier color map ────────────────────────────────
const TIER_COLORS: Record<string, { bg: string; accent: string; badge: string }> = {
  "sapa-lite": {
    bg: "bg-white",
    accent: "text-[#008751]", // Naija Green
    badge: "bg-green-50 text-[#008751] border-green-200",
  },
  "hustler-plus": {
    bg: "bg-white",
    accent: "text-[#008751]",
    badge: "bg-green-50 text-[#008751] border-green-200",
  },
  "odogwu-premium": {
    bg: "bg-orange-50/30",
    accent: "text-orange-600",
    badge: "bg-orange-100 text-orange-700 border-orange-200",
  },
  "oga-boss": {
    bg: "bg-red-50/30",
    accent: "text-red-600",
    badge: "bg-red-100 text-red-700 border-red-200",
  },
};

const DEFAULT_COLORS = {
  bg: "bg-white",
  accent: "text-[#008751]",
  badge: "bg-green-50 text-[#008751] border-green-200",
};

export default function QuoteCard({ quote, onReset }: QuoteCardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "pricing" | "installers">("overview");
  const [copiedId, setCopiedId] = useState(false);

  // Safety checks
  if (!quote || !quote.selectedPackage || !quote.loadProfile) return null;

  const pkg = quote.selectedPackage;
  const colors = TIER_COLORS[pkg.slug] ?? DEFAULT_COLORS;

  const formatNGN = (amount?: number) =>
    amount ? `₦${amount.toLocaleString("en-NG")}` : "₦0";

  const copyRequestId = async () => {
    if (quote.requestId) {
      await navigator.clipboard.writeText(quote.requestId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className={`w-full rounded-2xl ${colors.bg} border border-slate-200 overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,135,81,0.15)] font-sans`}>
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="relative px-6 pt-6 pb-5 border-b border-slate-200 bg-white">
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-bold mb-3 ${colors.badge}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              POWER 24 QUOTE · {quote.requestId}
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none" style={{ fontFamily: "'Syne', sans-serif" }}>
              {pkg.name}
            </h2>
            <p className="text-sm text-slate-500 mt-2 font-medium">
              Optimized for your exact load profile
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-3xl font-black ${colors.accent} leading-none`}>
              {formatNGN(quote.totalPriceNGN)}
            </div>
            <div className="text-xs text-slate-400 mt-1.5 font-bold">
              or {formatNGN(quote.monthlyPaymentOption)}/mo × 36
            </div>
          </div>
        </div>

        {/* Confidence indicator */}
        <div className="relative mt-5 flex items-center gap-3">
          <span className="text-xs text-slate-400 font-bold shrink-0">AI Accuracy</span>
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                (quote.confidenceScore ?? 0) >= 0.8
                  ? "bg-[#008751]"
                  : (quote.confidenceScore ?? 0) >= 0.6
                  ? "bg-orange-400"
                  : "bg-red-400"
              }`}
              style={{ width: `${(quote.confidenceScore ?? 0) * 100}%` }}
            />
          </div>
          <span className={`text-xs font-mono font-bold shrink-0 ${colors.accent}`}>
            {Math.round((quote.confidenceScore ?? 0) * 100)}%
          </span>
        </div>
      </div>

      {/* ─── Tab Navigation ─────────────────────────────────── */}
      <div className="flex border-b border-slate-200 bg-slate-50/50">
        {(["overview", "specs", "pricing", "installers"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === tab
                ? `${colors.accent} border-b-2 border-current bg-white`
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ────────────────────────────────────── */}
      <div className="p-6 bg-white">
        {activeTab === "overview" && <OverviewTab quote={quote} colors={colors} formatNGN={formatNGN} />}
        {activeTab === "specs" && <SpecsTab quote={quote} colors={colors} />}
        {activeTab === "pricing" && <PricingTab quote={quote} colors={colors} formatNGN={formatNGN} />}
        {activeTab === "installers" && <InstallersTab quote={quote} colors={colors} />}
      </div>

      {/* ─── Footer CTA ─────────────────────────────────────── */}
      <div className="px-6 pb-6 pt-2 bg-white flex flex-col sm:flex-row gap-3">
        <button
          className={`flex-1 py-3.5 rounded-xl font-bold text-sm tracking-wide bg-[#008751] hover:bg-[#00683e] text-white transition-all active:scale-[0.98] shadow-md shadow-[#008751]/20`}
          onClick={() => {
            const installer = quote.recommendedInstallers?.[0];
            if (installer) {
              window.open(`tel:0800POWER24`); // Fallback demo phone
            }
          }}
        >
          ⚡ Connect to an Installer Now
        </button>
        <button
          onClick={onReset}
          className="sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all"
        >
          Start Over
        </button>
      </div>

      {/* ─── Warnings ───────────────────────────────────────── */}
      {quote.warnings && quote.warnings.length > 0 && (
        <div className="mx-6 mb-6 p-4 rounded-xl bg-orange-50 border border-orange-100">
          <p className="text-xs font-bold text-orange-600 mb-2 uppercase tracking-wider">
            ⚠ Engineering Notes
          </p>
          <ul className="space-y-1">
            {quote.warnings.map((w, i) => (
              <li key={i} className="text-xs text-orange-700/80 flex gap-2">
                <span className="text-orange-400 shrink-0 mt-0.5">›</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── Request ID footer ──────────────────────────────── */}
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

// ─── Overview Tab ────────────────────────────────────────────
function OverviewTab({ quote, colors }: { quote: QuoteResult; colors: typeof DEFAULT_COLORS; formatNGN: (n?: number) => string }) {
  const pkg = quote.selectedPackage!;
  const profile = quote.loadProfile!;

  const stats = [
    { label: "Continuous Load", value: `${(profile.continuousLoad / 1000).toFixed(1)} kW`, icon: "⚡" },
    { label: "Peak Surge", value: `${(profile.surgeLoad / 1000).toFixed(1)} kW`, icon: "🔋" },
    { label: "Daily Demand", value: `${(profile.dailyEnergyWh / 1000).toFixed(1)} kWh`, icon: "☀️" },
    { label: "Inverter", value: `${pkg.inverter.kva} KVA`, icon: "🔌" },
    { label: "Panel Array", value: `${pkg.panels.reduce((s, p) => s + p.watts * p.quantity, 0)}W`, icon: "☀" },
    { label: "Warranty", value: `${pkg.warrantyYears} Years`, icon: "🛡" },
  ];

  // Dynamically build the includes list since it's not in the type
  const includesList = [
    `${pkg.inverter.kva}KVA ${pkg.inverter.brand} Hybrid Inverter`,
    `${pkg.batteries[0].capacityAh}Ah ${pkg.batteries[0].type.toUpperCase()} Battery Backup`,
    `${pkg.panels[0].watts}W High-Efficiency Solar Panels`,
    `Professional Installation`,
    `${pkg.warrantyYears}-Year Maintenance Warranty`
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
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          What's Included
        </h3>
        <ul className="space-y-2.5">
          {includesList.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-600 font-medium">
              <span className={`shrink-0 mt-0.5 ${colors.accent}`}>✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {quote.appliances && quote.appliances.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Covered Appliances ({quote.appliances.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {quote.appliances.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 shadow-sm">
                <span className="font-black text-slate-900">{a.quantity}×</span>
                {a.name}
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-mono font-medium">{a.unitWatts}W</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Specs Tab ───────────────────────────────────────────────
function SpecsTab({ quote, colors }: { quote: QuoteResult; colors: typeof DEFAULT_COLORS }) {
  const pkg = quote.selectedPackage!;
  const profile = quote.loadProfile!;

  return (
    <div className="space-y-5 font-mono text-sm">
      <SpecSection title="⚡ Inverter" color={colors.accent}>
        <SpecRow label="Brand / Model" value={`${pkg.inverter.brand} ${pkg.inverter.model}`} />
        <SpecRow label="Capacity" value={`${pkg.inverter.kva} KVA`} />
        <SpecRow label="Type" value="Hybrid Pure Sine Wave" />
      </SpecSection>

      {pkg.batteries.map((batt, i) => (
        <SpecSection key={i} title="🔋 Battery Bank" color={colors.accent}>
          <SpecRow label="Brand / Model" value={`${batt.brand} ${batt.model}`} />
          <SpecRow label="Type" value={batt.type.toUpperCase()} />
          <SpecRow label="Configuration" value={`${batt.quantity} × ${batt.capacityAh}Ah @ ${batt.voltageV}V`} />
          <SpecRow label="Total Capacity" value={`${batt.capacityAh * (batt.voltageV >= 48 ? batt.quantity : 1)}Ah @ 48V`} />
        </SpecSection>
      ))}

      {pkg.panels.map((panel, i) => (
        <SpecSection key={i} title="☀ Solar Array" color={colors.accent}>
          <SpecRow label="Brand" value={panel.brand} />
          <SpecRow label="Type" value={panel.type.toUpperCase()} />
          <SpecRow label="Panel Count" value={`${panel.quantity} × ${panel.watts}W`} />
          <SpecRow label="Total Array" value={`${panel.watts * panel.quantity}W (${(panel.watts * panel.quantity / 1000).toFixed(1)} kWp)`} />
        </SpecSection>
      ))}

      <SpecSection title="📐 Engineered Load Profile" color={colors.accent}>
        <SpecRow label="Continuous Load" value={`${profile.continuousLoad}W`} />
        <SpecRow label="Surge (Peak)" value={`${profile.surgeLoad}W`} />
        <SpecRow label="Daily Energy" value={`${profile.dailyEnergyWh.toFixed(0)} Wh`} />
        <SpecRow label="Buffered (×1.3)" value={`${profile.bufferedEnergyWh.toFixed(0)} Wh`} />
        <SpecRow label="Peak Sun Hours" value={`${profile.peakSunHours}h/day`} />
      </SpecSection>
    </div>
  );
}

function SpecSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className={`px-4 py-2.5 bg-slate-50 text-xs font-black ${color} uppercase tracking-wider`}>
        {title}
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 bg-white">
      <span className="text-slate-500 text-xs font-semibold">{label}</span>
      <span className="text-slate-900 text-xs font-bold text-right">{value}</span>
    </div>
  );
}

// ─── Pricing Tab ─────────────────────────────────────────────
function PricingTab({ quote, colors, formatNGN }: { quote: QuoteResult; colors: typeof DEFAULT_COLORS; formatNGN: (n?: number) => string }) {
  const categories = ["hardware", "installation", "warranty", "misc"] as const;
  const categoryLabels: Record<string, string> = {
    hardware: "Hardware",
    installation: "Installation",
    warranty: "Warranty & Support",
    misc: "Other",
  };

  return (
    <div className="space-y-5">
      {categories.map((cat) => {
        const items = quote.lineItems?.filter((i) => i.category === cat) || [];
        if (items.length === 0) return null;
        return (
          <div key={cat} className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 bg-slate-50 text-xs font-black text-slate-500 uppercase tracking-wider">
              {categoryLabels[cat]}
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((item, i) => (
                <div key={i} className="px-4 py-3.5 flex justify-between items-start gap-4 bg-white">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 font-semibold">{item.description}</p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-slate-400 mt-1 font-mono font-medium">
                        {item.quantity} × {formatNGN(item.unitPrice)}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-black text-slate-900 shrink-0">
                    {formatNGN(item.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Total */}
      <div className={`rounded-xl border-2 p-5 flex justify-between items-center bg-slate-50 ${
        colors.badge.includes("green") ? "border-green-200" : colors.badge.includes("orange") ? "border-orange-200" : "border-red-200"
      }`}>
        <div>
          <p className="text-slate-600 text-xs font-bold uppercase tracking-wider">Total Investment</p>
          <p className="text-slate-400 text-xs mt-1 font-semibold">
            or {formatNGN(quote.monthlyPaymentOption)}/mo for 36 mos
          </p>
        </div>
        <p className={`text-2xl font-black ${colors.accent}`}>
          {formatNGN(quote.totalPriceNGN)}
        </p>
      </div>
    </div>
  );
}

// ─── Installers Tab ───────────────────────────────────────────
function InstallersTab({ quote, colors }: { quote: QuoteResult; colors: typeof DEFAULT_COLORS }) {
  if (!quote.recommendedInstallers || quote.recommendedInstallers.length === 0) {
    return <p className="text-sm text-slate-500">No installers available in your area yet.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 font-medium">
        These NAESCO-certified partners are available to install your <span className="font-bold text-slate-800">{quote.selectedPackage!.name}</span>.
      </p>
      {quote.recommendedInstallers.map((installer) => (
        <div key={installer.id} className="rounded-xl border border-slate-200 p-5 hover:border-[#008751]/50 transition-colors bg-white shadow-sm hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-slate-900 text-base">{installer.name}</h4>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                📍 {installer.city}, {installer.state}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {installer.certifications.map((cert) => (
                  <span key={cert} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    {cert}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-lg font-black ${colors.accent}`}>
                ★ {installer.rating}
              </div>
              <div className="text-xs text-slate-400 font-semibold">{installer.reviewCount} reviews</div>
            </div>
          </div>
          <a
            href={`tel:${installer.phone.replace(/\s+/g, '')}`}
            className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-50 hover:bg-green-50 border border-slate-200 text-sm text-slate-600 hover:text-[#008751] font-bold transition-all"
          >
            📞 Contact Installer
          </a>
        </div>
      ))}
    </div>
  );
}
}