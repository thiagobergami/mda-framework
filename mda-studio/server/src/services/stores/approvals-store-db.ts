import { sql } from "drizzle-orm";
import {
  isApprovalTerminal,
  type ApprovalResolution,
  type ApprovalSummary,
} from "@mda-studio/shared";

import { getDb } from "./db-handle.js";
import type { ApprovalsStore } from "./approvals-store.js";

interface Drizzle {
  execute: (q: unknown) => Promise<{ rows?: Record<string, unknown>[] } | unknown[]>;
}

async function rowsOf(d: Drizzle, q: unknown): Promise<Record<string, unknown>[]> {
  const result = await d.execute(q);
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  return (result as { rows?: Record<string, unknown>[] }).rows ?? [];
}

function rowToApproval(r: Record<string, unknown>): ApprovalSummary {
  const resolvedAt = r["resolution_resolved_at"];
  const resolution: ApprovalResolution | null =
    typeof resolvedAt === "string"
      ? {
          approverHandle: String(r["resolution_approver_handle"]),
          resolvedAt,
          comment:
            r["resolution_comment"] == null
              ? null
              : String(r["resolution_comment"]),
        }
      : null;
  return {
    id: String(r["id"]),
    studioId: String(r["studio_id"]),
    gameId: r["game_id"] == null ? null : String(r["game_id"]),
    specId: r["spec_id"] == null ? null : String(r["spec_id"]),
    kind: r["kind"] as ApprovalSummary["kind"],
    title: String(r["title"]),
    body: String(r["body"]),
    requestedByHandle: String(r["requested_by_handle"]),
    status: r["status"] as ApprovalSummary["status"],
    createdAt: String(r["created_at"]),
    updatedAt: String(r["updated_at"]),
    resolution,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function createDbApprovalsStore(): Promise<ApprovalsStore> {
  const { drizzle } = await getDb();
  const d = drizzle as Drizzle;
  let seq = await maxSeq(d);

  async function getById(id: string): Promise<ApprovalSummary | undefined> {
    const rows = await rowsOf(d, sql`SELECT * FROM approvals WHERE id = ${id}`);
    const r = rows[0];
    return r ? rowToApproval(r) : undefined;
  }

  return {
    async create(input) {
      seq += 1;
      const id = `APV-${String(seq).padStart(3, "0")}`;
      const approval: ApprovalSummary = {
        id,
        studioId: input.studioId,
        gameId: input.gameId,
        specId: input.specId,
        kind: input.kind,
        title: input.title,
        body: input.body ?? "",
        requestedByHandle: input.requestedByHandle,
        status: "pending",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        resolution: null,
      };
      await d.execute(sql`
        INSERT INTO approvals
          (id, studio_id, game_id, spec_id, kind, title, body,
           requested_by_handle, status, created_at, updated_at)
        VALUES
          (${approval.id}, ${approval.studioId}, ${approval.gameId}, ${approval.specId},
           ${approval.kind}, ${approval.title}, ${approval.body},
           ${approval.requestedByHandle}, ${approval.status},
           ${approval.createdAt}, ${approval.updatedAt})
      `);
      return approval;
    },
    async get(id) {
      return getById(id);
    },
    async resolve(id, patch) {
      const current = await getById(id);
      if (!current) return undefined;
      if (isApprovalTerminal(current.status)) return undefined;
      const resolution: ApprovalResolution = {
        approverHandle: patch.approverHandle,
        resolvedAt: nowIso(),
        comment: patch.comment ?? null,
      };
      await d.execute(sql`
        UPDATE approvals
        SET status = ${patch.status},
            updated_at = ${resolution.resolvedAt},
            resolution_approver_handle = ${resolution.approverHandle},
            resolution_resolved_at = ${resolution.resolvedAt},
            resolution_comment = ${resolution.comment}
        WHERE id = ${id}
      `);
      return {
        ...current,
        status: patch.status,
        updatedAt: resolution.resolvedAt,
        resolution,
      };
    },
    async listForStudio(studioId, opts = {}) {
      const rows = opts.status
        ? await rowsOf(
            d,
            sql`SELECT * FROM approvals WHERE studio_id = ${studioId} AND status = ${opts.status} ORDER BY updated_at DESC, id DESC`,
          )
        : await rowsOf(
            d,
            sql`SELECT * FROM approvals WHERE studio_id = ${studioId} ORDER BY updated_at DESC, id DESC`,
          );
      return rows.map(rowToApproval);
    },
    async countPendingForStudio(studioId) {
      const rows = await rowsOf(
        d,
        sql`SELECT count(*)::int AS c FROM approvals WHERE studio_id = ${studioId} AND status = 'pending'`,
      );
      const r = rows[0];
      const c = r?.["c"];
      return typeof c === "number" ? c : Number(c ?? 0);
    },
    async clear() {
      await d.execute(sql`DELETE FROM approvals`);
      seq = 0;
    },
  };
}

async function maxSeq(d: Drizzle): Promise<number> {
  const rows = await rowsOf(
    d,
    sql`SELECT id FROM approvals ORDER BY id DESC LIMIT 1`,
  );
  const id = rows[0]?.["id"];
  if (typeof id !== "string") return 0;
  const m = /^APV-(\d+)$/.exec(id);
  return m ? Number(m[1]) : 0;
}
