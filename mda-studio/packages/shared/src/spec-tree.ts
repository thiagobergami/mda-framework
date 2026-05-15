/**
 * Wire-format schemas for the spec-tree-first UI.
 *
 * `SpecTreeNode` mirrors plan §7.2 of
 * `design/mda-studio/spec-tree-ui/plan.md`. The UI assembles the tree
 * client-side using `canonicalParentSpecId`; secondary parents become
 * "also serves" chips.
 *
 * In Phase U1 the server is not yet wired — these schemas are validated
 * against in-memory fixtures only.
 */

import { z } from "zod";
import { MDA_LAYERS, SPEC_STATUSES } from "./mda";

export const RUN_STATUSES = ["idle", "running", "paused", "error"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const ISSUE_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
  "cancelled",
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const specTreeNodeSchema = z.object({
  specId: z.string().min(1),
  layer: z.enum(MDA_LAYERS),
  title: z.string().min(1),
  status: z.enum(SPEC_STATUSES),
  canonicalParentSpecId: z.string().min(1).nullable(),
  secondaryParentSpecIds: z.array(z.string().min(1)),
  outgoingRefSpecIds: z.array(z.string().min(1)),
  activeIssueId: z.string().min(1).nullable(),
  activeIssueStatus: z.enum(ISSUE_STATUSES).nullable(),
  assigneeAgentId: z.string().min(1).nullable(),
  assigneeAgentHandle: z.string().min(1).nullable(),
  runStatus: z.enum(RUN_STATUSES).nullable(),
  costMtdCents: z.number().int().nonnegative(),
  costMtdSubtreeCents: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
});
export type SpecTreeNode = z.infer<typeof specTreeNodeSchema>;

export const specTreeConceptSchema = z.object({
  path: z.string().min(1),
  primaryAesthetic: z.string().min(1),
  title: z.string().min(1),
});
export type SpecTreeConcept = z.infer<typeof specTreeConceptSchema>;

export const specTreeResponseSchema = z.object({
  gameId: z.string().min(1),
  generatedAt: z.string().min(1),
  concept: specTreeConceptSchema,
  nodes: z.array(specTreeNodeSchema),
});
export type SpecTreeResponse = z.infer<typeof specTreeResponseSchema>;

/** Minimal game-card shape used by the Studio home grid (plan D2). */
export const gameCardSchema = z.object({
  gameId: z.string().min(1),
  studioId: z.string().min(1),
  name: z.string().min(1),
  conceptSummary: z.string(),
  primaryAesthetic: z.string().min(1),
  mtdSpendCents: z.number().int().nonnegative(),
  activeAgentCount: z.number().int().nonnegative(),
  openRecoveryIssueCount: z.number().int().nonnegative(),
});
export type GameCard = z.infer<typeof gameCardSchema>;

/**
 * Centsformatter used in chips & rollups. Hand-rolled so we don't ship Intl
 * polyfills into the prototype.
 */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(1)}k`;
  }
  return `$${dollars.toFixed(2)}`;
}
