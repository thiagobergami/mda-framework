/**
 * Activity slide-out (plan §4.4 / §5 / §14 U7).
 *
 * Right-side overlay panel listing the most recent studio events
 * newest-first. Each row shows the kind, summary, optional actor and
 * deep-link chips for the game / spec it pertains to. The slide-out
 * supports keyboard dismissal (the parent wires Esc) and traps focus on
 * its close button when mounted.
 *
 * Live updates are handled by the parent: it calls `refetch` whenever
 * any of the upstream SSE events fire.
 */

import { useEffect, useRef } from "react";
import {
  type ActivityEntry,
  type ActivityKind,
} from "@mda-studio/shared";
import { useActivity } from "../hooks/useActivity";

const KIND_LABEL: Readonly<Record<ActivityKind, string>> = {
  "issue-created": "issue",
  "issue-status-changed": "status",
  "approval-requested": "approval",
  "approval-approved": "approved",
  "approval-rejected": "rejected",
  "cost-event": "cost",
  "validator-run-completed": "validate",
};

interface ActivitySlideoutProps {
  studioId: string;
  /** When set, the slide-out narrows to a single game. */
  gameId?: string;
  open: boolean;
  onClose: () => void;
  onPickSpec?: (specId: string) => void;
  /** Imperative refetch hook for the parent's SSE handler. */
  registerRefetch?: (refetch: () => void) => void;
}

export function ActivitySlideout({
  studioId,
  gameId,
  open,
  onClose,
  onPickSpec,
  registerRefetch,
}: ActivitySlideoutProps): JSX.Element | null {
  const { status, data, error, refetch } = useActivity({
    studioId,
    gameId,
    limit: 100,
    enabled: open,
  });

  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Let the parent invalidate this panel from its SSE handler.
  useEffect(() => {
    if (open) registerRefetch?.(refetch);
  }, [open, refetch, registerRefetch]);

  // Focus the close button on open (focus-trap fallback).
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <aside
      className="activity-slideout"
      role="dialog"
      aria-modal="false"
      aria-label="Activity log"
    >
      <header className="activity-slideout__head">
        <button
          ref={closeRef}
          type="button"
          className="drawer__close"
          onClick={onClose}
          aria-label="Close activity panel"
        >
          ×
        </button>
        <h2>Activity</h2>
        <p className="muted">
          {gameId
            ? `Latest events for ${gameId}`
            : "Latest events across the studio"}
        </p>
      </header>
      <div className="activity-slideout__body">
        {status === "loading" && (
          <p className="muted">Loading activity…</p>
        )}
        {status === "error" && (
          <p className="warn-badge" role="alert">
            Could not load activity: {error ?? "unknown error"}
          </p>
        )}
        {status === "ready" && data && data.entries.length === 0 && (
          <p className="muted">No activity yet.</p>
        )}
        {status === "ready" && data && data.entries.length > 0 && (
          <ol className="activity-list">
            {data.entries.map((e) => (
              <ActivityRow
                key={e.id}
                entry={e}
                onPickSpec={onPickSpec}
              />
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}

function ActivityRow({
  entry,
  onPickSpec,
}: {
  entry: ActivityEntry;
  onPickSpec?: (specId: string) => void;
}): JSX.Element {
  return (
    <li className="activity-row" data-kind={entry.kind}>
      <div className="activity-row__meta">
        <span className="palette__kind">{KIND_LABEL[entry.kind]}</span>
        <span className="muted" title={entry.createdAt}>
          {formatRelative(entry.createdAt)}
        </span>
        {entry.actor && (
          <span className="assignee-chip">{entry.actor}</span>
        )}
        {entry.specId &&
          (onPickSpec ? (
            <button
              type="button"
              className="lens-chip"
              onClick={() => onPickSpec(entry.specId!)}
              aria-label={`Open ${entry.specId} in tree`}
            >
              {entry.specId}
            </button>
          ) : (
            <code className="issue-list__id">{entry.specId}</code>
          ))}
      </div>
      <div className="activity-row__summary">{entry.summary}</div>
    </li>
  );
}

/**
 * Lightweight relative formatter — "just now / 3m / 2h / 4d".
 * Kept inline to avoid pulling in a date library for one line of UI.
 */
function formatRelative(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  const seconds = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (seconds < 30) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
