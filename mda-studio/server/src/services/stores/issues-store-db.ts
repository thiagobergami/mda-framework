import { sql } from "drizzle-orm";
import { isLegalIssueTransition } from "@mda-studio/shared";
import type {
  CommentSummary,
  IssueSummary,
  WorkProductSummary,
} from "@mda-studio/shared";

import { getDb } from "./db-handle.js";
import type { IssuesStore } from "./issues-store.js";

interface Drizzle {
  execute: (q: unknown) => Promise<{ rows?: Record<string, unknown>[] } | unknown[]>;
}

async function rowsOf(d: Drizzle, q: unknown): Promise<Record<string, unknown>[]> {
  const result = await d.execute(q);
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  return (result as { rows?: Record<string, unknown>[] }).rows ?? [];
}

function rowToIssue(r: Record<string, unknown>): IssueSummary {
  return {
    id: String(r["id"]),
    gameId: String(r["game_id"]),
    specId: String(r["spec_id"]),
    title: String(r["title"]),
    status: r["status"] as IssueSummary["status"],
    priority: r["priority"] as IssueSummary["priority"],
    assigneeAgentId: r["assignee_agent_id"] == null ? null : String(r["assignee_agent_id"]),
    assigneeAgentHandle:
      r["assignee_agent_handle"] == null ? null : String(r["assignee_agent_handle"]),
    createdAt: String(r["created_at"]),
    updatedAt: String(r["updated_at"]),
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Drizzle-backed issues store. The schema uses text PKs (`ISS-001` …) so
 * the id shape matches the in-memory store and existing fixtures keep
 * working without renumbering.
 *
 * Comments and work-products are kept in process-local Maps because the
 * V1-lite schema doesn't define their tables yet (the in-memory store
 * holds them too). Adding their tables is a follow-up; the contract is
 * already in place.
 */
export async function createDbIssuesStore(): Promise<IssuesStore> {
  const { drizzle } = await getDb();
  const d = drizzle as Drizzle;

  // Sequence tracked in-process. Pglite has SEQUENCEs available; in V1
  // this single-process server doesn't need them.
  let issueSeq = await maxIssueSeq(d);

  // Comments / work-products: in-process until the schema lands.
  const comments = new Map<string, CommentSummary>();
  const workProducts = new Map<string, WorkProductSummary>();
  let commentSeq = 0;
  let workProductSeq = 0;

  async function getIssueById(id: string): Promise<IssueSummary | undefined> {
    const rows = await rowsOf(d, sql`SELECT * FROM issues WHERE id = ${id}`);
    const r = rows[0];
    return r ? rowToIssue(r) : undefined;
  }

  return {
    async createIssue(input) {
      issueSeq += 1;
      const id = `ISS-${String(issueSeq).padStart(3, "0")}`;
      const issue: IssueSummary = {
        id,
        gameId: input.gameId,
        specId: input.specId,
        title: input.title,
        status: input.status ?? "todo",
        priority: input.priority ?? "medium",
        assigneeAgentId: input.assigneeAgentId ?? null,
        assigneeAgentHandle: input.assigneeAgentHandle ?? null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await d.execute(sql`
        INSERT INTO issues
          (id, game_id, spec_id, title, status, priority,
           assignee_agent_id, assignee_agent_handle, created_at, updated_at)
        VALUES
          (${issue.id}, ${issue.gameId}, ${issue.specId}, ${issue.title},
           ${issue.status}, ${issue.priority},
           ${issue.assigneeAgentId}, ${issue.assigneeAgentHandle},
           ${issue.createdAt}, ${issue.updatedAt})
      `);
      return issue;
    },
    async getIssue(id) {
      return getIssueById(id);
    },
    async updateIssue(id, patch) {
      const existing = await getIssueById(id);
      if (!existing) return undefined;
      if (
        patch.status !== undefined &&
        patch.status !== existing.status &&
        !isLegalIssueTransition(existing.status, patch.status)
      ) {
        return undefined;
      }
      const status = patch.status ?? existing.status;
      const updatedAt = nowIso();
      await d.execute(sql`
        UPDATE issues
        SET status = ${status}, updated_at = ${updatedAt}
        WHERE id = ${id}
      `);
      return { ...existing, status, updatedAt };
    },
    async listForGame(gameId) {
      const rows = await rowsOf(
        d,
        sql`SELECT * FROM issues WHERE game_id = ${gameId}`,
      );
      return rows.map(rowToIssue);
    },
    async listForSpec(gameId, specId) {
      const rows = await rowsOf(
        d,
        sql`SELECT * FROM issues WHERE game_id = ${gameId} AND spec_id = ${specId} ORDER BY updated_at DESC, id DESC`,
      );
      return rows.map(rowToIssue);
    },

    async createComment(input) {
      commentSeq += 1;
      const c: CommentSummary = {
        id: `CMT-${String(commentSeq).padStart(3, "0")}`,
        issueId: input.issueId,
        authorHandle: input.authorHandle,
        body: input.body,
        createdAt: nowIso(),
      };
      comments.set(c.id, c);
      return c;
    },
    async listComments(issueIds, limit) {
      const ids = new Set(issueIds);
      return Array.from(comments.values())
        .filter((c) => ids.has(c.issueId))
        .sort((a, b) => {
          const t = b.createdAt.localeCompare(a.createdAt);
          return t !== 0 ? t : b.id.localeCompare(a.id);
        })
        .slice(0, limit);
    },

    async createWorkProduct(input) {
      workProductSeq += 1;
      const wp: WorkProductSummary = {
        id: `WP-${String(workProductSeq).padStart(3, "0")}`,
        issueId: input.issueId,
        kind: input.kind,
        label: input.label,
        href: input.href ?? null,
        createdAt: nowIso(),
      };
      workProducts.set(wp.id, wp);
      return wp;
    },
    async listWorkProducts(issueIds, limit) {
      const ids = new Set(issueIds);
      return Array.from(workProducts.values())
        .filter((wp) => ids.has(wp.issueId))
        .sort((a, b) => {
          const t = b.createdAt.localeCompare(a.createdAt);
          return t !== 0 ? t : b.id.localeCompare(a.id);
        })
        .slice(0, limit);
    },

    async clear() {
      await d.execute(sql`DELETE FROM issues`);
      issueSeq = 0;
      comments.clear();
      workProducts.clear();
      commentSeq = 0;
      workProductSeq = 0;
    },
  };
}

async function maxIssueSeq(d: Drizzle): Promise<number> {
  const rows = await rowsOf(
    d,
    sql`SELECT id FROM issues ORDER BY id DESC LIMIT 1`,
  );
  const id = rows[0]?.["id"];
  if (typeof id !== "string") return 0;
  const m = /^ISS-(\d+)$/.exec(id);
  return m ? Number(m[1]) : 0;
}
