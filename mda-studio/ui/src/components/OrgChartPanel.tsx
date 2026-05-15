/**
 * Read-only org chart (plan §14 U7).
 *
 * V1 has no agents table — the roster is derived from observed issue
 * assignees. Agents are grouped under their inferred primary MDA layer
 * via simple indentation. Not interactive (plan §14 says explicitly:
 * "simple report-to indentation; not interactive").
 *
 * When the roster is empty (no issues yet) the panel prints a one-line
 * hint pointing the operator at the spec tree.
 */

import {
  LAYER_GLYPHS,
  LAYER_LABELS,
  MDA_LAYERS,
  type AgentRosterEntry,
  type Layer,
} from "@mda-studio/shared";
import { useAgentRoster } from "../hooks/useAgentRoster";

interface OrgChartPanelProps {
  gameId: string;
}

export function OrgChartPanel({ gameId }: OrgChartPanelProps): JSX.Element {
  const { status, data, error } = useAgentRoster({ gameId });

  if (status === "loading" || status === "idle") {
    return (
      <section className="org-panel" aria-label="Org chart">
        <p className="muted">Loading roster…</p>
      </section>
    );
  }
  if (status === "error" || !data) {
    return (
      <section className="org-panel" aria-label="Org chart">
        <p className="warn-badge" role="alert">
          Could not load roster: {error ?? "unknown error"}
        </p>
      </section>
    );
  }

  const grouped = groupByLayer(data.agents);

  return (
    <section className="org-panel" aria-label="Org chart">
      <header className="org-panel__head">
        <h1>Org chart</h1>
        <span className="muted">
          {data.agents.length} agent{data.agents.length === 1 ? "" : "s"}{" "}
          observed across issues
        </span>
      </header>
      {data.agents.length === 0 ? (
        <p className="muted">
          No agents have been assigned issues yet. Seed work via the spec
          tree drawer.
        </p>
      ) : (
        <ul className="org-tree" role="tree">
          {MDA_LAYERS.map((layer) => {
            const list = grouped.byLayer.get(layer) ?? [];
            if (list.length === 0) return null;
            return (
              <LayerGroup
                key={layer}
                layer={layer}
                agents={list}
              />
            );
          })}
          {grouped.uncategorized.length > 0 && (
            <UncategorizedGroup agents={grouped.uncategorized} />
          )}
        </ul>
      )}
    </section>
  );
}

function LayerGroup({
  layer,
  agents,
}: {
  layer: Layer;
  agents: AgentRosterEntry[];
}): JSX.Element {
  return (
    <li className="org-tree__layer" role="treeitem" aria-expanded="true">
      <div className="org-tree__layer-head">
        <span
          className="layer-glyph"
          style={{ background: `var(--mda-layer-${layer.toLowerCase()})` }}
          title={`${LAYER_LABELS[layer]} layer`}
        >
          {LAYER_GLYPHS[layer]}
        </span>
        <span className="org-tree__layer-name">{LAYER_LABELS[layer]}</span>
        <span className="muted">
          {agents.length} agent{agents.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="org-tree__agents" role="group">
        {agents.map((a) => (
          <AgentRow key={a.agentId} agent={a} />
        ))}
      </ul>
    </li>
  );
}

function UncategorizedGroup({
  agents,
}: {
  agents: AgentRosterEntry[];
}): JSX.Element {
  return (
    <li className="org-tree__layer" role="treeitem" aria-expanded="true">
      <div className="org-tree__layer-head">
        <span
          className="layer-glyph"
          style={{ background: "var(--mda-bg-elev-2)" }}
          title="Uncategorized"
        >
          ?
        </span>
        <span className="org-tree__layer-name">Uncategorized</span>
        <span className="muted">
          {agents.length} agent{agents.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="org-tree__agents" role="group">
        {agents.map((a) => (
          <AgentRow key={a.agentId} agent={a} />
        ))}
      </ul>
    </li>
  );
}

function AgentRow({ agent }: { agent: AgentRosterEntry }): JSX.Element {
  return (
    <li className="org-tree__agent" role="treeitem">
      <span className="assignee-chip">
        <span className="run-dot" />
        {agent.handle}
      </span>
      <span className="muted">
        {agent.activeIssueCount} active · {agent.completedIssueCount} done
      </span>
    </li>
  );
}

function groupByLayer(agents: readonly AgentRosterEntry[]): {
  byLayer: Map<Layer, AgentRosterEntry[]>;
  uncategorized: AgentRosterEntry[];
} {
  const byLayer = new Map<Layer, AgentRosterEntry[]>();
  const uncategorized: AgentRosterEntry[] = [];
  for (const a of agents) {
    if (a.primaryLayer === null) {
      uncategorized.push(a);
      continue;
    }
    const list = byLayer.get(a.primaryLayer) ?? [];
    list.push(a);
    byLayer.set(a.primaryLayer, list);
  }
  return { byLayer, uncategorized };
}
