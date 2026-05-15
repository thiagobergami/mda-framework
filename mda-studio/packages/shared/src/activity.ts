/**
 * Activity-log wire shapes (plan §4.4, §5, §14 U7).
 *
 * The activity log is the operator's "what happened, when, and to which
 * spec" feed. Every meaningful state transition is recorded by the
 * subsystem that produced it (issues, approvals, validator runs, cost
 * events), with a human-readable `summary` so the UI does not need to
 * synthesize one. The log is studio-scoped; `gameId` and `specId` narrow
 * the row for filtering.
 *
 * Activity is append-only and capped in-memory until the persistent
 * `activity_log` table lands. The chrome's slide-out shows newest-first
 * and supports `since` polling, but the SSE channel is still the primary
 * way the UI learns about new entries — the slide-out simply refetches.
 */

import { z } from "zod";

export const ACTIVITY_KINDS = [
  "issue-created",
  "issue-status-changed",
  "approval-requested",
  "approval-approved",
  "approval-rejected",
  "cost-event",
  "validator-run-completed",
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const activityEntrySchema = z.object({
  id: z.string().min(1),
  studioId: z.string().min(1),
  gameId: z.string().min(1).nullable(),
  specId: z.string().min(1).nullable(),
  kind: z.enum(ACTIVITY_KINDS),
  summary: z.string().min(1),
  actor: z.string().min(1).nullable(),
  createdAt: z.string().min(1),
});
export type ActivityEntry = z.infer<typeof activityEntrySchema>;

export const activityListResponseSchema = z.object({
  studioId: z.string().min(1),
  entries: z.array(activityEntrySchema),
});
export type ActivityListResponse = z.infer<typeof activityListResponseSchema>;
