/**
 * Chrome-level Costs detail view (plan §14 U7, acceptance criterion 6).
 *
 * Layout (top → bottom):
 *   - header: total MTD, orphan total, scope chip if any
 *   - layer rollup: one row per MDA layer with %-of-total bar
 *   - top specs: table with own / subtree cents; spec id is clickable
 *   - recent events: newest cost ingestion events
 *
 * Deep-link from a tree CostChip narrows everything to a subtree via the
 * `scopeSpecId` prop. Tree nodes' "Clear scope" button removes it.
 */

import { useMemo } from "react";
import {
  formatCents,
  LAYER_GLYPHS,
  LAYER_LABELS,
  type CostsDetailLayer,
  type CostsDetailResponse,
  type CostsDetailSpecRow,
} from "@mda-studio/shared";
import { useCostsDetail } from "../hooks/useCostsDetail";

interface CostsDetailPanelProps {
  gameId: string;
  scopeSpecId?: string | null;
  /** Pick a spec from a row to deep-link back into the tree. */
  onPickSpec?: (specId: string) => void;
  onClearScope?: () => void;
}

export function CostsDetailPanel({
  gameId,
  scopeSpecId,
  onPickSpec,
  onClearScope,
}: CostsDetailPanelProps): JSX.Element {
  const { status, data, error } = useCostsDetail({
    gameId,
    scopeSpecId: scopeSpecId ?? null,
  });

  if (status === "loading" || status === "idle") {
    return (
      <section className="costs-panel" aria-label="Costs detail">
        <p className="muted">Loading costs…</p>
      </section>
    );
  }
  if (status === "error" || !data) {
    return (
      <section className="costs-panel" aria-label="Costs detail">
        <p className="warn-badge" role="alert">
          Could not load costs: {error ?? "unknown error"}
        </p>
      </section>
    );
  }

  return (
    <section className="costs-panel" aria-label="Costs detail">
      <header className="costs-panel__head">
        <h1>Costs</h1>
        <span className="muted">
          {formatCents(data.totalMtdCents)} MTD
          {data.orphanCents > 0
            ? ` · ${formatCents(data.orphanCents)} unattributed`
            : ""}
        </span>
        {scopeSpecId && (
          <span className="lens-chip" aria-label={`Scope: ${scopeSpecId}`}>
            Scope · {scopeSpecId}
            {onClearScope && (
              <button
                type="button"
                className="lens-chip__x"
                onClick={onClearScope}
                aria-label="Clear cost scope"
              >
                ×
              </button>
            )}
          </span>
        )}
      </header>
      <LayerRollup byLayer={data.byLayer} total={data.totalMtdCents} />
      <TopSpecs rows={data.bySpec} onPickSpec={onPickSpec} />
      <RecentEvents events={data.recentEvents} onPickSpec={onPickSpec} />
    </section>
  );
}

function LayerRollup({
  byLayer,
  total,
}: {
  byLayer: CostsDetailLayer[];
  total: number;
}): JSX.Element {
  if (byLayer.length === 0) {
    return (
      <section className="costs-panel__section" aria-label="Layer rollup">
        <h2>By layer</h2>
        <p className="muted">No spend recorded this month.</p>
      </section>
    );
  }
  return (
    <section className="costs-panel__section" aria-label="Layer rollup">
      <h2>By layer</h2>
      <ul className="costs-rollup">
        {byLayer.map((row) => {
          const pct = total > 0 ? Math.round((row.cents / total) * 100) : 0;
          return (
            <li className="costs-rollup__row" key={row.layer}>
              <span
                className="layer-glyph"
                title={`${LAYER_LABELS[row.layer]} layer`}
                style={{ background: `var(--mda-layer-${row.layer.toLowerCase()})` }}
              >
                {LAYER_GLYPHS[row.layer]}
              </span>
              <span className="costs-rollup__label">
                {LAYER_LABELS[row.layer]}
              </span>
              <span className="muted">{row.specCount} specs</span>
              <div className="costs-rollup__bar" aria-hidden="true">
                <div
                  className="costs-rollup__fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="costs-rollup__amount">
                {formatCents(row.cents)}
              </span>
              <span className="muted">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TopSpecs({
  rows,
  onPickSpec,
}: {
  rows: CostsDetailSpecRow[];
  onPickSpec?: (specId: string) => void;
}): JSX.Element {
  if (rows.length === 0) {
    return (
      <section className="costs-panel__section" aria-label="Top spec spend">
        <h2>Top specs</h2>
        <p className="muted">No spec-attributed events yet.</p>
      </section>
    );
  }
  return (
    <section className="costs-panel__section" aria-label="Top spec spend">
      <h2>Top specs</h2>
      <table className="costs-table">
        <thead>
          <tr>
            <th scope="col">Spec</th>
            <th scope="col">Title</th>
            <th scope="col" className="costs-table__num">
              Own
            </th>
            <th scope="col" className="costs-table__num">
              Subtree
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.specId}>
              <td>
                {onPickSpec ? (
                  <button
                    type="button"
                    className="lens-chip"
                    onClick={() => onPickSpec(row.specId)}
                    aria-label={`Open ${row.specId} in tree`}
                  >
                    {row.specId}
                  </button>
                ) : (
                  <code className="issue-list__id">{row.specId}</code>
                )}
              </td>
              <td>{row.title}</td>
              <td className="costs-table__num">{formatCents(row.ownCents)}</td>
              <td className="costs-table__num">
                {formatCents(row.subtreeCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function RecentEvents({
  events,
  onPickSpec,
}: {
  events: CostsDetailResponse["recentEvents"];
  onPickSpec?: (specId: string) => void;
}): JSX.Element {
  const rows = useMemo(
    () =>
      events.map((e) => ({
        ...e,
        when: formatTimestamp(e.occurredAt),
      })),
    [events],
  );
  if (rows.length === 0) {
    return (
      <section className="costs-panel__section" aria-label="Recent events">
        <h2>Recent events</h2>
        <p className="muted">No recent events.</p>
      </section>
    );
  }
  return (
    <section className="costs-panel__section" aria-label="Recent events">
      <h2>Recent events</h2>
      <table className="costs-table">
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">Provider</th>
            <th scope="col">Model</th>
            <th scope="col">Billed</th>
            <th scope="col" className="costs-table__num">
              Cost
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td title={r.occurredAt} className="muted">
                {r.when}
              </td>
              <td>{r.provider}</td>
              <td>{r.model}</td>
              <td>
                {r.billingCode ? (
                  onPickSpec ? (
                    <button
                      type="button"
                      className="lens-chip"
                      onClick={() => onPickSpec(r.billingCode!)}
                      aria-label={`Open ${r.billingCode} in tree`}
                    >
                      {r.billingCode}
                    </button>
                  ) : (
                    <code className="issue-list__id">{r.billingCode}</code>
                  )
                ) : (
                  <span className="muted">orphan</span>
                )}
              </td>
              <td className="costs-table__num">{formatCents(r.costCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function formatTimestamp(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  const d = new Date(t);
  return `${d.toISOString().slice(0, 10)} ${d
    .toISOString()
    .slice(11, 16)}Z`;
}
