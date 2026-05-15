/**
 * Wire shape for the drawer-detail endpoint (plan §7.3):
 *
 *   GET /api/games/:gameId/spec-tree/node/:specId
 *
 * One bundle delivers everything the drawer needs to render its six tabs
 * — node summary, spec body, issues, comments, work products, costs,
 * warnings, and the upward + sideways trace.
 */

import { z } from "zod";
import {
  commentSummarySchema,
  issueSummarySchema,
  validatorWarningSchema,
  workProductSummarySchema,
} from "./issues";
import {
  MDA_LAYERS,
  type Layer,
} from "./mda";
import { specTreeNodeSchema } from "./spec-tree";

export const traceRefSchema = z.object({
  specId: z.string().min(1),
  layer: z.enum(MDA_LAYERS),
  title: z.string().min(1),
});
export type TraceRef = z.infer<typeof traceRefSchema>;

export const specNodeDetailSchema = z.object({
  node: specTreeNodeSchema,
  spec: z.object({
    path: z.string().min(1),
    /** Parsed frontmatter as a free-form object. UI tolerates unknown keys. */
    frontmatter: z.record(z.unknown()),
    /** Raw markdown body following the frontmatter block. */
    body: z.string(),
  }),
  issues: z.array(issueSummarySchema),
  recentComments: z.array(commentSummarySchema),
  workProducts: z.array(workProductSummarySchema),
  costsMtd: z.object({
    own: z.number().int().nonnegative(),
    subtree: z.number().int().nonnegative(),
    byBillingCode: z.array(
      z.object({
        billingCode: z.string().min(1),
        cents: z.number().int().nonnegative(),
      }),
    ),
  }),
  warnings: z.array(validatorWarningSchema),
  trace: z.object({
    upward: z.array(traceRefSchema),
    secondaryParents: z.array(traceRefSchema),
    outgoingRefs: z.array(traceRefSchema),
  }),
});
export type SpecNodeDetail = z.infer<typeof specNodeDetailSchema>;

// Re-export Layer for type-only consumers of this module.
export type { Layer };
