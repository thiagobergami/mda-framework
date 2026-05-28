import { isInCurrentMonth, type CostEvent } from "@mda-studio/shared";
import type { CostEventsStore } from "./cost-events-store.js";

function nowIso(): string {
  return new Date().toISOString();
}

export function createMemoryCostEventsStore(): CostEventsStore {
  const events = new Map<string, CostEvent>();
  let seq = 0;

  return {
    async record(input) {
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
      return event;
    },
    async listForGame(gameId, opts = {}) {
      const now = new Date();
      return Array.from(events.values()).filter((e) => {
        if (e.gameId !== gameId) return false;
        if (opts.mtdOnly && !isInCurrentMonth(e.occurredAt, now)) return false;
        return true;
      });
    },
    async clear() {
      events.clear();
      seq = 0;
    },
  };
}
