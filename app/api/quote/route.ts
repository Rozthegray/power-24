// ============================================================
// app/api/quote/route.ts
// POST /api/quote
//
// Flow:
//   1. Validate & sanitize input
//   2. Rate limit by IP
//   3. Call OpenAI via Vercel AI SDK → generateObject()
//   4. Run the load profile engine
//   5. Select package & build final quote
//   6. Return JSON
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { AIExtractionSchema } from "@/lib/ai/schema";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";
import {
  computeLoadProfile,
  selectPackage,
  buildQuoteResult,
} from "@/lib/engine/mapper";
import { rateLimit } from "@/lib/utils/rate-limit";
import { QuoteRequestSchema, sanitizeInput } from "@/lib/utils/validate";
import type { QuoteResponse } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────
export type ApiErrorResponse = {
  success: boolean;
  error: string;
  code: string;
  retryable: boolean;
};

// ─── Security headers attached to every response ─────────────
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-store",
};

// ─── Rate limit config ────────────────────────────────────────
const RATE_LIMIT_CONFIG = {
  limit: 5,           // 5 requests
  windowMs: 60_000,   // per minute
};

// ─── POST handler ─────────────────────────────────────────────
export async function POST(
  req: NextRequest
): Promise<NextResponse<QuoteResponse | ApiErrorResponse>> {
  try {
    // 1. Rate limiting by IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "anonymous";

    const limitResult = rateLimit(ip, RATE_LIMIT_CONFIG);

    if (!limitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests. Please wait a minute before trying again.",
          code: "RATE_LIMITED",
          retryable: true,
        },
        {
          status: 429,
          headers: {
            ...SECURITY_HEADERS,
            "Retry-After": String(
              Math.ceil((limitResult.resetAt - Date.now()) / 1000)
            ),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // 2. Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON in request body.",
          code: "VALIDATION_ERROR",
          retryable: false,
        },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

  const parsed = QuoteRequestSchema.safeParse(body);
    if (!parsed.success) {
      // FIX: Changed .errors[0] to .issues[0] for strict Zod typing
      const firstError = parsed.error.issues[0]; 
      return NextResponse.json(
        {
          success: false,
          error: firstError?.message ?? "Invalid request data.",
          code: "VALIDATION_ERROR",
          retryable: false,
        },
        { status: 422, headers: SECURITY_HEADERS }
      );
    }

    const { description, location, budgetRange } = parsed.data;
    const safeDescription = sanitizeInput(description);

    // 3. Call OpenAI via Vercel AI SDK
    let extraction;
    try {
      const result = await generateObject({
        model: openai("gpt-4o"),
        schema: AIExtractionSchema, // Fixed typo: removed trailing slash
        system: SYSTEM_PROMPT,
        prompt: buildUserPrompt(safeDescription, location),
        temperature: 0.1, // Low temperature: we want deterministic physics, not creativity
        maxRetries: 2,
      });
      extraction = result.object;
    } catch (aiError: unknown) {
      console.error("[Power 24] OpenAI error:", aiError);

      // Check if it's a structured parsing failure
      const errorMessage =
        aiError instanceof Error ? aiError.message : "Unknown AI error";
      const isParseFailure = errorMessage.includes("parse") ||
        errorMessage.includes("schema") ||
        errorMessage.includes("invalid");

      return NextResponse.json(
        {
          success: false,
          error: isParseFailure
            ? "Could not extract appliance data from your description. Please be more specific."
            : "AI service temporarily unavailable. Please try again.",
          code: isParseFailure ? "AI_PARSE_FAILURE" : "INTERNAL_ERROR",
          retryable: !isParseFailure,
        },
        {
          status: isParseFailure ? 422 : 503,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // 4. Run the engineering engine
    let loadProfile;
    let selectedPackage;
    try {
      loadProfile = computeLoadProfile(extraction, location);
      selectedPackage = selectPackage(loadProfile);

      // Override: if user specified economy budget, step down one tier if possible
      if (budgetRange === "economy") {
        const currentIndex = ["sapa-lite", "hustler-plus", "odogwu-premium", "oga-boss"]
          .indexOf(selectedPackage.slug);
        if (currentIndex > 0) {
          // Note: lower tier may not technically fit — add a warning
          // In production, you might show two options instead
        }
      }
    } catch (engineError) {
      console.error("[Power 24] Engine error:", engineError);
      return NextResponse.json(
        {
          success: false,
          error: "System sizing calculation failed. Please try again.",
          code: "ENGINE_ERROR",
          retryable: true,
        },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }

    // 5. Assemble and return final quote
    const quote = buildQuoteResult(
      { description: safeDescription, location, budgetRange },
      extraction,
      loadProfile,
      selectedPackage
    );

    return NextResponse.json(quote, {
      status: 200,
      headers: {
        ...SECURITY_HEADERS,
        "X-RateLimit-Remaining": String(limitResult.remaining),
      },
    });
  } catch (error) {
    // Catch-all for truly unexpected errors
    console.error("[Power 24] Unhandled error in /api/quote:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred. Our team has been notified.",
        code: "INTERNAL_ERROR",
        retryable: true,
      },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}

// ─── Block non-POST methods ───────────────────────────────────
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Method not allowed." },
    { status: 405, headers: { Allow: "POST", ...SECURITY_HEADERS } }
  );
}