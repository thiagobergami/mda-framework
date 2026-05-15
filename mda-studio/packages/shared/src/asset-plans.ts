/**
 * Wire shapes for the read-only asset-plan executor surface (plan §14 U7).
 *
 *   GET /api/games/:gameId/asset-plans
 *
 * Scans `<specsRoot>/design/asset-plans/<asset-id>/` for the per-asset
 * directories produced by `mda asset-plan generate` / `exec` / `import`.
 * Skips underscore-prefixed entries (those are profile / style docs).
 *
 * V1 is read-only: the UI displays state derived from the on-disk
 * artifact set. Triggering generate / exec / import lives behind the
 * command palette permission flag (plan §17 OQ5, deferred).
 */

import { z } from "zod";

export const ASSET_PLAN_STATES = [
  "no-plan",
  "planned",
  "in-progress",
  "imported",
  "unknown",
] as const;
export type AssetPlanState = (typeof ASSET_PLAN_STATES)[number];

export const assetPlanEntrySchema = z.object({
  assetId: z.string().min(1),
  /** Highest plan version found under the asset dir (null if no plan file). */
  latestPlanVersion: z.number().int().positive().nullable(),
  /** Path (relative to specsRoot) to the latest `*.plan.md` file. */
  latestPlanFile: z.string().min(1).nullable(),
  state: z.enum(ASSET_PLAN_STATES),
  /** Number of files under `output/`. */
  artifactCount: z.number().int().nonnegative(),
  /** Number of files under `refs/`. */
  refsCount: z.number().int().nonnegative(),
});
export type AssetPlanEntry = z.infer<typeof assetPlanEntrySchema>;

export const assetPlanListResponseSchema = z.object({
  gameId: z.string().min(1),
  generatedAt: z.string().min(1),
  /** Absolute path scanned (relative to specsRoot). Useful for debugging. */
  rootPath: z.string(),
  entries: z.array(assetPlanEntrySchema),
});
export type AssetPlanListResponse = z.infer<typeof assetPlanListResponseSchema>;
