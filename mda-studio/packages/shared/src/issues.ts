/**
 * Issue + comment + work-product + validator wire shapes used by the
 * spec-node detail endpoint (plan §7.3).
 *
 * The issue status state machine mirrors `design/mda-studio/spec.md §7.2`:
 *
 *   backlog     ──► todo | cancelled
 *   todo        ──► in_progress | blocked | cancelled
 *   in_progress ──► in_review | blocked | done | cancelled
 *   in_review   ──► in_progress | done | cancelled
 *   blocked     ──► todo | in_progress | cancelled
 *   done, cancelled                                   (terminal)
 *
 * Server enforces. UI consults the same table to render only legal
 * transitions in the status dropdown.
 */

import { z } from "zod";
import { ISSUE_STATUSES, type IssueStatus } from "./spec-tree";

export const ISSUE_PRIORITIES = ["critical", "high", "medium", "low"] as const;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const ISSUE_STATUS_TRANSITIONS: Readonly<
  Record<IssueStatus, readonly IssueStatus[]>
> = {
  backlog: ["todo", "cancelled"],
  todo: ["in_progress", "blocked", "cancelled"],
  in_progress: ["in_review", "blocked", "done", "cancelled"],
  in_review: ["in_progress", "done", "cancelled"],
  blocked: ["todo", "in_progress", "cancelled"],
  done: [],
  cancelled: [],
};

export function isLegalIssueTransition(
  from: IssueStatus,
  to: IssueStatus,
): boolean {
  return ISSUE_STATUS_TRANSITIONS[from].includes(to);
}

export function nextLegalIssueStatuses(from: IssueStatus): readonly IssueStatus[] {
  return ISSUE_STATUS_TRANSITIONS[from];
}

export const issueSummarySchema = z.object({
  id: z.string().min(1),
  gameId: z.string().min(1),
  specId: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(ISSUE_STATUSES),
  priority: z.enum(ISSUE_PRIORITIES),
  assigneeAgentId: z.string().min(1).nullable(),
  assigneeAgentHandle: z.string().min(1).nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type IssueSummary = z.infer<typeof issueSummarySchema>;

export const commentSummarySchema = z.object({
  id: z.string().min(1),
  issueId: z.string().min(1),
  authorHandle: z.string().min(1),
  body: z.string(),
  createdAt: z.string().min(1),
});
export type CommentSummary = z.infer<typeof commentSummarySchema>;

export const workProductKindSchema = z.enum([
  "file",
  "screenshot",
  "preview-url",
  "asset",
  "report",
]);
export type WorkProductKind = z.infer<typeof workProductKindSchema>;

export const workProductSummarySchema = z.object({
  id: z.string().min(1),
  issueId: z.string().min(1),
  kind: workProductKindSchema,
  label: z.string().min(1),
  href: z.string().nullable(),
  createdAt: z.string().min(1),
});
export type WorkProductSummary = z.infer<typeof workProductSummarySchema>;

export const validatorWarningSchema = z.object({
  specId: z.string().min(1),
  rule: z.string().min(1),
  message: z.string().min(1),
});
export type ValidatorWarning = z.infer<typeof validatorWarningSchema>;
