/**
 * Wire schema for the SSE channel that powers the spec-tree-ui's live
 * updates (plan §9.1).
 *
 * Both server (publisher) and client (consumer) import these types so the
 * SSE `event:` lines and JSON `data:` payloads never drift. The discriminator
 * is the literal `type` field; each variant carries the minimum scope keys
 * a client needs to decide which query to invalidate.
 *
 *   node-changed              gameId, specId
 *   issue-status-changed      gameId, specId, issueId
 *   cost-event                gameId, specId | null
 *   validator-run-completed   gameId
 *   approval-changed          studioId, approvalId
 */

import { z } from "zod";

export const STUDIO_EVENT_TYPES = [
  "node-changed",
  "issue-status-changed",
  "cost-event",
  "validator-run-completed",
  "approval-changed",
] as const;

export type StudioEventType = (typeof STUDIO_EVENT_TYPES)[number];

export const nodeChangedEventSchema = z.object({
  type: z.literal("node-changed"),
  gameId: z.string().min(1),
  specId: z.string().min(1),
});
export type NodeChangedEvent = z.infer<typeof nodeChangedEventSchema>;

export const issueStatusChangedEventSchema = z.object({
  type: z.literal("issue-status-changed"),
  gameId: z.string().min(1),
  specId: z.string().min(1),
  issueId: z.string().min(1),
});
export type IssueStatusChangedEvent = z.infer<
  typeof issueStatusChangedEventSchema
>;

export const costEventEventSchema = z.object({
  type: z.literal("cost-event"),
  gameId: z.string().min(1),
  specId: z.string().min(1).nullable(),
});
export type CostEventEvent = z.infer<typeof costEventEventSchema>;

export const validatorRunCompletedEventSchema = z.object({
  type: z.literal("validator-run-completed"),
  gameId: z.string().min(1),
});
export type ValidatorRunCompletedEvent = z.infer<
  typeof validatorRunCompletedEventSchema
>;

export const approvalChangedEventSchema = z.object({
  type: z.literal("approval-changed"),
  studioId: z.string().min(1),
  approvalId: z.string().min(1),
});
export type ApprovalChangedEvent = z.infer<typeof approvalChangedEventSchema>;

export const studioEventSchema = z.discriminatedUnion("type", [
  nodeChangedEventSchema,
  issueStatusChangedEventSchema,
  costEventEventSchema,
  validatorRunCompletedEventSchema,
  approvalChangedEventSchema,
]);
export type StudioEvent = z.infer<typeof studioEventSchema>;

/** SSE-format one studio event: `event: <type>\ndata: <json>\n\n`. */
export function formatStudioEventSse(event: StudioEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
