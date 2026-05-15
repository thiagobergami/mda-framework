/**
 * Wire shapes for cost-event ingestion and validator-run reporting.
 *
 *   POST /api/studios/:sid/cost-events
 *   POST /api/games/:gid/validator/runs
 *   GET  /api/games/:gid/validator/warnings
 *
 * The store keeps `costCents` as a non-negative integer (in cents) — never
 * float dollars — and `occurredAt` as an ISO timestamp. Subtree rollups
 * filter by current calendar month (MTD).
 */

import { z } from "zod";
import { validatorWarningSchema } from "./issues";

export const costEventInputSchema = z.object({
  studioId: z.string().min(1),
  gameId: z.string().min(1),
  agentId: z.string().min(1).nullable().optional(),
  issueId: z.string().min(1).nullable().optional(),
  provider: z.string().min(1),
  model: z.string().min(1),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  costCents: z.number().int().nonnegative(),
  occurredAt: z.string().min(1),
  /** Spec id ("MEC-001") or explicit null for orphan cost. */
  billingCode: z.string().min(1).nullable(),
});
export type CostEventInput = z.infer<typeof costEventInputSchema>;

export const costEventSchema = costEventInputSchema.extend({
  id: z.string().min(1),
  createdAt: z.string().min(1),
});
export type CostEvent = z.infer<typeof costEventSchema>;

export const validatorRunInputSchema = z.object({
  warnings: z.array(validatorWarningSchema),
});
export type ValidatorRunInput = z.infer<typeof validatorRunInputSchema>;

export const validatorRunSchema = z.object({
  id: z.string().min(1),
  gameId: z.string().min(1),
  ranAt: z.string().min(1),
  warnings: z.array(validatorWarningSchema),
});
export type ValidatorRun = z.infer<typeof validatorRunSchema>;

/**
 * Returns true if `iso` is in the same UTC year+month as `now`.
 * Used by the cost rollup to bound MTD totals.
 */
export function isInCurrentMonth(iso: string, now: Date = new Date()): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth()
  );
}
