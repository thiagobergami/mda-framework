/**
 * Wire shapes for the chrome-level Costs detail surface (plan §14 U7).
 *
 *   GET /api/games/:gameId/costs
 *   GET /api/games/:gameId/costs?subtree=MEC-001
 *
 * Distinct from the per-node "Costs" tab in the drawer. This view is the
 * studio-wide read of where MTD spend is going: layer rollup, top spec
 * spenders, recent ingestion events, and orphan attribution.
 *
 * `subtree` narrows everything to the canonical-parent subtree rooted at
 * the given spec id (same semantics as the drawer's subtree rollup).
 */

import { z } from "zod";
import { MDA_LAYERS } from "./mda";

export const costsDetailLayerSchema = z.object({
  layer: z.enum(MDA_LAYERS),
  cents: z.number().int().nonnegative(),
  specCount: z.number().int().nonnegative(),
});
export type CostsDetailLayer = z.infer<typeof costsDetailLayerSchema>;

export const costsDetailSpecRowSchema = z.object({
  specId: z.string().min(1),
  layer: z.enum(MDA_LAYERS),
  title: z.string().min(1),
  ownCents: z.number().int().nonnegative(),
  subtreeCents: z.number().int().nonnegative(),
});
export type CostsDetailSpecRow = z.infer<typeof costsDetailSpecRowSchema>;

export const costsDetailEventSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  costCents: z.number().int().nonnegative(),
  occurredAt: z.string().min(1),
  billingCode: z.string().min(1).nullable(),
  agentId: z.string().min(1).nullable(),
  issueId: z.string().min(1).nullable(),
});
export type CostsDetailEvent = z.infer<typeof costsDetailEventSchema>;

export const costsDetailResponseSchema = z.object({
  gameId: z.string().min(1),
  generatedAt: z.string().min(1),
  /** Subtree spec id when scoped via ?subtree=, else null for whole-game. */
  scopeSpecId: z.string().min(1).nullable(),
  totalMtdCents: z.number().int().nonnegative(),
  orphanCents: z.number().int().nonnegative(),
  byLayer: z.array(costsDetailLayerSchema),
  bySpec: z.array(costsDetailSpecRowSchema),
  recentEvents: z.array(costsDetailEventSchema),
});
export type CostsDetailResponse = z.infer<typeof costsDetailResponseSchema>;
