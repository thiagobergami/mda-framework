import { useState } from "react";
import {
  ISSUE_STATUSES,
  nextLegalIssueStatuses,
  type IssueStatus,
  type IssueSummary,
} from "@mda-studio/shared";

interface IssueMiniListProps {
  issues: readonly IssueSummary[];
  /** Called after a successful status PATCH so the tree can refetch. */
  onStatusChanged?: (issueId: string) => void;
}

export function IssueMiniList({
  issues,
  onStatusChanged,
}: IssueMiniListProps): JSX.Element {
  if (issues.length === 0) {
    return (
      <p className="drawer__sentence">
        No issues linked to this spec yet.
      </p>
    );
  }
  return (
    <ul className="issue-list">
      {issues.map((issue) => (
        <IssueRow
          key={issue.id}
          issue={issue}
          onStatusChanged={onStatusChanged}
        />
      ))}
    </ul>
  );
}

interface IssueRowProps {
  issue: IssueSummary;
  onStatusChanged?: (issueId: string) => void;
}

function IssueRow({ issue, onStatusChanged }: IssueRowProps): JSX.Element {
  const [status, setStatus] = useState<IssueStatus>(issue.status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const legalNext = nextLegalIssueStatuses(status);
  const allowedSet = new Set<IssueStatus>([status, ...legalNext]);

  const onChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ): Promise<void> => {
    const next = e.target.value as IssueStatus;
    if (next === status) return;
    const previous = status;
    setStatus(next);
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issue.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `${res.status}`);
      }
      onStatusChanged?.(issue.id);
    } catch (err) {
      setStatus(previous);
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  };

  const terminal = legalNext.length === 0;

  return (
    <li className="issue-list__row">
      <div className="issue-list__meta">
        <code className="issue-list__id">{issue.id}</code>
        <span className="issue-list__priority" data-priority={issue.priority}>
          {issue.priority}
        </span>
        {issue.assigneeAgentHandle && (
          <span className="assignee-chip">{issue.assigneeAgentHandle}</span>
        )}
      </div>
      <div className="issue-list__title">{issue.title}</div>
      <div className="issue-list__controls">
        <label
          htmlFor={`status-${issue.id}`}
          className="issue-list__label"
        >
          status
        </label>
        <select
          id={`status-${issue.id}`}
          className="issue-list__status"
          value={status}
          onChange={onChange}
          disabled={pending || terminal}
          aria-label={`Change status of ${issue.id}`}
        >
          {ISSUE_STATUSES.map((s) => (
            <option key={s} value={s} disabled={!allowedSet.has(s)}>
              {s}
            </option>
          ))}
        </select>
        {pending && <span className="muted">…</span>}
        {error && (
          <span className="warn-badge" role="alert">
            {error}
          </span>
        )}
      </div>
    </li>
  );
}
