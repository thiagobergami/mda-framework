import {
  isApprovalTerminal,
  type ApprovalResolution,
  type ApprovalSummary,
} from "@mda-studio/shared";

import type { ApprovalsStore } from "./approvals-store.js";

function nowIso(): string {
  return new Date().toISOString();
}

export function createMemoryApprovalsStore(): ApprovalsStore {
  const approvals = new Map<string, ApprovalSummary>();
  let seq = 0;

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
      approvals.set(id, approval);
      return approval;
    },
    async get(id) {
      return approvals.get(id);
    },
    async resolve(id, patch) {
      const current = approvals.get(id);
      if (!current) return undefined;
      if (isApprovalTerminal(current.status)) return undefined;
      const resolution: ApprovalResolution = {
        approverHandle: patch.approverHandle,
        resolvedAt: nowIso(),
        comment: patch.comment ?? null,
      };
      const next: ApprovalSummary = {
        ...current,
        status: patch.status,
        updatedAt: resolution.resolvedAt,
        resolution,
      };
      approvals.set(id, next);
      return next;
    },
    async listForStudio(studioId, opts = {}) {
      return Array.from(approvals.values())
        .filter((a) => a.studioId === studioId)
        .filter((a) => (opts.status ? a.status === opts.status : true))
        .sort((a, b) => {
          const t = b.updatedAt.localeCompare(a.updatedAt);
          return t !== 0 ? t : b.id.localeCompare(a.id);
        });
    },
    async countPendingForStudio(studioId) {
      let count = 0;
      for (const a of approvals.values()) {
        if (a.studioId === studioId && a.status === "pending") count += 1;
      }
      return count;
    },
    async clear() {
      approvals.clear();
      seq = 0;
    },
  };
}
