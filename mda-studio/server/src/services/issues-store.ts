/**
 * Issues facade — sync shadow + async persistence (D5.DB1b).
 *
 * The Maps below are the read-path source of truth. Every mutation also
 * persists to the configured store (memory or db) so a restart can
 * rehydrate the shadow from disk. The shadow + async-write pattern keeps
 * the existing free-function API intact so route files don't change.
 */

import {
  DEFAULT_STUDIO_ID,
  isLegalIssueTransition,
  type CommentSummary,
  type IssueStatus,
  type IssueSummary,
  type WorkProductSummary,
} from "@mda-studio/shared";
import { recordActivity } from "./activity-log-store.js";
import { publishStudioEvent } from "./studio-events.js";
import { getIssuesStore } from "./stores/issues-store.js";

const issues = new Map<string, IssueSummary>();
const comments = new Map<string, CommentSummary>();
const workProducts = new Map<string, WorkProductSummary>();

let issueSeq = 0;
let commentSeq = 0;
let workProductSeq = 0;

function nowIso(): string {
  return new Date().toISOString();
}

export interface CreateIssueInput {
  gameId: string;
  specId: string;
  title: string;
  status?: IssueStatus;
  priority?: IssueSummary["priority"];
  assigneeAgentId?: string | null;
  assigneeAgentHandle?: string | null;
}

export function createIssue(input: CreateIssueInput): IssueSummary {
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
  issues.set(id, issue);
  void getIssuesStore().then((s) => s.createIssue(input));
  publishStudioEvent({
    type: "node-changed",
    gameId: issue.gameId,
    specId: issue.specId,
  });
  recordActivity({
    studioId: DEFAULT_STUDIO_ID,
    gameId: issue.gameId,
    specId: issue.specId,
    kind: "issue-created",
    summary: `${issue.assigneeAgentHandle ?? "system"} created ${issue.id} on ${issue.specId}: ${issue.title}`,
    actor: issue.assigneeAgentHandle ?? null,
  });
  return issue;
}

export function getIssue(id: string): IssueSummary | undefined {
  return issues.get(id);
}

export interface UpdateIssueInput {
  status?: IssueStatus;
}

export type UpdateIssueResult =
  | { ok: true; issue: IssueSummary }
  | { ok: false; code: "not_found" | "illegal_transition"; message: string };

/**
 * Patch an issue. Currently only `status` is mutable from the UI; the
 * transition is checked against the state machine.
 */
export function updateIssue(
  id: string,
  patch: UpdateIssueInput,
): UpdateIssueResult {
  const current = issues.get(id);
  if (!current) {
    return { ok: false, code: "not_found", message: `unknown issue ${id}` };
  }
  if (patch.status !== undefined && patch.status !== current.status) {
    if (!isLegalIssueTransition(current.status, patch.status)) {
      return {
        ok: false,
        code: "illegal_transition",
        message: `${current.status} → ${patch.status} is not a legal transition`,
      };
    }
  }
  const next: IssueSummary = {
    ...current,
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    updatedAt: nowIso(),
  };
  issues.set(id, next);
  if (patch.status !== undefined && patch.status !== current.status) {
    void getIssuesStore().then((s) => s.updateIssue(id, { status: patch.status }));
  }
  if (patch.status !== undefined && patch.status !== current.status) {
    publishStudioEvent({
      type: "issue-status-changed",
      gameId: next.gameId,
      specId: next.specId,
      issueId: next.id,
    });
    publishStudioEvent({
      type: "node-changed",
      gameId: next.gameId,
      specId: next.specId,
    });
    recordActivity({
      studioId: DEFAULT_STUDIO_ID,
      gameId: next.gameId,
      specId: next.specId,
      kind: "issue-status-changed",
      summary: `${next.assigneeAgentHandle ?? "system"} moved ${next.id} from ${current.status} to ${patch.status}`,
      actor: next.assigneeAgentHandle ?? null,
    });
  }
  return { ok: true, issue: next };
}

export function listIssuesForSpec(
  gameId: string,
  specId: string,
): IssueSummary[] {
  return Array.from(issues.values())
    .filter((i) => i.gameId === gameId && i.specId === specId)
    .sort((a, b) => {
      const t = b.updatedAt.localeCompare(a.updatedAt);
      return t !== 0 ? t : b.id.localeCompare(a.id);
    });
}

export function listIssuesForGame(gameId: string): IssueSummary[] {
  return Array.from(issues.values()).filter((i) => i.gameId === gameId);
}

/**
 * Returns the single "active" issue for a (game, spec): the most recent
 * issue not in a terminal status. Used by the spec-tree assembler to fill
 * `activeIssueId` / `activeIssueStatus` / assignee fields on each node.
 */
export function findActiveIssueForSpec(
  gameId: string,
  specId: string,
): IssueSummary | undefined {
  return listIssuesForSpec(gameId, specId).find(
    (i) => i.status !== "done" && i.status !== "cancelled",
  );
}

export interface CreateCommentInput {
  issueId: string;
  authorHandle: string;
  body: string;
}

export function createComment(input: CreateCommentInput): CommentSummary {
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
}

export function listCommentsForIssues(
  issueIds: readonly string[],
  limit = 10,
): CommentSummary[] {
  const ids = new Set(issueIds);
  return Array.from(comments.values())
    .filter((c) => ids.has(c.issueId))
    .sort((a, b) => {
      const t = b.createdAt.localeCompare(a.createdAt);
      return t !== 0 ? t : b.id.localeCompare(a.id);
    })
    .slice(0, limit);
}

export interface CreateWorkProductInput {
  issueId: string;
  kind: WorkProductSummary["kind"];
  label: string;
  href?: string | null;
}

export function createWorkProduct(
  input: CreateWorkProductInput,
): WorkProductSummary {
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
}

export function listWorkProductsForIssues(
  issueIds: readonly string[],
  limit = 10,
): WorkProductSummary[] {
  const ids = new Set(issueIds);
  return Array.from(workProducts.values())
    .filter((wp) => ids.has(wp.issueId))
    .sort((a, b) => {
      const t = b.createdAt.localeCompare(a.createdAt);
      return t !== 0 ? t : b.id.localeCompare(a.id);
    })
    .slice(0, limit);
}

/** Test-only convenience to reset every collection. */
export function clearIssuesStore(): void {
  issues.clear();
  comments.clear();
  workProducts.clear();
  issueSeq = 0;
  commentSeq = 0;
  workProductSeq = 0;
  void getIssuesStore().then((s) => s.clear());
}

/**
 * Rehydrate the shadow Maps from the persistence store. Called from
 * `server/src/index.ts` after startup so DB-backed runs survive restarts.
 */
export async function rehydrateIssuesFromStore(): Promise<void> {
  const store = await getIssuesStore();
  // Only games we know about — issue rows for unregistered games would
  // confuse the in-memory shadow.
  // For V1 we just load every issue; the per-game filter happens at read.
  // Rehydrate is expected to run once on boot.
  const allByGame = new Map<string, IssueSummary[]>();
  // Pull issues for every game we know about. The caller is expected to
  // run this *after* the games-registry rehydrate so listForGame queries
  // produce results.
  const { listGames } = await import("./games-registry.js");
  for (const game of listGames()) {
    allByGame.set(game.gameId, await store.listForGame(game.gameId));
  }
  issues.clear();
  let maxSeq = 0;
  for (const [, list] of allByGame) {
    for (const issue of list) {
      issues.set(issue.id, issue);
      const m = /^ISS-(\d+)$/.exec(issue.id);
      if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
    }
  }
  issueSeq = maxSeq;
}
