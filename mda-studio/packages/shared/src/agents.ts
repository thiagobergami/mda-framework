/**
 * Wire shapes for the chrome-level Org chart surface (plan §14 U7).
 *
 *   GET /api/games/:gameId/agents
 *
 * V1 derives roster from observed issue assignees — there is no agents
 * table yet. Each agent's "primary layer" is inferred from the MDA layer
 * of the specs they have most issues against, so the org chart can group
 * them by layer in a deterministic order.
 */

import { z } from "zod";
import { MDA_LAYERS } from "./mda";

export const agentRosterEntrySchema = z.object({
  agentId: z.string().min(1),
  handle: z.string().min(1),
  /** Most common MDA layer in their issue history. Null if none observed. */
  primaryLayer: z.enum(MDA_LAYERS).nullable(),
  /** Issues currently not in a terminal status. */
  activeIssueCount: z.number().int().nonnegative(),
  /** Issues in `done` or `cancelled`. */
  completedIssueCount: z.number().int().nonnegative(),
  totalIssueCount: z.number().int().nonnegative(),
});
export type AgentRosterEntry = z.infer<typeof agentRosterEntrySchema>;

export const agentRosterResponseSchema = z.object({
  gameId: z.string().min(1),
  generatedAt: z.string().min(1),
  agents: z.array(agentRosterEntrySchema),
});
export type AgentRosterResponse = z.infer<typeof agentRosterResponseSchema>;
