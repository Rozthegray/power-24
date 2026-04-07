"use client";
// ============================================================
// app/page.tsx
// Power 24 — Main Interface
// Aesthetic: Naija-Solar (Clean White, Deep Green, Vibrant Orange)
// Font: Clash Display (bold geometric) + IBM Plex Mono (specs).
// ============================================================

import { useState, useRef, useEffect } from "react";
import QuoteCard from "@/components/QuoteCard";
import type { QuoteResponse } from "@/lib/types";

// ─── Example prompts shown to the user ──────────────────────
const EXAMPLE_PROMPTS = [
  "I want to power 4 LED bulbs, 2 standing fans, a 43-inch TV, DSTV decoder, and a small chest freezer for about 12 hours a day",
  "My house needs: fridge, 2 ACs in the bedrooms (1HP each), 6 lights, a water pump, and all my phone chargers running overnight",
  "Small salon — 3 hair dryers, 4 LED lights, a TV, 2 fans, and a laptop. About 10 hours daily",
  "Power my 3-bedroom flat: fridge, deep freezer, 1.5HP split AC, 8 bulbs, 3 fans, TV, decoder, router, and 4 phone chargers",
];

const SUGGESTIONS = [
  "LED bulbs", "Standing fans", "Fridge", "Chest freezer",
  "TV + DSTV", "Water pump", "Split AC (1HP)", "Laptop",
  "Phone chargers", "Security lights", "CCTV cameras", "Pressing iron",
];

