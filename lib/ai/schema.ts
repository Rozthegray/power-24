// ============================================================
// lib/ai/schema.ts
// Zod schema fed to generateObject(). The AI is ONLY allowed
// to return what this schema describes — no prices, no opinions,
// just physics: appliances + wattages + hours.
// ============================================================

import { z } from "zod";

// ─── Appliance category enum ─────────────────────────────────
export const ApplianceCategorySchema = z.enum([
  "lighting",
  "cooling",
  "refrigeration",
  "entertainment",
  "computing",
  "water_pump",
  "cooking",
  "security",
  "other",
]);

// ─── Single detected appliance ───────────────────────────────
export const DetectedApplianceSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(80)
    .describe("Human-readable appliance name, e.g. 'Standing Fan 16-inch'"),

  quantity: z
    .number()
    .int()
    .min(1)
    .max(50)
    .describe("Number of this appliance the user wants to power"),

  unitWatts: z
    .number()
    .min(1)
    .max(10000)
    .describe(
      "Rated continuous power consumption per unit in watts. " +
      "Use standard Nigerian market values. " +
      "For unknown appliances, use conservative estimates."
    ),

  dailyHours: z
    .number()
    .min(0.25)
    .max(24)
    .describe(
      "Estimated hours of use per day for this appliance. " +
      "Fridges = 24h (duty cycle handled separately). " +
      "Lights = 6-8h. Fans = 8-12h. TVs = 4-6h."
    ),

  hasSurge: z
    .boolean()
    .describe(
      "True if this appliance has a motor, compressor, or pump " +
      "that causes an inrush current surge on startup."
    ),

  surgeMultiplier: z
    .number()
    .min(1)
    .max(5)
    .describe(
      "How many times the rated watts this appliance draws at startup. " +
      "AC compressors = 3x. Fridges = 2.5x. Pumps = 3x. " +
      "Non-motor loads = 1x."
    ),

  category: ApplianceCategorySchema.describe(
    "The functional category this appliance belongs to."
  ),
});

// ─── Full extraction result ──────────────────────────────────
export const AIExtractionSchema = z.object({
  appliances: z
    .array(DetectedApplianceSchema)
    .min(1)
    .max(30)
    .describe("All appliances detected from the user's description"),

  totalContinuousWatts: z
    .number()
    .min(1)
    .describe(
      "Sum of (unitWatts × quantity) for ALL appliances. " +
      "This is the continuous load the inverter must sustain."
    ),

  totalSurgeWatts: z
    .number()
    .min(1)
    .describe(
      "The HIGHEST single surge load. Do NOT add all surges together — " +
      "only the worst single appliance surge matters for inverter sizing. " +
      "= totalContinuousWatts - (worst_appliance_continuous_watts) + " +
      "(worst_appliance_continuous_watts × surgeMultiplier)."
    ),

  estimatedDailyWattHours: z
    .number()
    .min(100)
    .describe(
      "Sum of (unitWatts × quantity × dailyHours) for all appliances. " +
      "For fridges, apply a 0.4 duty cycle factor (they don't run 100% of the time). " +
      "This is the raw energy demand before safety buffers."
    ),

  confidenceScore: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Your confidence in this extraction. " +
      "1.0 = user gave exact wattages. " +
      "0.7 = standard assumptions used. " +
      "0.4 = very vague description, many guesses made."
    ),

  engineersVerdict: z
    .string()
    .describe("A short, brutally honest 2-sentence verdict explaining the biggest risk factor based on the load profile vs the chosen system (e.g., 'Running 2 ACs all night will drain this battery. Plan to run only 1 at night.')"),

  warnings: z
    .array(z.string().max(200))
    .max(10)
    .describe(
      "List of assumptions made or data that was unclear. " +
      "E.g. ['AC tonnage not specified, assumed 1HP (746W)', " +
      "'Fridge age unknown, assumed mid-efficiency model']."
    ),
});

// ─── Exported TypeScript type inferred from schema ───────────
export type AIExtractionSchemaType = z.infer<typeof AIExtractionSchema>;
