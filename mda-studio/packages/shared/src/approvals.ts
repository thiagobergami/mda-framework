/**
 * Approval wire shapes (plan §6 — `ApprovalSheet` + chrome badge, §9.1
 * `approval-changed` SSE event, §14 acceptance criterion 6).
 *
 * An approval is a studio-scoped request that an operator must explicitly
 * accept or reject before the underlying state transition (spec freeze,
 * asset promotion, budget bump, MEC sign-off, …) takes effect. The badge
 * count on the chrome is the cardinality of `status = "pending"` approvals
 * for the active studio.
 *
 * The state machine is intentionally trivial:
 *
 *   pending ──► approved | rejected         (resolved is terminal)
 *
 * V1 only persists the latest in-memory; once a real table lands the same
 * shapes will round-trip through Drizzle without UI changes.
 */

import { z } from "zod";

export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const APPROVAL_KINDS = [
  "spec-freeze",
  "mechanic-impl",
  "asset-final",
  "budget-increase",
  "level-promote",
  "other",
] as const;
export type ApprovalKind = (typeof APPROVAL_KINDS)[number];

export const approvalResolutionSchema = z.object({
  approverHandle: z.string().min(1),
  resolvedAt: z.string().min(1),
  comment: z.string().nullable(),
});
export type ApprovalResolution = z.infer<typeof approvalResolutionSchema>;

export const approvalSummarySchema = z.object({
  id: z.string().min(1),
  studioId: z.string().min(1),
  gameId: z.string().min(1).nullable(),
  specId: z.string().min(1).nullable(),
  kind: z.enum(APPROVAL_KINDS),
  title: z.string().min(1),
  body: z.string(),
  requestedByHandle: z.string().min(1),
  status: z.enum(APPROVAL_STATUSES),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  resolution: approvalResolutionSchema.nullable(),
});
export type ApprovalSummary = z.infer<typeof approvalSummarySchema>;

export const approvalListResponseSchema = z.object({
  studioId: z.string().min(1),
  pendingCount: z.number().int().nonnegative(),
  approvals: z.array(approvalSummarySchema),
});
export type ApprovalListResponse = z.infer<typeof approvalListResponseSchema>;

export const approvalResolveInputSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  approverHandle: z.string().min(1),
  comment: z.string().nullable().optional(),
});
export type ApprovalResolveInput = z.infer<typeof approvalResolveInputSchema>;

export function isApprovalTerminal(status: ApprovalStatus): boolean {
  return status === "approved" || status === "rejected";
}
