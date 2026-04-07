// ============================================================
// middleware.ts
// Edge middleware — security headers, CSP, and basic request
// logging. Runs before every route in the application.
// ============================================================

import { NextRequest, NextResponse } from "next/server";

// ─── Content Security Policy ──────────────────────────────────
// Tighten further in production: add your CDN/analytics domains.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js requires unsafe-eval in dev
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://api.openai.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// ─── Security headers applied to all responses ───────────────
const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

export function middleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  // Attach security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Log API requests (sanitised — no body)
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    console.log(
      `[Power 24] ${new Date().toISOString()} ${request.method} ${
        request.nextUrl.pathname
      } from ${ip}`
    );
  }

  return response;
}

// Only run middleware on pages and API routes
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
