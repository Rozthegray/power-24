"use client";
// ============================================================
// app/page.tsx  —  Power 24
// Theme: Nigerian pride. White base, forest green + solar orange.
// Font: Bricolage Grotesque (display) + JetBrains Mono (data)
// ============================================================

import { useState, useRef, useEffect } from "react";
import QuoteCard from "@/components/QuoteCard";
import type { QuoteResponse } from "@/lib/types";

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

const STATS = [
  { value: "4,200+", label: "Homes powered" },
  { value: "₦2.1B", label: "Customer savings" },
  { value: "98%", label: "Satisfaction rate" },
  { value: "24h", label: "Avg install time" },
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

  useEffect(() => {
    if (!isLoading) { setLoadingStep(0); return; }
    const interval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 1200);
    return () => clearInterval(interval);
  }, [isLoading]);

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
        body: JSON.stringify({ description: description.trim(), location: location.trim() || undefined }),
      });
      const data: QuoteResponse = await res.json();
      setQuote(data);
      if (!data.success) setError(data.error);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setQuote(null); setError(null); setDescription(""); setLocation("");
    textareaRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const useExample = (example: string) => {
    setDescription(example);
    setCharCount(example.length);
    textareaRef.current?.focus();
  };

  const appendSuggestion = (s: string) => {
    const newDesc = description ? `${description.trim()}, ${s.toLowerCase()}` : s;
    setDescription(newDesc);
    setCharCount(newDesc.length);
    textareaRef.current?.focus();
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700;12..96,800&family=JetBrains+Mono:wght@400;500&display=swap');

        :root {
          --ng-green:      #006B3C;
          --ng-green-mid:  #00853F;
          --ng-green-lite: #E8F5EF;
          --ng-green-pale: #F2FAF6;
          --ng-orange:     #E8500A;
          --ng-orange-mid: #F06227;
          --ng-orange-lite:#FEF0EA;
          --ng-cream:      #FDFCF9;
          --ng-ink:        #0D1F15;
          --ng-ink-2:      #2A3D32;
          --ng-ink-3:      #5C7265;
          --ng-border:     #D6E8DC;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
          background: var(--ng-cream);
          color: var(--ng-ink);
          font-family: 'Bricolage Grotesque', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          scroll-behavior: smooth;
        }

        .mono { font-family: 'JetBrains Mono', monospace; }

        @keyframes rise {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0%,100% { transform: scale(1);    opacity: .7; }
          50%      { transform: scale(1.08); opacity: 1; }
        }

        .rise-0 { animation: rise .55s .00s ease both; }
        .rise-1 { animation: rise .55s .10s ease both; }
        .rise-2 { animation: rise .55s .20s ease both; }
        .rise-3 { animation: rise .55s .30s ease both; }
        .rise-4 { animation: rise .55s .40s ease both; }

        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: var(--ng-green-pale); }
        ::-webkit-scrollbar-thumb { background: var(--ng-border); border-radius: 3px; }

        textarea:focus { outline: none; }
        input:focus    { outline: none; box-shadow: 0 0 0 2px var(--ng-green-mid); }

        .adire {
          background-image:
            repeating-linear-gradient(0deg,   transparent, transparent 11px, rgba(0,107,60,.06) 11px, rgba(0,107,60,.06) 12px),
            repeating-linear-gradient(90deg,  transparent, transparent 11px, rgba(0,107,60,.06) 11px, rgba(0,107,60,.06) 12px);
        }

        .chip-btn { transition: border-color .15s, color .15s, background .15s; }
        .chip-btn:hover { border-color: var(--ng-green) !important; color: var(--ng-green) !important; }
        .ex-btn { transition: border-color .15s, background .15s; }
        .ex-btn:hover { border-color: var(--ng-green) !important; background: var(--ng-green-pale) !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "var(--ng-cream)" }}>

        {/* ─────────────── NAV ─────────────────────────────── */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(253,252,249,.94)", backdropFilter: "blur(14px)",
          borderBottom: "1px solid var(--ng-border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 clamp(1rem,4vw,2.5rem)", height: 60,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "var(--ng-green)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                width: 14, height: 14, borderRadius: "50%",
                background: "var(--ng-orange)",
                animation: "pulse-ring 3s ease-in-out infinite",
              }} />
            </div>
            <span style={{
              fontSize: 18, fontWeight: 800, color: "var(--ng-ink)",
              letterSpacing: "-0.03em",
            }}>
              Power<span style={{ color: "var(--ng-green)" }}>24</span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span className="mono" style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 11, color: "var(--ng-green-mid)",
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "var(--ng-green-mid)",
                display: "inline-block",
                animation: "pulse-ring 2s ease-in-out infinite",
              }} />
              SYSTEM LIVE
            </span>
            <a href="tel:+2348012345678" style={{
              fontSize: 12, padding: "7px 16px", borderRadius: 8,
              border: "1.5px solid var(--ng-green)",
              color: "var(--ng-green)", fontWeight: 700,
              textDecoration: "none", fontFamily: "inherit",
            }}>
              Call an Expert
            </a>
          </div>
        </nav>

        {/* ─────────────── HERO ─────────────────────────────── */}
        <section style={{ position: "relative", overflow: "hidden", background: "var(--ng-green)" }}>
          <div className="adire" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />

          {/* Orange sun blob */}
          <div style={{
            position: "absolute", top: -100, right: -100,
            width: 400, height: 400, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(240,98,39,.3) 0%, transparent 65%)",
            pointerEvents: "none",
          }} />
          {/* Bottom-left green glow */}
          <div style={{
            position: "absolute", bottom: 0, left: -60,
            width: 280, height: 280, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,.04) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <div style={{
            maxWidth: 1040, margin: "0 auto",
            padding: "clamp(3rem,8vw,5.5rem) clamp(1rem,4vw,2.5rem) 0",
          }}>

            {/* Flag badge */}
            <div className="rise-0" style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "rgba(255,255,255,.10)",
              border: "1px solid rgba(255,255,255,.22)",
              borderRadius: 99, padding: "7px 16px 7px 10px",
              marginBottom: 30,
            }}>
              {/* Inline Nigerian flag */}
              <div style={{ display: "flex", height: 16, width: 28, borderRadius: 2, overflow: "hidden", border: "1px solid rgba(255,255,255,.3)" }}>
                <div style={{ flex: 1, background: "#fff" }} />
                <div style={{ flex: 1, background: "var(--ng-green-mid)" }} />
                <div style={{ flex: 1, background: "var(--ng-green-mid)" }} />
                <div style={{ flex: 1, background: "#fff" }} />
              </div>
              <span className="mono" style={{ fontSize: 11, color: "rgba(255,255,255,.80)", letterSpacing: ".07em" }}>
                MADE FOR NIGERIA · AI-POWERED SOLAR SIZING
              </span>
            </div>

            {/* H1 */}
            <h1 className="rise-1" style={{
              fontSize: "clamp(3rem, 7.5vw, 5.6rem)",
              fontWeight: 800, lineHeight: 1.0,
              letterSpacing: "-0.04em",
              color: "#fff", marginBottom: 22, maxWidth: 680,
            }}>
              Your house go
              <br />
              get light.{" "}
              <span style={{ color: "var(--ng-orange-mid)" }}>24/7.</span>
            </h1>

            <p className="rise-2" style={{
              fontSize: "clamp(1rem, 2.2vw, 1.18rem)",
              color: "rgba(255,255,255,.72)",
              lineHeight: 1.7, maxWidth: 510,
              marginBottom: 36, fontWeight: 400,
            }}>
              Describe your appliances in plain English.
              Our AI calculates the exact solar system you need — with real{" "}
              <strong style={{ color: "#fff", fontWeight: 700 }}>Naira pricing</strong>,
              in under 10 seconds.
            </p>

            {/* Trust pills */}
            <div className="rise-3" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 52 }}>
              {[
                { icon: "⚡", text: "Surge-load aware" },
                { icon: "🏠", text: "Built for Nigerian homes" },
                { icon: "₦", text: "Real Naira prices" },
                { icon: "🔋", text: "Battery-first design" },
              ].map((b) => (
                <span key={b.text} style={{
                  fontSize: 12, padding: "6px 14px",
                  background: "rgba(255,255,255,.09)",
                  border: "1px solid rgba(255,255,255,.18)",
                  borderRadius: 99, color: "rgba(255,255,255,.78)",
                  fontWeight: 500, display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span>{b.icon}</span> {b.text}
                </span>
              ))}
            </div>

            {/* Stats strip — bleeds into zig-zag */}
            <div className="rise-4" style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              borderTop: "1px solid rgba(255,255,255,.14)",
            }}>
              {STATS.map((s, i) => (
                <div key={s.label} style={{
                  padding: "22px 0",
                  borderRight: i < 3 ? "1px solid rgba(255,255,255,.14)" : "none",
                  paddingLeft: i > 0 ? 28 : 0,
                }}>
                  <div style={{
                    fontSize: "clamp(1.5rem, 3vw, 2rem)",
                    fontWeight: 800, color: "#fff",
                    letterSpacing: "-0.03em", lineHeight: 1,
                  }}>
                    {s.value}
                  </div>
                  <div className="mono" style={{
                    fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: 5,
                  }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Zigzag divider ─────────────────────────────── */}
        <div style={{ lineHeight: 0, background: "var(--ng-green)" }}>
          <svg viewBox="0 0 1200 40" preserveAspectRatio="none"
            style={{ display: "block", width: "100%", height: 40 }}>
            <path d="M0 0 L100 40 L200 0 L300 40 L400 0 L500 40 L600 0 L700 40 L800 0 L900 40 L1000 0 L1100 40 L1200 0 L1200 40 L0 40 Z"
              fill="var(--ng-cream)" />
          </svg>
        </div>

        {/* ─────────────── FORM ────────────────────────────── */}
        {!quote?.success && (
          <section style={{
            maxWidth: 780, margin: "0 auto",
            padding: "clamp(2rem,5vw,3.5rem) clamp(1rem,4vw,2.5rem) clamp(3rem,6vw,5rem)",
          }}>

            {/* Divider label */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 1, background: "var(--ng-border)" }} />
              <span className="mono" style={{ fontSize: 10, color: "var(--ng-ink-3)", letterSpacing: ".1em" }}>
                DESCRIBE YOUR APPLIANCES
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--ng-border)" }} />
            </div>

            {/* Main card */}
            <div style={{
              background: "#fff",
              border: "1.5px solid var(--ng-border)",
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 6px 32px rgba(0,107,60,.07), 0 1px 4px rgba(0,107,60,.04)",
            }}>
              {/* Green-to-orange top bar */}
              <div style={{
                height: 4,
                background: "linear-gradient(90deg, var(--ng-green) 0%, var(--ng-green-mid) 55%, var(--ng-orange) 100%)",
              }} />

              {/* Textarea */}
              <div style={{ position: "relative" }}>
                <textarea
                  ref={textareaRef}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setCharCount(e.target.value.length);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
                  }}
                  placeholder={"E.g. \"I want to power 2 standing fans, 4 LED bulbs, a medium chest freezer, 43-inch TV, DSTV decoder, and charge 3 phones every night...\""}
                  maxLength={2000}
                  rows={5}
                  disabled={isLoading}
                  style={{
                    width: "100%", padding: "22px 24px",
                    fontSize: 15, lineHeight: 1.75,
                    color: "var(--ng-ink)", background: "transparent",
                    border: "none", resize: "none",
                    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
                    opacity: isLoading ? 0.35 : 1,
                  }}
                />

                {/* Char count badge */}
                <span className="mono" style={{
                  position: "absolute", bottom: 10, right: 14,
                  fontSize: 10, padding: "2px 8px", borderRadius: 99,
                  background: charCount > 1800 ? "#FEF2F2" : "var(--ng-green-pale)",
                  color: charCount > 1800 ? "#DC2626" : charCount > 1500 ? "var(--ng-orange)" : "var(--ng-ink-3)",
                  border: `1px solid ${charCount > 1800 ? "#FECACA" : "var(--ng-border)"}`,
                }}>
                  {charCount}/2000
                </span>

                {/* Loading overlay */}
                {isLoading && (
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "rgba(255,255,255,.93)",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 16,
                  }}>
                    <div style={{ position: "relative", width: 54, height: 54 }}>
                      <div style={{
                        position: "absolute", inset: 0, borderRadius: "50%",
                        border: "2.5px dashed var(--ng-green)",
                        animation: "spin-slow 3s linear infinite", opacity: 0.35,
                      }} />
                      <div style={{
                        position: "absolute", inset: 7, borderRadius: "50%",
                        background: "var(--ng-green)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: "50%",
                          background: "var(--ng-orange)",
                          animation: "pulse-ring 1.2s ease-in-out infinite",
                        }} />
                      </div>
                    </div>
                    <span className="mono" style={{ fontSize: 12, color: "var(--ng-green)", fontWeight: 500 }}>
                      {LOADING_STEPS[loadingStep]}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {LOADING_STEPS.map((_, i) => (
                        <div key={i} style={{
                          height: 3, borderRadius: 99,
                          width: i <= loadingStep ? 20 : 8,
                          background: i <= loadingStep ? "var(--ng-green)" : "var(--ng-border)",
                          transition: "all .3s",
                        }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick add chips */}
              <div style={{
                padding: "12px 20px 14px",
                borderTop: "1px solid var(--ng-border)",
                background: "var(--ng-green-pale)",
              }}>
                <span className="mono" style={{
                  fontSize: 10, color: "var(--ng-ink-3)",
                  letterSpacing: ".08em", marginRight: 8,
                }}>
                  QUICK ADD →
                </span>
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => appendSuggestion(s)}
                    disabled={isLoading}
                    className="chip-btn"
                    style={{
                      display: "inline-flex", margin: "3px 4px 3px 0",
                      padding: "4px 11px", borderRadius: 99,
                      border: "1px solid var(--ng-border)",
                      background: "#fff", color: "var(--ng-ink-2)",
                      fontSize: 12, fontWeight: 500, cursor: "pointer",
                      fontFamily: "inherit",
                      opacity: isLoading ? 0.4 : 1,
                    }}
                  >
                    + {s}
                  </button>
                ))}
              </div>

              {/* Location + CTA */}
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 12,
                padding: "16px 20px 20px",
                borderTop: "1px solid var(--ng-border)",
              }}>
                <div style={{ position: "relative", width: 200, flexShrink: 0 }}>
                  <span style={{
                    position: "absolute", left: 11, top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 14, pointerEvents: "none",
                  }}>📍</span>
                  <input
                    type="text" value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Your city (optional)"
                    disabled={isLoading}
                    style={{
                      width: "100%", paddingLeft: 32, paddingRight: 12,
                      paddingTop: 10, paddingBottom: 10,
                      border: "1.5px solid var(--ng-border)",
                      borderRadius: 10, fontSize: 13,
                      color: "var(--ng-ink)", fontFamily: "inherit",
                      background: "#fff",
                      opacity: isLoading ? 0.5 : 1,
                    }}
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isLoading || description.trim().length < 10}
                  style={{
                    flex: 1, minWidth: 200,
                    padding: "11px 24px", borderRadius: 10,
                    border: "none",
                    cursor: description.trim().length < 10 || isLoading ? "not-allowed" : "pointer",
                    background: description.trim().length < 10 || isLoading
                      ? "var(--ng-green-lite)"
                      : "var(--ng-green)",
                    color: description.trim().length < 10 || isLoading
                      ? "var(--ng-green)"
                      : "#fff",
                    fontSize: 14, fontWeight: 800,
                    fontFamily: "inherit", letterSpacing: "-0.01em",
                    transition: "background .18s, color .18s, transform .1s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  {isLoading ? (
                    <>
                      <svg style={{ animation: "spin-slow 1s linear infinite", width: 16, height: 16 }}
                        viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                          strokeDasharray="40" strokeDashoffset="15" />
                      </svg>
                      Analysing…
                    </>
                  ) : (
                    "⚡ Generate My Solar Plan"
                  )}
                </button>
              </div>

              {!isLoading && description.length > 0 && (
                <div className="mono" style={{ padding: "0 20px 14px", fontSize: 11, color: "var(--ng-ink-3)" }}>
                  ⌘↵ to submit
                </div>
              )}

              {error && (
                <div style={{
                  margin: "0 20px 16px", padding: "12px 16px",
                  borderRadius: 10, background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  fontSize: 13, color: "#DC2626", fontWeight: 500,
                }}>
                  ⚠ {error}
                </div>
              )}
            </div>

            {/* Example prompts */}
            <div style={{ marginTop: 32 }}>
              <p className="mono" style={{
                fontSize: 10, color: "var(--ng-ink-3)",
                letterSpacing: ".1em", marginBottom: 14,
              }}>
                TRY THESE EXAMPLES
              </p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 10,
              }}>
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button key={i} onClick={() => useExample(ex)}
                    disabled={isLoading}
                    className="ex-btn"
                    style={{
                      textAlign: "left", padding: "14px 16px", borderRadius: 12,
                      border: "1.5px solid var(--ng-border)",
                      background: "#fff", cursor: "pointer",
                      fontSize: 12, color: "var(--ng-ink-2)", lineHeight: 1.65,
                      fontFamily: "inherit", fontWeight: 400,
                      opacity: isLoading ? 0.4 : 1,
                    }}
                  >
                    <span style={{ color: "var(--ng-orange)", marginRight: 6, fontWeight: 700, fontSize: 14 }}>›</span>
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div style={{ marginTop: 56 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
                <div style={{ flex: 1, height: 1, background: "var(--ng-border)" }} />
                <span className="mono" style={{ fontSize: 10, color: "var(--ng-ink-3)", letterSpacing: ".1em" }}>
                  HOW IT WORKS
                </span>
                <div style={{ flex: 1, height: 1, background: "var(--ng-border)" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[
                  {
                    step: "01", title: "Describe",
                    body: "List your appliances in plain English. No engineering degree required.",
                    accent: "var(--ng-green)",
                    bg: "var(--ng-green-lite)",
                  },
                  {
                    step: "02", title: "Calculate",
                    body: "Our AI sizes your inverter, batteries and panels using Nigerian-specific wattage data.",
                    accent: "var(--ng-orange)",
                    bg: "var(--ng-orange-lite)",
                  },
                  {
                    step: "03", title: "Connect",
                    body: "Get a full NGN breakdown and speak to a NAESCO-certified local installer.",
                    accent: "var(--ng-green)",
                    bg: "var(--ng-green-lite)",
                  },
                ].map((item) => (
                  <div key={item.step} style={{
                    padding: 20, borderRadius: 14,
                    border: "1.5px solid var(--ng-border)",
                    background: "#fff",
                  }}>
                    <span className="mono" style={{
                      display: "inline-block", marginBottom: 12,
                      padding: "3px 10px", borderRadius: 99,
                      background: item.bg, color: item.accent,
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {item.step}
                    </span>
                    <h3 style={{
                      fontSize: 16, fontWeight: 800, marginBottom: 8,
                      color: "var(--ng-ink)", letterSpacing: "-0.02em",
                    }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: 12, color: "var(--ng-ink-3)", lineHeight: 1.65 }}>
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─────────────── RESULTS ─────────────────────────── */}
        {quote?.success && (
          <section ref={resultsRef} style={{
            maxWidth: 780, margin: "0 auto",
            padding: "clamp(2rem,5vw,3rem) clamp(1rem,4vw,2.5rem) clamp(3rem,6vw,5rem)",
          }}>
            <div style={{
              display: "flex", alignItems: "center",
              gap: 12, marginBottom: 24,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "var(--ng-green)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 16, fontWeight: 800, flexShrink: 0,
              }}>
                ✓
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--ng-ink)" }}>
                  Your solar plan is ready
                </p>
                <p className="mono" style={{ fontSize: 11, color: "var(--ng-ink-3)" }}>
                  Quote ID: {quote.requestId} · Generated just now
                </p>
              </div>
            </div>
            <QuoteCard quote={quote} onReset={handleReset} />
          </section>
        )}

        {/* ─────────────── FOOTER ──────────────────────────── */}
        <footer style={{
          background: "var(--ng-green)",
          padding: "28px clamp(1rem,4vw,2.5rem)",
        }}>
          <div style={{
            maxWidth: 1040, margin: "0 auto",
            display: "flex", flexWrap: "wrap",
            alignItems: "center", justifyContent: "space-between", gap: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: "var(--ng-orange)",
              }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
                Power<span style={{ color: "var(--ng-orange-mid)" }}>24</span>
              </span>
            </div>
            <p className="mono" style={{
              fontSize: 10, color: "rgba(255,255,255,.38)",
              textAlign: "center",
            }}>
              Prices are indicative estimates. Contact an installer for a firm quote.
              © 2024 Power 24 Nigeria Ltd.
            </p>
            <div style={{ display: "flex", gap: 20 }}>
              {["Privacy", "Terms", "Contact"].map((l) => (
                <a key={l} href="#" className="mono" style={{
                  fontSize: 11, color: "rgba(255,255,255,.4)",
                  textDecoration: "none",
                }}>
                  {l}
                </a>
              ))}
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