export default function HomePage() {
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);
  const [loadingStep, setLoadingStep] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const LOADING_STEPS = [
    "Reading your appliance list…",
    "Calculating surge loads & wattages…",
    "Sizing panels and batteries…",
    "Selecting your optimal package…",
    "Building your quote…",
  ];

  // Cycle through loading steps
  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 1200);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Auto-scroll to results
  useEffect(() => {
    if (quote?.success && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [quote]);

  const handleSubmit = async () => {
    if (!description.trim() || description.trim().length < 10) {
      setError("Please describe your appliances in more detail.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setQuote(null);

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          location: location.trim() || undefined,
        }),
      });

      const data: QuoteResponse = await res.json();
      setQuote(data);

      if (!data.success) {
        setError(data.error);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setQuote(null);
    setError(null);
    setDescription("");
    setLocation("");
    textareaRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const useExample = (example: string) => {
    setDescription(example);
    setCharCount(example.length);
    textareaRef.current?.focus();
  };

  const appendSuggestion = (suggestion: string) => {
    const newDesc = description
      ? `${description.trim()}, ${suggestion.toLowerCase()}`
      : suggestion;
    setDescription(newDesc);
    setCharCount(newDesc.length);
    textareaRef.current?.focus();
  };

  return (
    <>
      {/* ── Global fonts & Light Mode CSS ────────────────────── */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Syne:wght@400;600;700;800&display=swap');

        :root {
          --naija-green: #008751;
          --solar-orange: #F97316;
          --bg-main: #FAFAFA;
          --text-main: #0F172A;
        }

        * { box-sizing: border-box; }

        html {
          background: var(--bg-main);
          color: var(--text-main);
          font-family: 'Syne', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .font-mono { font-family: 'IBM Plex Mono', monospace; }

        /* Sun rays & Animations */
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes rotate-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.02); }
        }

        @keyframes float-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .animate-float-0 { animation: float-up 0.6s ease forwards; }
        .animate-float-1 { animation: float-up 0.6s 0.1s ease forwards; opacity: 0; }
        .animate-float-2 { animation: float-up 0.6s 0.2s ease forwards; opacity: 0; }
        .animate-float-3 { animation: float-up 0.6s 0.3s ease forwards; opacity: 0; }

        .loading-shimmer {
          background: linear-gradient(90deg, transparent 25%, rgba(0, 135, 81, 0.05) 50%, transparent 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        textarea {
          resize: none;
          outline: none;
        }

        textarea:focus {
          box-shadow: 0 0 0 1px rgba(0, 135, 81, 0.3), 0 0 30px rgba(0, 135, 81, 0.05);
        }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--bg-main); }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
      `}</style>

      <div className="min-h-screen bg-[#FAFAFA] relative overflow-x-hidden">
        {/* ── Ambient background (Light Mode) ──────────────────────────── */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Large orange sun glow at the top */}
          <div
            className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(249,115,22,0.1) 0%, rgba(249,115,22,0.02) 40%, transparent 70%)",
              animation: "pulse-glow 8s ease-in-out infinite",
            }}
          />
          {/* Subtle Green Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,135,81,0.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,135,81,0.08) 1px, transparent 1px)
              `,
              backgroundSize: "60px 60px",
            }}
          />
          {/* Bottom vignette */}
          <div
            className="absolute bottom-0 left-0 right-0 h-48"
            style={{
              background: "linear-gradient(to top, #FAFAFA, transparent)",
            }}
          />
        </div>

        {/* ── Navigation ──────────────────────────────────── */}
        <nav className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 border-b border-slate-200 bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Naija-Solar logo mark */}
            <div className="relative w-8 h-8">
              <div
                className="absolute inset-0"
                style={{
                  background: "conic-gradient(from 0deg, #008751, #F97316, #008751, #F97316, #008751)",
                  borderRadius: "50%",
                  animation: "rotate-slow 20s linear infinite",
                }}
              />
              <div className="absolute inset-[3px] bg-white rounded-full" />
              <div className="absolute inset-[6px] rounded-full bg-[#008751]" />
            </div>
            <span
              className="text-xl font-black tracking-tight text-slate-900"
              style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}
            >
              Power<span className="text-[#008751]">24</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#008751] animate-pulse" />
              System Online
            </span>
            <a
              href="tel:+2348012345678"
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#008751] hover:border-[#008751] hover:bg-green-50 transition-all font-mono bg-white"
            >
              📞 Talk to an Expert
            </a>
          </div>
        </nav>

        {/* ── Hero Section ────────────────────────────────── */}
        <section className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 pt-16 pb-10">
          {/* Badge */}
          <div className="animate-float-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-[#008751]/20 text-xs font-mono text-[#008751] mb-8 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#008751] animate-pulse" />
            AI-POWERED SOLAR SIZING FOR NIGERIA
          </div>

          {/* Headline */}
          <h1
            className="animate-float-1 text-5xl md:text-7xl font-black text-slate-900 leading-[0.95] tracking-tight mb-6"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Tell us what
            <br />
            you want to
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #008751, #F97316)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              power.
            </span>
          </h1>

          <p className="animate-float-2 text-slate-600 text-lg md:text-xl leading-relaxed max-w-xl">
            Describe your appliances in plain English.
            Our AI engineer calculates the exact solar system you need —
            with real NGN pricing, instantly.
          </p>

          {/* Trust badges */}
          <div className="animate-float-3 flex flex-wrap gap-4 mt-7">
            {[
              "⚡ Surge-load aware",
              "🏠 Nigerian homes",
              "₦ Real Naira prices",
              "🔋 Battery-first design",
            ].map((badge) => (
              <span key={badge} className="text-xs text-slate-500 font-mono bg-white px-2 py-1 rounded-md border border-slate-200">
                {badge}
              </span>
            ))}
          </div>
        </section>

        {/* ── Main Form ───────────────────────────────────── */}
        {!quote?.success && (
          <section className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 pb-20">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,135,81,0.1)]">
              {/* Form header */}
              <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                  Describe Your Appliances
                </h2>
                <span
                  className={`text-xs font-mono ${
                    charCount > 1800
                      ? "text-red-500"
                      : charCount > 1500
                      ? "text-orange-500"
                      : "text-slate-400"
                  }`}
                >
                  {charCount}/2000
                </span>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setCharCount(e.target.value.length);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleSubmit();
                    }
                  }}
                  placeholder={
                    "E.g. \"I want to power 2 standing fans, 4 LED bulbs, a medium chest freezer, 43-inch TV, DSTV decoder, and charge 3 phones every night...\""
                  }
                  maxLength={2000}
                  rows={5}
                  disabled={isLoading}
                  className={`w-full bg-transparent px-6 py-5 text-slate-900 placeholder-slate-400 text-base leading-relaxed transition-all font-sans disabled:opacity-50 border-none ${
                    isLoading ? "loading-shimmer" : ""
                  }`}
                  style={{ fontFamily: "'Syne', sans-serif" }}
                />

                {/* Loading overlay */}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-10">
                    <div className="text-center">
                      {/* Spinning visual */}
                      <div className="relative w-14 h-14 mx-auto mb-4">
                        <div
                          className="absolute inset-0 rounded-full border-2 border-dashed border-[#008751]/30"
                          style={{ animation: "rotate-slow 4s linear infinite" }}
                        />
                        <div
                          className="absolute inset-2 rounded-full border border-orange-500/50"
                          style={{ animation: "rotate-reverse 2s linear infinite" }}
                        />
                        <div
                          className="absolute inset-4 rounded-full bg-[#008751]"
                          style={{ animation: "pulse-glow 1.5s ease-in-out infinite" }}
                        />
                      </div>
                      <p className="text-[#008751] text-sm font-mono font-bold">
                        {LOADING_STEPS[loadingStep]}
                      </p>
                      <div className="flex justify-center gap-1 mt-3">
                        {LOADING_STEPS.map((_, i) => (
                          <div
                            key={i}
                            className={`h-0.5 rounded-full transition-all duration-300 ${
                              i <= loadingStep ? "w-6 bg-[#008751]" : "w-2 bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick add suggestions */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <p className="text-xs text-slate-400 mb-3 font-mono font-medium">Quick add:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => appendSuggestion(s)}
                      disabled={isLoading}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-green-50 hover:border-[#008751]/30 hover:text-[#008751] transition-all disabled:opacity-50 shadow-sm"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location + submit row */}
              <div className="px-6 py-5 border-t border-slate-100 flex flex-col sm:flex-row gap-4 bg-white">
                <div className="relative sm:w-56 shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
                    📍
                  </span>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Your city (optional)"
                    disabled={isLoading}
                    className="w-full pl-9 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-[#008751]/50 focus:ring-2 focus:ring-[#008751]/10 transition-all disabled:opacity-50 font-sans"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isLoading || description.trim().length < 10}
                  className={`flex-1 relative overflow-hidden py-3 rounded-xl font-black text-sm tracking-wide transition-all shadow-md
                    ${
                      isLoading || description.trim().length < 10
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                        : "bg-[#008751] hover:bg-[#00683e] text-white shadow-[#008751]/20 active:scale-[0.98]"
                    }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analysing…
                    </span>
                  ) : (
                    "⚡ Generate My Solar Plan"
                  )}
                </button>
              </div>

              {/* Keyboard hint */}
              {!isLoading && description.length > 0 && (
                <div className="px-6 pb-4 text-xs text-slate-400 font-mono bg-white">
                  ⌘↵ to submit
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="mx-6 mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                  ⚠ {error}
                </div>
              )}
            </div>

            {/* Example prompts */}
            <div className="mt-10">
              <p className="text-xs font-mono text-slate-400 mb-4 uppercase tracking-widest font-semibold">
                Try these examples
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {EXAMPLE_PROMPTS.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => useExample(example)}
                    disabled={isLoading}
                    className="text-left p-4 rounded-xl border border-slate-200 hover:border-orange-500/30 bg-white hover:bg-orange-50/50 text-slate-500 hover:text-slate-900 text-sm leading-relaxed transition-all disabled:opacity-50 shadow-sm group"
                  >
                    <span className="text-orange-400 group-hover:text-orange-600 mr-2 transition-colors font-bold">
                      ›
                    </span>
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div className="mt-16 pt-12 border-t border-slate-200">
              <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-10 text-center font-bold">
                How it works
              </p>
              <div className="grid sm:grid-cols-3 gap-8 text-center">
                {[
                  {
                    step: "01",
                    title: "Describe",
                    desc: "List your appliances in plain English. No technical knowledge needed.",
                    icon: "📝",
                  },
                  {
                    step: "02",
                    title: "Calculate",
                    desc: "Our AI measures wattages, surge loads, and battery needs in seconds.",
                    icon: "⚡",
                  },
                  {
                    step: "03",
                    title: "Connect",
                    desc: "Get a real Naira price and connect directly to a vetted installer.",
                    icon: "🔌",
                  },
                ].map((item) => (
                  <div key={item.step} className="relative bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="text-4xl mb-4">{item.icon}</div>
                    <div
                      className="text-xs font-mono text-[#008751] font-bold mb-2"
                      style={{ letterSpacing: "0.15em" }}
                    >
                      STEP {item.step}
                    </div>
                    <h3 className="font-black text-slate-900 mb-2 text-lg">{item.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Results Section ─────────────────────────────── */}
        {quote?.success && (
          <section
            ref={resultsRef}
            className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 pb-20 pt-10"
          >
            {/* Success banner */}
            <div className="mb-6 flex items-center gap-4 bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="w-10 h-10 rounded-full bg-[#008751] flex items-center justify-center text-white text-lg font-black shadow-md">
                ✓
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Your solar plan is ready
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quote ID: {quote.requestId} · Generated just now
                </p>
              </div>
            </div>

            <QuoteCard quote={quote} onReset={handleReset} />
          </section>
        )}

        {/* ── Footer ──────────────────────────────────────── */}
        <footer className="relative z-10 border-t border-slate-200 px-6 md:px-10 py-10 bg-white mt-10">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#008751]" />
              <span className="text-sm font-black text-slate-900">
                Power<span className="text-[#008751]">24</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono text-center leading-relaxed">
              Prices are indicative estimates. Contact an installer for a firm quote.
              <br />
              © 2026 Power 24 Nigeria. All rights reserved.
            </p>
            <div className="flex gap-5 text-xs text-slate-500 font-mono">
              <a href="#" className="hover:text-[#008751] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[#008751] transition-colors">Terms</a>
              <a href="tel:+2348012345678" className="hover:text-[#008751] transition-colors font-bold">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}