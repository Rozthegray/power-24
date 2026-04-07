"use client";
// ============================================================
// components/QuoteCard.tsx
// The result panel. Shows tier, specs, price, and installers.
// ============================================================

import { useState } from "react";
import type { QuoteResult } from "@/lib/types";

interface QuoteCardProps {
  quote: QuoteResult;
  onReset: () => void;
}

// ─── Tier color map ───────────────────────────────────────────
const TIER_COLORS: Record<string, { bg: string; accent: string; badge: string }> = {
  "sapa-lite": {
    bg: "from-slate-900 to-slate-800",
    accent: "text-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  "hustler-plus": {
    bg: "from-slate-900 to-amber-950",
    accent: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  "odogwu-premium": {
    bg: "from-slate-900 to-orange-950",
    accent: "text-orange-400",
    badge: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  },
  "oga-boss": {
    bg: "from-slate-900 to-yellow-950",
    accent: "text-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  },
};

const DEFAULT_COLORS = {
  bg: "from-slate-900 to-slate-800",
  accent: "text-amber-400",
  badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

export default function QuoteCard({ quote, onReset }: QuoteCardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "pricing" | "installers">(
    "overview"
  );
  const [copiedId, setCopiedId] = useState(false);

  const colors = TIER_COLORS[quote.selectedPackage.slug] ?? DEFAULT_COLORS;
  const pkg = quote.selectedPackage;

  const formatNGN = (amount: number) =>
    `₦${amount.toLocaleString("en-NG")}`;

  const copyRequestId = async () => {
    await navigator.clipboard.writeText(quote.requestId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className={`w-full rounded-2xl bg-gradient-to-br ${colors.bg} border border-white/10 overflow-hidden shadow-2xl`}>
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="relative px-6 pt-6 pb-5 border-b border-white/10">
        {/* Background solar pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 8px,
              rgba(255,180,0,0.5) 8px,
              rgba(255,180,0,0.5) 9px
            )`,
          }}
        />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-medium mb-3 ${colors.badge}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              POWER 24 QUOTE · {quote.requestId}
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight leading-none">
              {pkg.name}
            </h2>
            <p className="text-sm text-white/60 mt-1.5 font-medium">
              {pkg.tagline}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-3xl font-black ${colors.accent} leading-none`}>
              {formatNGN(quote.totalPriceNGN)}
            </div>
            <div className="text-xs text-white/40 mt-1">
              or {formatNGN(quote.monthlyPaymentOption)}/mo × 36
            </div>
          </div>
        </div>

        {/* Confidence indicator */}
        <div className="relative mt-4 flex items-center gap-3">
          <span className="text-xs text-white/40 shrink-0">Accuracy</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                quote.confidenceScore >= 0.8
                  ? "bg-emerald-400"
                  : quote.confidenceScore >= 0.6
                  ? "bg-amber-400"
                  : "bg-orange-400"
              }`}
              style={{ width: `${quote.confidenceScore * 100}%` }}
            />
          </div>
          <span className={`text-xs font-mono shrink-0 ${colors.accent}`}>
            {Math.round(quote.confidenceScore * 100)}%
          </span>
        </div>
      </div>

      {/* ─── Tab Navigation ─────────────────────────────────── */}
      <div className="flex border-b border-white/10">
        {(["overview", "specs", "pricing", "installers"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-widest transition-all ${
              activeTab === tab
                ? `${colors.accent} border-b-2 border-current`
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ────────────────────────────────────── */}
      <div className="p-6">
        {activeTab === "overview" && (
          <OverviewTab quote={quote} colors={colors} formatNGN={formatNGN} />
        )}
        {activeTab === "specs" && (
          <SpecsTab quote={quote} colors={colors} />
        )}
        {activeTab === "pricing" && (
          <PricingTab quote={quote} colors={colors} formatNGN={formatNGN} />
        )}
        {activeTab === "installers" && (
          <InstallersTab quote={quote} colors={colors} />
        )}
      </div>

      {/* ─── Footer CTA ─────────────────────────────────────── */}
      <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
        <button
          className={`flex-1 py-3.5 rounded-xl font-bold text-sm tracking-wide bg-amber-500 hover:bg-amber-400 text-black transition-all active:scale-[0.98] shadow-lg shadow-amber-500/20`}
          onClick={() => {
            const installer = quote.recommendedInstallers[0];
            if (installer) {
              window.open(`tel:${installer.phone}`);
            }
          }}
        >
          ⚡ Connect to an Installer Now
        </button>
        <button
          onClick={onReset}
          className="sm:w-auto px-5 py-3.5 rounded-xl font-semibold text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/30 transition-all"
        >
          Start Over
        </button>
      </div>

      {/* ─── Warnings ───────────────────────────────────────── */}
      {quote.warnings.length > 0 && (
        <div className="mx-6 mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <p className="text-xs font-semibold text-amber-400 mb-2 uppercase tracking-wider">
            ⚠ Assumptions Made
          </p>
          <ul className="space-y-1">
            {quote.warnings.map((w, i) => (
              <li key={i} className="text-xs text-white/50 flex gap-2">
                <span className="text-amber-500/50 shrink-0">›</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── Request ID footer ──────────────────────────────── */}
      <div className="px-6 pb-4 flex items-center justify-between">
        <span className="text-xs text-white/20 font-mono">
          Generated {new Date(quote.generatedAt).toLocaleString("en-NG")}
        </span>
        <button
          onClick={copyRequestId}
          className="text-xs text-white/30 hover:text-white/60 font-mono transition-colors"
        >
          {copiedId ? "✓ Copied!" : quote.requestId}
        </button>
      </div>
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────────
function OverviewTab({
  quote,
  colors,
  formatNGN,
}: {
  quote: QuoteResult;
  colors: typeof DEFAULT_COLORS;
  formatNGN: (n: number) => string;
}) {
  const pkg = quote.selectedPackage;
  const profile = quote.loadProfile;

  const stats = [
    {
      label: "Continuous Load",
      value: `${(profile.continuousLoad / 1000).toFixed(1)} kW`,
      icon: "⚡",
    },
    {
      label: "Peak Surge",
      value: `${(profile.surgeLoad / 1000).toFixed(1)} kW`,
      icon: "🔋",
    },
    {
      label: "Daily Demand",
      value: `${(profile.dailyEnergyWh / 1000).toFixed(1)} kWh`,
      icon: "☀️",
    },
    {
      label: "Inverter",
      value: `${pkg.inverter.kva} KVA`,
      icon: "🔌",
    },
    {
      label: "Panel Array",
      value: `${pkg.panels.reduce((s, p) => s + p.watts * p.quantity, 0)}W`,
      icon: "☀",
    },
    {
      label: "Warranty",
      value: `${pkg.warrantyYears} Years`,
      icon: "🛡",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl bg-white/5 border border-white/8 p-3"
          >
            <div className="text-lg mb-1">{stat.icon}</div>
            <div className={`text-base font-black ${colors.accent}`}>{stat.value}</div>
            <div className="text-xs text-white/40 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
          What&apos;s Included
        </h3>
        <ul className="space-y-2">
          {pkg.includes.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-white/70">
              <span className={`shrink-0 mt-0.5 ${colors.accent}`}>✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
          Your Appliances ({quote.appliances.length} types)
        </h3>
        <div className="flex flex-wrap gap-2">
          {quote.appliances.map((a, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60"
            >
              <span className="font-semibold text-white/80">{a.quantity}×</span>
              {a.name}
              <span className="text-white/30">·</span>
              <span className="text-white/40">{a.unitWatts}W</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Specs Tab ───────────────────────────────────────────────
function SpecsTab({ quote, colors }: { quote: QuoteResult; colors: typeof DEFAULT_COLORS }) {
  const pkg = quote.selectedPackage;
  const profile = quote.loadProfile;

  return (
    <div className="space-y-5 font-mono text-sm">
      <SpecSection title="⚡ Inverter" color={colors.accent}>
        <SpecRow label="Brand / Model" value={`${pkg.inverter.brand} ${pkg.inverter.model}`} />
        <SpecRow label="Capacity" value={`${pkg.inverter.kva} KVA`} />
        <SpecRow label="Type" value={pkg.inverter.type.replace("-", " ").toUpperCase()} />
        <SpecRow label="Efficiency" value={`${pkg.inverter.efficiency}%`} />
      </SpecSection>

      {pkg.batteries.map((batt, i) => (
        <SpecSection key={i} title="🔋 Battery Bank" color={colors.accent}>
          <SpecRow label="Brand / Model" value={`${batt.brand} ${batt.model}`} />
          <SpecRow label="Type" value={batt.type.toUpperCase()} />
          <SpecRow label="Configuration" value={`${batt.quantity} × ${batt.capacityAh}Ah @ ${batt.voltageV}V`} />
          <SpecRow label="Total Capacity" value={`${batt.capacityAh * (batt.voltageV >= 48 ? batt.quantity : 1)}Ah @ 48V`} />
          <SpecRow label="Cycle Life" value={`${batt.cycleLife.toLocaleString()} cycles`} />
        </SpecSection>
      ))}

      {pkg.panels.map((panel, i) => (
        <SpecSection key={i} title="☀ Solar Array" color={colors.accent}>
          <SpecRow label="Brand / Model" value={`${panel.brand} ${panel.model}`} />
          <SpecRow label="Type" value={panel.type.toUpperCase()} />
          <SpecRow label="Panel Count" value={`${panel.quantity} × ${panel.watts}W`} />
          <SpecRow label="Total Array" value={`${panel.watts * panel.quantity}W (${(panel.watts * panel.quantity / 1000).toFixed(1)} kWp)`} />
        </SpecSection>
      ))}

      <SpecSection title="📐 Load Profile" color={colors.accent}>
        <SpecRow label="Continuous Load" value={`${profile.continuousLoad}W`} />
        <SpecRow label="Surge (Peak)" value={`${profile.surgeLoad}W`} />
        <SpecRow label="Daily Energy" value={`${profile.dailyEnergyWh.toFixed(0)} Wh`} />
        <SpecRow label="Buffered (×1.3)" value={`${profile.bufferedEnergyWh.toFixed(0)} Wh`} />
        <SpecRow label="Peak Sun Hours" value={`${profile.peakSunHours}h/day`} />
        <SpecRow label="Required Panels" value={`≥${profile.requiredPanelWatts}W`} />
        <SpecRow label="Required Battery" value={`≥${profile.requiredBatteryAh}Ah@48V`} />
      </SpecSection>
    </div>
  );
}

function SpecSection({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <div className={`px-4 py-2.5 bg-white/5 text-xs font-bold ${color} uppercase tracking-wider`}>
        {title}
      </div>
      <div className="divide-y divide-white/5">{children}</div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-2.5">
      <span className="text-white/40 text-xs">{label}</span>
      <span className="text-white/80 text-xs font-semibold">{value}</span>
    </div>
  );
}

// ─── Pricing Tab ─────────────────────────────────────────────
function PricingTab({
  quote,
  colors,
  formatNGN,
}: {
  quote: QuoteResult;
  colors: typeof DEFAULT_COLORS;
  formatNGN: (n: number) => string;
}) {
  const categories = ["hardware", "installation", "warranty", "misc"] as const;
  const categoryLabels: Record<string, string> = {
    hardware: "Hardware",
    installation: "Installation",
    warranty: "Warranty & Support",
    misc: "Other",
  };

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const items = quote.lineItems.filter((i) => i.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="rounded-xl border border-white/10 overflow-hidden">
            <div className="px-4 py-2.5 bg-white/5 text-xs font-bold text-white/40 uppercase tracking-wider">
              {categoryLabels[cat]}
            </div>
            <div className="divide-y divide-white/5">
              {items.map((item, i) => (
                <div key={i} className="px-4 py-3 flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 leading-relaxed">{item.description}</p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-white/30 mt-0.5">
                        {item.quantity} × {formatNGN(item.unitPrice)}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-white/80 shrink-0">
                    {formatNGN(item.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Total */}
      <div className={`rounded-xl border ${colors.badge.includes("emerald") ? "border-emerald-500/30" : colors.badge.includes("amber") ? "border-amber-500/30" : "border-orange-500/30"} p-4 flex justify-between items-center`}>
        <div>
          <p className="text-white/60 text-xs">Total Investment</p>
          <p className="text-white/30 text-xs mt-0.5">
            or {formatNGN(quote.monthlyPaymentOption)}/month for 36 months
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
function InstallersTab({
  quote,
  colors,
}: {
  quote: QuoteResult;
  colors: typeof DEFAULT_COLORS;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40">
        These NAESCO-certified partners are available to install your{" "}
        <span className="text-white/70">{quote.selectedPackage.name}</span> system.
      </p>
      {quote.recommendedInstallers.map((installer) => (
        <div
          key={installer.id}
          className="rounded-xl border border-white/10 p-4 hover:border-white/20 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white text-sm">{installer.name}</h4>
              <p className="text-xs text-white/40 mt-0.5">
                {installer.city}, {installer.state}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {installer.certifications.map((cert) => (
                  <span
                    key={cert}
                    className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50"
                  >
                    {cert}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-lg font-black ${colors.accent}`}>
                ★ {installer.rating}
              </div>
              <div className="text-xs text-white/30">{installer.reviewCount} reviews</div>
            </div>
          </div>
          <a
            href={`tel:${installer.phone}`}
            className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/70 hover:text-white font-medium transition-all"
          >
            📞 {installer.phone}
          </a>
        </div>
      ))}
    </div>
  );
}
