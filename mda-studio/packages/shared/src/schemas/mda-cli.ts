/**
 * Zod schemas for the JSON contracts emitted by `mda <command> --json`.
 *
 * These schemas are imported by:
 *   - tools/src/cli.ts (the CLI emitter) — assert the shape before printing.
 *   - mda-studio/server/src/services/mda-runner.ts — parse the subprocess
 *     stdout into a typed result.
 *
 * Both sides must read from this single source; any drift breaks the
 * contract tests in either package immediately.
 */

import { z } from "zod";

/** Diagnostic level. */
export const diagnosticLevelSchema = z.enum(["info", "warn", "error"]);
export type MdaDiagnosticLevel = z.infer<typeof diagnosticLevelSchema>;

/** One rule violation. */
export const diagnosticSchema = z.object({
  level: diagnosticLevelSchema,
  rule: z.string(),
  specId: z.string().optional(),
  file: z.string().optional(),
  message: z.string(),
});
export type MdaDiagnostic = z.infer<typeof diagnosticSchema>;

/** `mda validate --json` — one record per scope, NDJSON when multi-scope. */
export const validateResultSchema = z.object({
  scope: z.string(),
  passed: z.boolean(),
  diagnostics: z.array(diagnosticSchema),
});
export type MdaValidateResult = z.infer<typeof validateResultSchema>;

/** `mda gate <layer> --json` — one array per invocation (per-subject items). */
export const gateCheckSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  message: z.string(),
});
export type MdaGateCheck = z.infer<typeof gateCheckSchema>;

export const gateResultSchema = z.object({
  gate: z.string(),
  passed: z.boolean(),
  overridden: z.boolean(),
  overrideReason: z.string().nullable().optional(),
  checks: z.array(gateCheckSchema),
});
export type MdaGateResult = z.infer<typeof gateResultSchema>;

export const gateResultArraySchema = z.array(gateResultSchema);

/** `mda new --json` — one line, success or error. */
export const newSuccessSchema = z.object({
  ok: z.literal(true),
  id: z.string(),
  file: z.string(),
  layer: z.string(),
  name: z.string(),
});
export const newFailureSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
});
export const newResultSchema = z.discriminatedUnion("ok", [
  newSuccessSchema,
  newFailureSchema,
]);
export type MdaNewResult = z.infer<typeof newResultSchema>;

/** `mda asset-plan --json` — NDJSON events. */
export const assetPlanEventSchema = z
  .object({
    event: z.string(),
    ts: z.string(),
  })
  .passthrough();
export type MdaAssetPlanEvent = z.infer<typeof assetPlanEventSchema>;
