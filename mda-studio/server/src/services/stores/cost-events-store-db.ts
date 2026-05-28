import { sql } from "drizzle-orm";
import { isInCurrentMonth, type CostEvent } from "@mda-studio/shared";

import { getDb } from "./db-handle.js";
import type { CostEventsStore } from "./cost-events-store.js";

interface Drizzle {
  execute: (q: unknown) => Promise<{ rows?: Record<string, unknown>[] } | unknown[]>;
}

async function rowsOf(d: Drizzle, q: unknown): Promise<Record<string, unknown>[]> {
  const result = await d.execute(q);
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  return (result as { rows?: Record<string, unknown>[] }).rows ?? [];
}

function rowToEvent(r: Record<string, unknown>): CostEvent {
  return {
    id: String(r["id"]),
    studioId: String(r["studio_id"]),
    gameId: String(r["game_id"]),
    agentId: r["agent_id"] == null ? null : String(r["agent_id"]),
    issueId: r["issue_id"] == null ? null : String(r["issue_id"]),
    provider: String(r["provider"]),
    model: String(r["model"]),
    inputTokens: Number(r["input_tokens"]),
    outputTokens: Number(r["output_tokens"]),
    costCents: Number(r["cost_cents"]),
    occurredAt: String(r["occurred_at"]),
    billingCode: r["billing_code"] == null ? null : String(r["billing_code"]),
    createdAt: String(r["created_at"]),
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function createDbCostEventsStore(): Promise<CostEventsStore> {
  const { drizzle } = await getDb();
  const d = drizzle as Drizzle;

  let seq = await maxSeq(d);

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
      await d.execute(sql`
        INSERT INTO cost_events
          (id, studio_id, game_id, agent_id, issue_id, provider, model,
           input_tokens, output_tokens, cost_cents, occurred_at,
           billing_code, created_at)
        VALUES
          (${event.id}, ${event.studioId}, ${event.gameId}, ${event.agentId}, ${event.issueId},
           ${event.provider}, ${event.model}, ${event.inputTokens}, ${event.outputTokens},
           ${event.costCents}, ${event.occurredAt}, ${event.billingCode}, ${event.createdAt})
      `);
      return event;
    },
    async listForGame(gameId, opts = {}) {
      const rows = await rowsOf(
        d,
        sql`SELECT * FROM cost_events WHERE game_id = ${gameId}`,
      );
      const now = new Date();
      const all = rows.map(rowToEvent);
      if (!opts.mtdOnly) return all;
      return all.filter((e) => isInCurrentMonth(e.occurredAt, now));
    },
    async clear() {
      await d.execute(sql`DELETE FROM cost_events`);
      seq = 0;
    },
  };
}

async function maxSeq(d: Drizzle): Promise<number> {
  const rows = await rowsOf(
    d,
    sql`SELECT id FROM cost_events ORDER BY id DESC LIMIT 1`,
  );
  const id = rows[0]?.["id"];
  if (typeof id !== "string") return 0;
  const m = /^COST-(\d+)$/.exec(id);
  return m ? Number(m[1]) : 0;
}
