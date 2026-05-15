/**
 * In-memory cost-event store. Forward-compatible with the eventual
 * `cost_events` table in Drizzle.
 *
 * V1 invariants:
 *   - costCents is a non-negative integer (validated at the route)
 *   - billingCode is either a valid spec id or null (orphan cost)
 *   - events are keyed by a monotonic id ("COST-001" …) for stable test
 *     ordering and so the future migration to a UUID PK is trivial
 */

import {
  formatCents,
  isInCurrentMonth,
  layerFromSpecId,
  type CostEvent,
  type CostEventInput,
} from "@mda-studio/shared";
import { recordActivity } from "./activity-log-store.js";
import { publishStudioEvent } from "./studio-events.js";

const events = new Map<string, CostEvent>();
let seq = 0;

function nowIso(): string {
  return new Date().toISOString();
}

export interface RecordCostEventResult {
  ok: true;
  event: CostEvent;
}
export interface RejectCostEventResult {
  ok: false;
  code: "invalid_billing_code";
  message: string;
}
export type RecordResult = RecordCostEventResult | RejectCostEventResult;

/**
 * Records a cost event. The route already ran zod validation; this
 * applies the studio-level lint:
 *   - billingCode present → must be a recognized spec id prefix
 *   - billingCode null    → accept, the rollup ignores it (orphan)
 */
export function recordCostEvent(input: CostEventInput): RecordResult {
  if (input.billingCode !== null && !layerFromSpecId(input.billingCode)) {
    return {
      ok: false,
      code: "invalid_billing_code",
      message: `billingCode "${input.billingCode}" is not a known spec id prefix`,
    };
  }
  seq += 1;
  const id = `COST-${String(seq).padStart(3, "0")}`;
  const event: CostEvent = {
    id,
    studioId: input.studioId,
    gameId: input.gameId,
    agentId: input.agentId ?? null,
    issueId: input.issueId ?? null,
    provider: input.provider,
    model: input.model,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    costCents: input.costCents,
    occurredAt: input.occurredAt,
    billingCode: input.billingCode,
    createdAt: nowIso(),
  };
  events.set(id, event);
  publishStudioEvent({
    type: "cost-event",
    gameId: event.gameId,
    specId: event.billingCode,
  });
  recordActivity({
    studioId: event.studioId,
    gameId: event.gameId,
    specId: event.billingCode,
    kind: "cost-event",
    summary: `${event.provider}/${event.model} spent ${formatCents(event.costCents)}${event.billingCode ? ` on ${event.billingCode}` : ""}`,
    actor: event.agentId,
  });
  return { ok: true, event };
}

/** Returns all events for the game, optionally filtered to current MTD. */
export function listCostEventsForGame(
  gameId: string,
  opts: { mtdOnly?: boolean } = {},
): CostEvent[] {
  const now = new Date();
  return Array.from(events.values()).filter((e) => {
    if (e.gameId !== gameId) return false;
    if (opts.mtdOnly && !isInCurrentMonth(e.occurredAt, now)) return false;
    return true;
  });
}

export function clearCostEventsStore(): void {
  events.clear();
  seq = 0;
}
