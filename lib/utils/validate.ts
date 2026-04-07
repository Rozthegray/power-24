// ============================================================
// lib/utils/validate.ts
// Input validation & sanitization for API requests.
// ============================================================

import { z } from "zod";

export const QuoteRequestSchema = z.object({
  description: z
    .string()
    .min(10, "Please describe at least a few appliances (minimum 10 characters).")
    .max(2000, "Description too long. Please keep it under 2000 characters.")
    .transform((val) => val.trim())
    .refine(
      (val) => {
        // Basic injection / prompt injection guard:
        // Reject if >50% of characters are non-alphanumeric
        const alphanumeric = val.replace(/[^a-zA-Z0-9\s]/g, "").length;
        return alphanumeric / val.length > 0.4;
      },
      { message: "Description contains too many special characters." }
    ),

  location: z
    .string()
    .max(100, "Location must be under 100 characters.")
    .optional()
    .transform((val) => val?.trim()),

  budgetRange: z
    .enum(["economy", "standard", "premium"])
    .optional(),
});

export type ValidatedQuoteRequest = z.infer<typeof QuoteRequestSchema>;

/**
 * Strips any characters that could cause prompt injection.
 * Conservative: keeps letters, numbers, punctuation, and whitespace.
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>{}[\]\\]/g, "") // Remove HTML/code chars
    .replace(/(\n{3,})/g, "\n\n") // Collapse excessive newlines
    .trim();
}
