"use client";
// ============================================================
// app/page.tsx
// Power 24 — Main Interface
// Aesthetic: Afro-solar. Deep black + ember amber + electric gold.
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
      {/* ── Global fonts ────────────────────────────────────── */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Syne:wght@400;600;700;800&display=swap');

        :root {
          --ember: #F59E0B;
          --ember-deep: #D97706;
          --solar: #FDE68A;
          --carbon: #0A0A0A;
          --charcoal: #111111;
          --surface: #1A1A1A;
          --border: rgba(255, 255, 255, 0.08);
        }

        * { box-sizing: border-box; }

        html {
          background: var(--carbon);
          color: #fff;
          font-family: 'Syne', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .font-mono { font-family: 'IBM Plex Mono', monospace; }

        /* Texture overlay on the hero */
        .noise::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
          background-size: 200px 200px;
          pointer-events: none;
          opacity: 0.4;
          mix-blend-mode: overlay;
        }

        /* Sun rays */
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes rotate-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(1.02); }
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
          background: linear-gradient(90deg, transparent 25%, rgba(245, 158, 11, 0.15) 50%, transparent 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        textarea {
          resize: none;
          outline: none;
        }

        textarea:focus {
          box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.4), 0 0 30px rgba(245, 158, 11, 0.06);
        }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--carbon); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      <div className="min-h-screen bg-[#0A0A0A] relative overflow-x-hidden">
        {/* ── Ambient background ──────────────────────────── */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Large sun glow */}
          <div
            className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.06) 40%, transparent 70%)",
              animation: "pulse-glow 8s ease-in-out infinite",
            }}
          />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(245,158,11,0.5) 1px, transparent 1px),
                linear-gradient(90deg, rgba(245,158,11,0.5) 1px, transparent 1px)
              `,
              backgroundSize: "60px 60px",
            }}
          />
          {/* Bottom vignette */}
          <div
            className="absolute bottom-0 left-0 right-0 h-48"
            style={{
              background: "linear-gradient(to top, #0A0A0A, transparent)",
            }}
          />
        </div>

        {/* ── Navigation ──────────────────────────────────── */}
        <nav className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            {/* Solar logo mark */}
            <div className="relative w-8 h-8">
              <div
                className="absolute inset-0"
                style={{
                  background: "conic-gradient(from 0deg, #F59E0B, #FDE68A, #F59E0B, #D97706, #F59E0B)",
                  borderRadius: "50%",
                  animation: "rotate-slow 20s linear infinite",
                  opacity: 0.8,
                }}
              />
              <div className="absolute inset-[3px] bg-[#0A0A0A] rounded-full" />
              <div className="absolute inset-[6px] rounded-full bg-amber-400" />
            </div>
            <span
              className="text-lg font-black tracking-tight text-white"
              style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}
            >
              Power<span className="text-amber-400">24</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-white/30 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              System Online
            </span>
            <a
              href="tel:+2348012345678"
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all font-mono"
            >
              📞 Talk to an Expert
            </a>
          </div>
        </nav>

        {/* ── Hero Section ────────────────────────────────── */}
        <section className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 pt-16 pb-10">
          {/* Badge */}
          <div className="animate-float-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-400 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            AI-POWERED SOLAR SIZING FOR NIGERIA
          </div>

          {/* Headline */}
          <h1
            className="animate-float-1 text-5xl md:text-7xl font-black text-white leading-[0.95] tracking-tight mb-6"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Tell us what
            <br />
            you want to
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #F59E0B, #FDE68A, #D97706)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              power.
            </span>
          </h1>

          <p className="animate-float-2 text-white/50 text-lg md:text-xl leading-relaxed max-w-xl">
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
              <span key={badge} className="text-xs text-white/40 font-mono">
                {badge}
              </span>
            ))}
          </div>
        </section>

        {/* ── Main Form ───────────────────────────────────── */}
        {!quote?.success && (
          <section className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 pb-20">
            <div className="rounded-2xl border border-white/10 bg-[#111111] overflow-hidden shadow-2xl">
              {/* Form header */}
              <div className="px-6 pt-6 pb-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">
                  Describe Your Appliances
                </h2>
                <span
                  className={`text-xs font-mono ${
                    charCount > 1800
                      ? "text-red-400"
                      : charCount > 1500
                      ? "text-amber-400"
                      : "text-white/20"
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
                  className={`w-full bg-transparent px-6 py-5 text-white/80 placeholder-white/20 text-base leading-relaxed transition-all font-sans disabled:opacity-50 border-none ${
                    isLoading ? "loading-shimmer" : ""
                  }`}
                  style={{ fontFamily: "'Syne', sans-serif" }}
                />

                {/* Loading overlay */}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#111111]/80 backdrop-blur-sm">
                    <div className="text-center">
                      {/* Spinning sun */}
                      <div className="relative w-14 h-14 mx-auto mb-4">
                        <div
                          className="absolute inset-0 rounded-full border-2 border-dashed border-amber-400/30"
                          style={{ animation: "rotate-slow 4s linear infinite" }}
                        />
                        <div
                          className="absolute inset-2 rounded-full border border-amber-400/50"
                          style={{ animation: "rotate-reverse 2s linear infinite" }}
                        />
                        <div
                          className="absolute inset-4 rounded-full bg-amber-400"
                          style={{ animation: "pulse-glow 1.5s ease-in-out infinite" }}
                        />
                      </div>
                      <p className="text-amber-400 text-sm font-mono font-medium">
                        {LOADING_STEPS[loadingStep]}
                      </p>
                      <div className="flex justify-center gap-1 mt-3">
                        {LOADING_STEPS.map((_, i) => (
                          <div
                            key={i}
                            className={`h-0.5 rounded-full transition-all duration-300 ${
                              i <= loadingStep ? "w-6 bg-amber-400" : "w-2 bg-white/20"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick add suggestions */}
              <div className="px-6 py-3 border-t border-white/5">
                <p className="text-xs text-white/30 mb-2 font-mono">Quick add:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => appendSuggestion(s)}
                      disabled={isLoading}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-white/50 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400 transition-all disabled:opacity-30"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location + submit row */}
              <div className="px-6 py-4 border-t border-white/5 flex flex-col sm:flex-row gap-3">
                <div className="relative sm:w-52 shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/20 pointer-events-none">
                    📍
                  </span>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Your city (optional)"
                    disabled={isLoading}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 placeholder-white/25 text-sm focus:outline-none focus:border-amber-500/30 transition-all disabled:opacity-50 font-sans"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isLoading || description.trim().length < 10}
                  className={`flex-1 relative overflow-hidden py-3 rounded-xl font-black text-sm tracking-wide transition-all
                    ${
                      isLoading || description.trim().length < 10
                        ? "bg-amber-500/20 text-amber-500/30 cursor-not-allowed"
                        : "bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 active:scale-[0.98]"
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
                <div className="px-6 pb-4 text-xs text-white/20 font-mono">
                  ⌘↵ to submit
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="mx-6 mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-sm text-red-400">
                  ⚠ {error}
                </div>
              )}
            </div>

            {/* Example prompts */}
            <div className="mt-8">
              <p className="text-xs font-mono text-white/30 mb-4 uppercase tracking-widest">
                Try these examples
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {EXAMPLE_PROMPTS.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => useExample(example)}
                    disabled={isLoading}
                    className="text-left p-4 rounded-xl border border-white/8 hover:border-amber-500/30 bg-white/[0.02] hover:bg-amber-500/5 text-white/40 hover:text-white/60 text-xs leading-relaxed transition-all disabled:opacity-30 group"
                  >
                    <span className="text-amber-500/40 group-hover:text-amber-500 mr-1.5 transition-colors">
                      ›
                    </span>
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div className="mt-12 pt-10 border-t border-white/5">
              <p className="text-xs font-mono text-white/20 uppercase tracking-widest mb-8 text-center">
                How it works
              </p>
              <div className="grid sm:grid-cols-3 gap-6 text-center">
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
                  <div key={item.step} className="relative">
                    <div className="text-3xl mb-3">{item.icon}</div>
                    <div
                      className="text-xs font-mono text-amber-500/40 mb-1"
                      style={{ letterSpacing: "0.15em" }}
                    >
                      STEP {item.step}
                    </div>
                    <h3 className="font-black text-white mb-2">{item.title}</h3>
                    <p className="text-xs text-white/30 leading-relaxed">{item.desc}</p>
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
            className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 pb-20"
          >
            {/* Success banner */}
            <div className="mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-black text-sm font-black">
                ✓
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Your solar plan is ready
                </p>
                <p className="text-xs text-white/40">
                  Quote ID: {quote.requestId} · Generated just now
                </p>
              </div>
            </div>

            <QuoteCard quote={quote} onReset={handleReset} />
          </section>
        )}

        {/* ── Footer ──────────────────────────────────────── */}
        <footer className="relative z-10 border-t border-white/5 px-6 md:px-10 py-8">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-amber-400" />
              <span className="text-sm font-black text-white/60">
                Power<span className="text-amber-400">24</span>
              </span>
            </div>
            <p className="text-xs text-white/20 font-mono text-center">
              Prices are indicative estimates. Contact an installer for a firm quote.
              <br />
              © 2024 Power 24 Nigeria. All rights reserved.
            </p>
            <div className="flex gap-4 text-xs text-white/20 font-mono">
              <a href="#" className="hover:text-white/50 transition-colors">Privacy</a>
              <a href="#" className="hover:text-white/50 transition-colors">Terms</a>
              <a href="tel:+2348012345678" className="hover:text-white/50 transition-colors">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
