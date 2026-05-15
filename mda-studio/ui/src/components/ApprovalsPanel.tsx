/**
 * Approvals queue view (plan §6 ApprovalSheet, §14 acceptance criterion 6).
 *
 * Two modes:
 *   filter="pending"  — operator triage view, focused on actionable items
 *   filter="all"      — history including resolved entries
 *
 * Each pending approval has inline approve / reject buttons. Resolved
 * approvals render in a muted style with the approver + comment.
 *
 * The panel is intentionally self-contained: pass it a studio id and an
 * optional callback for "show this spec" (so an approval row can deep-link
 * back into the tree), and it manages fetch, refresh, and PATCH itself.
 */

import { useCallback, useMemo, useState } from "react";
import {
  type ApprovalKind,
  type ApprovalSummary,
} from "@mda-studio/shared";
import {
  resolveApprovalRequest,
  useApprovals,
} from "../hooks/useApprovals";

interface ApprovalsPanelProps {
  studioId: string;
  filter?: "pending" | "all";
  approverHandle?: string;
  /** Caller may navigate to the spec node when the chip is clicked. */
  onPickSpec?: (specId: string) => void;
  /** Caller may want to know when a resolution happens (chrome refresh). */
  onResolved?: () => void;
}

const KIND_LABELS: Readonly<Record<ApprovalKind, string>> = {
  "spec-freeze": "Spec freeze",
  "mechanic-impl": "Mechanic impl",
  "asset-final": "Asset final",
  "budget-increase": "Budget increase",
  "level-promote": "Level promote",
  other: "Other",
};

export function ApprovalsPanel({
  studioId,
  filter = "pending",
  approverHandle = "@director",
  onPickSpec,
  onResolved,
}: ApprovalsPanelProps): JSX.Element {
  const statusFilter = filter === "pending" ? "pending" : undefined;
  const { status, data, error, refetch } = useApprovals({
    studioId,
    status: statusFilter,
  });

  const pendingCount = data?.pendingCount ?? 0;
  const approvals = data?.approvals ?? [];

  if (status === "loading") {
    return (
      <section className="approvals-panel" aria-label="Approvals queue">
        <p className="muted">Loading approvals…</p>
      </section>
    );
  }
  if (status === "error" || !data) {
    return (
      <section className="approvals-panel" aria-label="Approvals queue">
        <p className="warn-badge" role="alert">
          Could not load approvals: {error ?? "unknown error"}
        </p>
      </section>
    );
  }

  return (
    <section className="approvals-panel" aria-label="Approvals queue">
      <header className="approvals-panel__head">
        <h1>Approvals</h1>
        <span className="muted">
          {pendingCount} pending · showing {approvals.length}{" "}
          {filter === "pending" ? "pending" : "approvals"}
        </span>
      </header>
      {approvals.length === 0 ? (
        <p className="muted">
          {filter === "pending"
            ? "Nothing waiting on you. Resolved approvals are still on record under the all-history filter."
            : "No approvals yet for this studio."}
        </p>
      ) : (
        <ul className="approvals-panel__list">
          {approvals.map((a) => (
            <ApprovalRow
              key={a.id}
              approval={a}
              approverHandle={approverHandle}
              onPickSpec={onPickSpec}
              onResolved={() => {
                refetch();
                onResolved?.();
              }}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface ApprovalRowProps {
  approval: ApprovalSummary;
  approverHandle: string;
  onPickSpec?: (specId: string) => void;
  onResolved: () => void;
}

function ApprovalRow({
  approval,
  approverHandle,
  onPickSpec,
  onResolved,
}: ApprovalRowProps): JSX.Element {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const submit = useCallback(
    async (status: "approved" | "rejected") => {
      setBusy(true);
      setErrorMsg(null);
      const r = await resolveApprovalRequest(approval.id, {
        status,
        approverHandle,
        comment: comment.trim() === "" ? null : comment.trim(),
      });
      setBusy(false);
      if (!r.ok) {
        setErrorMsg(r.error);
        return;
      }
      onResolved();
    },
    [approval.id, approverHandle, comment, onResolved],
  );

  const isPending = approval.status === "pending";
  const kindLabel = useMemo(() => KIND_LABELS[approval.kind], [approval.kind]);

  return (
    <li
      className="approvals-row"
      data-status={approval.status}
      aria-label={`Approval ${approval.id}: ${approval.title}`}
    >
      <div className="approvals-row__meta">
        <code className="issue-list__id">{approval.id}</code>
        <span className="palette__kind">{kindLabel}</span>
        <span
          className={
            isPending
              ? "issue-list__priority"
              : "issue-list__priority approvals-row__resolved"
          }
          data-priority={isPending ? "high" : ""}
        >
          {approval.status}
        </span>
        <span className="muted">{approval.requestedByHandle}</span>
        {approval.specId && onPickSpec ? (
          <button
            type="button"
            className="lens-chip"
            onClick={() => onPickSpec(approval.specId!)}
            aria-label={`Open ${approval.specId} in tree`}
          >
            {approval.specId}
          </button>
        ) : approval.specId ? (
          <code className="issue-list__id">{approval.specId}</code>
        ) : null}
      </div>
      <div className="issue-list__title">{approval.title}</div>
      {approval.body && (
        <p className="drawer__sentence">{approval.body}</p>
      )}
      {approval.resolution && (
        <p className="drawer__sentence approvals-row__resolution">
          Resolved by {approval.resolution.approverHandle} at{" "}
          {approval.resolution.resolvedAt}
          {approval.resolution.comment
            ? ` — ${approval.resolution.comment}`
            : ""}
        </p>
      )}
      {isPending && (
        <div className="approvals-row__controls">
          <input
            className="chrome__search"
            type="text"
            placeholder="Optional comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            aria-label={`Comment for ${approval.id}`}
          />
          <button
            type="button"
            className="approvals-row__approve"
            onClick={() => void submit("approved")}
            disabled={busy}
          >
            Approve
          </button>
          <button
            type="button"
            className="approvals-row__reject"
            onClick={() => void submit("rejected")}
            disabled={busy}
          >
            Reject
          </button>
        </div>
      )}
      {errorMsg && (
        <p className="warn-badge" role="alert">
          {errorMsg}
        </p>
      )}
    </li>
  );
}
