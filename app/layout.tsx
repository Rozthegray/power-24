// ============================================================
// app/layout.tsx
// Root layout. Metadata, viewport, security meta tags.
// ============================================================

import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Power 24 — Solar Quotes for Nigeria",
  description:
    "Describe your appliances in plain English. Get an AI-calculated solar system with real Naira pricing, instantly. Nigeria's smartest solar sizing tool.",
  keywords: [
    "solar energy Nigeria",
    "solar panel quote Lagos",
    "off-grid solar Nigeria",
    "solar inverter price Nigeria",
    "hybrid solar system",
    "NEPA alternative",
    "backup power Nigeria",
    "solar battery price Nigeria",
  ],
  authors: [{ name: "Power 24 Nigeria" }],
  openGraph: {
    title: "Power 24 — Solar Quotes for Nigeria",
    description: "Get your AI-powered solar system quote in seconds.",
    type: "website",
    locale: "en_NG",
  },
  // Disable search engine indexing during development
  robots: {
    index: process.env.NODE_ENV === "production",
    follow: process.env.NODE_ENV === "production",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F59E0B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-NG" suppressHydrationWarning>
      <head>
        {/* Security meta tags */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        {/* Preconnect to Google Fonts for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
