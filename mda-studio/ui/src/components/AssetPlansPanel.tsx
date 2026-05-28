/**
 * Asset-plan operator surface.
 *
 * Scans `<specsRoot>/design/asset-plans/<asset-id>/` on the server and
 * surfaces each per-asset directory's state. D6.EN4 added live triggers
 * for `generate` / `exec` / `import`; each row carries its own state
 * machine so the operator can drive the pipeline without dropping to the
 * CLI.
 */

import { useState } from "react";
import {
  type AssetPlanEntry,
  type AssetPlanState,
} from "@mda-studio/shared";
import { useAssetPlans } from "../hooks/useAssetPlans";

const STATE_LABELS: Readonly<Record<AssetPlanState, string>> = {
  "no-plan": "no plan",
  planned: "planned",
  "in-progress": "in progress",
  imported: "imported",
  unknown: "unknown",
};

interface AssetPlansPanelProps {
  gameId: string;
}

type RowAction = "generate" | "exec" | "import";
type RowStatus = "idle" | "running" | "ok" | "fail";

interface RowFeedback {
  status: RowStatus;
  message: string | null;
}

export function AssetPlansPanel({ gameId }: AssetPlansPanelProps): JSX.Element {
  const { status, data, error, refetch } = useAssetPlans({ gameId });
  const [feedback, setFeedback] = useState<Record<string, RowFeedback>>({});

  const runAction = async (assetId: string, action: RowAction) => {
    setFeedback((f) => ({
      ...f,
      [assetId]: { status: "running", message: `${action} running…` },
    }));
    try {
      const res = await fetch(
        `/api/games/${gameId}/asset-plans/${assetId}/${action}`,
        { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setFeedback((f) => ({
          ...f,
          [assetId]: {
            status: "fail",
            message: body.error ?? `${action} failed (${res.status})`,
          },
        }));
        return;
      }
      setFeedback((f) => ({
        ...f,
        [assetId]: { status: "ok", message: `${action} complete` },
      }));
      refetch?.();
    } catch (err) {
      setFeedback((f) => ({
        ...f,
        [assetId]: {
          status: "fail",
          message: err instanceof Error ? err.message : String(err),
        },
      }));
    }
  };

  if (status === "loading" || status === "idle") {
    return (
      <section className="asset-plans-panel" aria-label="Asset plans">
        <p className="muted">Loading asset plans…</p>
      </section>
    );
  }
  if (status === "error" || !data) {
    return (
      <section className="asset-plans-panel" aria-label="Asset plans">
        <p className="warn-badge" role="alert">
          Could not load asset plans: {error ?? "unknown error"}
        </p>
      </section>
    );
  }

  return (
    <section className="asset-plans-panel" aria-label="Asset plans">
      <header className="asset-plans-panel__head">
        <h1>Asset plans</h1>
        <span className="muted">
          {data.entries.length} asset{data.entries.length === 1 ? "" : "s"} ·
          scanning <code>{data.rootPath}</code>
        </span>
      </header>
      {data.entries.length === 0 ? (
        <p className="muted">
          No asset plans found under <code>{data.rootPath}</code>. Use
          {" "}
          <code>mda asset-plan generate &lt;asset-id&gt;</code> to
          create one.
        </p>
      ) : (
        <ul className="asset-plans-list">
          {data.entries.map((e) => (
            <AssetPlanRow
              key={e.assetId}
              entry={e}
              feedback={feedback[e.assetId] ?? null}
              onAction={(action) => runAction(e.assetId, action)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function AssetPlanRow({
  entry,
  feedback,
  onAction,
}: {
  entry: AssetPlanEntry;
  feedback: RowFeedback | null;
  onAction: (action: RowAction) => void;
}): JSX.Element {
  const busy = feedback?.status === "running";
  return (
    <li
      className="asset-plans-row"
      data-state={entry.state}
      aria-label={`${entry.assetId} (${STATE_LABELS[entry.state]})`}
    >
      <div className="asset-plans-row__meta">
        <code className="issue-list__id">{entry.assetId}</code>
        <span className="palette__kind">{STATE_LABELS[entry.state]}</span>
        {entry.latestPlanVersion !== null && (
          <span className="muted">v{entry.latestPlanVersion}</span>
        )}
      </div>
      <div className="asset-plans-row__stats">
        <span className="muted">{entry.refsCount} refs</span>
        <span className="muted">{entry.artifactCount} artifacts</span>
        {entry.latestPlanFile && (
          <code className="asset-plans-row__path" title={entry.latestPlanFile}>
            {entry.latestPlanFile}
          </code>
        )}
      </div>
      <div className="asset-plans-row__actions">
        <button type="button" disabled={busy} onClick={() => onAction("generate")}>
          Generate
        </button>
        <button type="button" disabled={busy} onClick={() => onAction("exec")}>
          Exec
        </button>
        <button type="button" disabled={busy} onClick={() => onAction("import")}>
          Import
        </button>
      </div>
      {feedback?.message && (
        <p className="asset-plans-row__feedback" data-status={feedback.status}>
          {feedback.message}
        </p>
      )}
    </li>
  );
}
