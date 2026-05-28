import type {
  CommentSummary,
  IssueSummary,
  WorkProductSummary,
} from "@mda-studio/shared";
import { isLegalIssueTransition } from "@mda-studio/shared";

import type { IssuesStore } from "./issues-store.js";

function nowIso(): string {
  return new Date().toISOString();
}

export function createMemoryIssuesStore(): IssuesStore {
  const issues = new Map<string, IssueSummary>();
  const comments = new Map<string, CommentSummary>();
  const workProducts = new Map<string, WorkProductSummary>();
  let issueSeq = 0;
  let commentSeq = 0;
  let workProductSeq = 0;

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
      issues.set(id, issue);
      return issue;
    },
    async getIssue(id) {
      return issues.get(id);
    },
    async updateIssue(id, patch) {
      const current = issues.get(id);
      if (!current) return undefined;
      if (
        patch.status !== undefined &&
        patch.status !== current.status &&
        !isLegalIssueTransition(current.status, patch.status)
      ) {
        // Caller decides what to do with an undefined return when the
        // transition was the only change; the wrapper inspects.
        return undefined;
      }
      const next: IssueSummary = {
        ...current,
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        updatedAt: nowIso(),
      };
      issues.set(id, next);
      return next;
    },
    async listForGame(gameId) {
      return Array.from(issues.values()).filter((i) => i.gameId === gameId);
    },
    async listForSpec(gameId, specId) {
      return Array.from(issues.values())
        .filter((i) => i.gameId === gameId && i.specId === specId)
        .sort((a, b) => {
          const t = b.updatedAt.localeCompare(a.updatedAt);
          return t !== 0 ? t : b.id.localeCompare(a.id);
        });
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
      issues.clear();
      comments.clear();
      workProducts.clear();
      issueSeq = 0;
      commentSeq = 0;
      workProductSeq = 0;
    },
  };
}
