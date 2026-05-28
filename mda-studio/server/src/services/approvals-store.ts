/**
 * In-memory approvals store (phase U7).
 *
 * Mirrors the wire shapes in `@mda-studio/shared/approvals`. Stays in
 * process for V1 — same lifecycle as `issues-store` and
 * `validator-runs-store`. Stores publish `approval-changed` whenever an
 * approval is created or moved out of `pending` so the chrome badge can
 * refresh without a poll.
 */

import {
  isApprovalTerminal,
  type ApprovalKind,
  type ApprovalResolution,
  type ApprovalStatus,
  type ApprovalSummary,
} from "@mda-studio/shared";
import { recordActivity } from "./activity-log-store.js";
import { publishStudioEvent } from "./studio-events.js";
import { getApprovalsStore } from "./stores/approvals-store.js";

const approvals = new Map<string, ApprovalSummary>();
let approvalSeq = 0;

function nowIso(): string {
  return new Date().toISOString();
}

export interface CreateApprovalInput {
  studioId: string;
  gameId: string | null;
  specId: string | null;
  kind: ApprovalKind;
  title: string;
  body?: string;
  requestedByHandle: string;
}

export function createApproval(input: CreateApprovalInput): ApprovalSummary {
  approvalSeq += 1;
  const id = `APV-${String(approvalSeq).padStart(3, "0")}`;
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
  void getApprovalsStore().then((s) => s.create(input));
  publishStudioEvent({
    type: "approval-changed",
    studioId: input.studioId,
    approvalId: id,
  });
  recordActivity({
    studioId: input.studioId,
    gameId: approval.gameId,
    specId: approval.specId,
    kind: "approval-requested",
    summary: `${input.requestedByHandle} requested approval (${approval.kind}): ${approval.title}`,
    actor: input.requestedByHandle,
  });
  return approval;
}

export function getApproval(id: string): ApprovalSummary | undefined {
  return approvals.get(id);
}

export interface ResolveApprovalInput {
  status: Exclude<ApprovalStatus, "pending">;
  approverHandle: string;
  comment?: string | null;
}

export type ResolveApprovalResult =
  | { ok: true; approval: ApprovalSummary }
  | {
      ok: false;
      code: "not_found" | "already_resolved";
      message: string;
    };

export function resolveApproval(
  id: string,
  patch: ResolveApprovalInput,
): ResolveApprovalResult {
  const current = approvals.get(id);
  if (!current) {
    return { ok: false, code: "not_found", message: `unknown approval ${id}` };
  }
  if (isApprovalTerminal(current.status)) {
    return {
      ok: false,
      code: "already_resolved",
      message: `approval ${id} is already ${current.status}`,
    };
  }
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
  void getApprovalsStore().then((s) =>
    s.resolve(id, {
      status: patch.status,
      approverHandle: patch.approverHandle,
      comment: patch.comment,
    }),
  );
  publishStudioEvent({
    type: "approval-changed",
    studioId: next.studioId,
    approvalId: next.id,
  });
  recordActivity({
    studioId: next.studioId,
    gameId: next.gameId,
    specId: next.specId,
    kind: patch.status === "approved" ? "approval-approved" : "approval-rejected",
    summary: `${patch.approverHandle} ${patch.status} ${next.id}: ${next.title}`,
    actor: patch.approverHandle,
  });
  return { ok: true, approval: next };
}

export interface ListApprovalsOptions {
  status?: ApprovalStatus;
}

export function listApprovalsForStudio(
  studioId: string,
  opts: ListApprovalsOptions = {},
): ApprovalSummary[] {
  return Array.from(approvals.values())
    .filter((a) => a.studioId === studioId)
    .filter((a) => (opts.status ? a.status === opts.status : true))
    .sort((a, b) => {
      const t = b.updatedAt.localeCompare(a.updatedAt);
      return t !== 0 ? t : b.id.localeCompare(a.id);
    });
}

export function countPendingApprovalsForStudio(studioId: string): number {
  let count = 0;
  for (const a of approvals.values()) {
    if (a.studioId === studioId && a.status === "pending") count += 1;
  }
  return count;
}

/** Test-only convenience. */
export function clearApprovalsStore(): void {
  approvals.clear();
  approvalSeq = 0;
  void getApprovalsStore().then((s) => s.clear());
}

/** Rehydrate the shadow Map from persistence on startup. */
export async function rehydrateApprovalsFromStore(
  studioIds: readonly string[],
): Promise<void> {
  const store = await getApprovalsStore();
  approvals.clear();
  let maxSeq = 0;
  for (const studioId of studioIds) {
    for (const a of await store.listForStudio(studioId)) {
      approvals.set(a.id, a);
      const m = /^APV-(\d+)$/.exec(a.id);
      if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
    }
  }
  approvalSeq = maxSeq;
}
