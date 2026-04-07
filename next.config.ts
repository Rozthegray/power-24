// ============================================================
// next.config.ts
// ============================================================

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─── Security: prevent information leakage ───────────────
  poweredByHeader: false,

  // ─── Strict TypeScript during builds ────────────
  typescript: {
    ignoreBuildErrors: false,
  },

  // ─── Production image optimisation ───────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [], // No external images in MVP
  },

  // ─── Reduce attack surface: disable x-powered-by ─────────
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
      ],
    },
    {
      // Cache static assets aggressively
      source: "/_next/static/(.*)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
  ],

  // ─── Logging in production ────────────────────────────────
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
};

export default nextConfig;