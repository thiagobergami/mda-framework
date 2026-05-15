/**
 * Read-only asset-plan executor states (plan §14 U7).
 *
 * Scans `<specsRoot>/design/asset-plans/<asset-id>/` on the server and
 * surfaces each per-asset directory's state. Triggering generate / exec
 * / import from the UI is deferred (plan §17 OQ5).
 */

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

export function AssetPlansPanel({ gameId }: AssetPlansPanelProps): JSX.Element {
  const { status, data, error } = useAssetPlans({ gameId });

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
            <AssetPlanRow key={e.assetId} entry={e} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AssetPlanRow({ entry }: { entry: AssetPlanEntry }): JSX.Element {
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
    </li>
  );
}
