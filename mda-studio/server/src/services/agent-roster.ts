/**
 * Builds the read-only agent roster for the Org chart (plan §14 U7).
 *
 * V1 has no agents table — the roster is derived from issue history.
 * For each unique (assigneeAgentId, assigneeAgentHandle) pair seen on
 * a game's issues, we compute:
 *
 *   - primaryLayer: the MDA layer most issues land in
 *   - activeIssueCount: not in `done` or `cancelled`
 *   - completedIssueCount: in `done` or `cancelled`
 *
 * Sorting: by layer (in MDA_LAYERS order, null layer last), then by
 * total issue count desc, then by handle. The Org chart panel renders
 * agents grouped under their primary layer, so this ordering keeps the
 * grouped indentation stable across renders.
 */

import {
  layerFromSpecId,
  type AgentRosterEntry,
  type IssueSummary,
  type Layer,
  MDA_LAYERS,
} from "@mda-studio/shared";

const TERMINAL_STATUSES = new Set<IssueSummary["status"]>(["done", "cancelled"]);

interface Aggregate {
  agentId: string;
  handle: string;
  active: number;
  completed: number;
  layerCounts: Map<Layer, number>;
}

export function buildAgentRoster(issues: readonly IssueSummary[]): AgentRosterEntry[] {
  const map = new Map<string, Aggregate>();
  for (const i of issues) {
    if (!i.assigneeAgentId || !i.assigneeAgentHandle) continue;
    const key = `${i.assigneeAgentId}::${i.assigneeAgentHandle}`;
    const a = map.get(key) ?? {
      agentId: i.assigneeAgentId,
      handle: i.assigneeAgentHandle,
      active: 0,
      completed: 0,
      layerCounts: new Map(),
    };
    if (TERMINAL_STATUSES.has(i.status)) a.completed += 1;
    else a.active += 1;
    const layer = layerFromSpecId(i.specId);
    if (layer) {
      a.layerCounts.set(layer, (a.layerCounts.get(layer) ?? 0) + 1);
    }
    map.set(key, a);
  }

  const entries: AgentRosterEntry[] = Array.from(map.values()).map((a) => ({
    agentId: a.agentId,
    handle: a.handle,
    primaryLayer: pickPrimaryLayer(a.layerCounts),
    activeIssueCount: a.active,
    completedIssueCount: a.completed,
    totalIssueCount: a.active + a.completed,
  }));

  return entries.sort((x, y) => {
    const lx = layerOrder(x.primaryLayer);
    const ly = layerOrder(y.primaryLayer);
    if (lx !== ly) return lx - ly;
    if (x.totalIssueCount !== y.totalIssueCount) {
      return y.totalIssueCount - x.totalIssueCount;
    }
    return x.handle.localeCompare(y.handle);
  });
}

function pickPrimaryLayer(counts: Map<Layer, number>): Layer | null {
  let best: Layer | null = null;
  let bestCount = -1;
  for (const layer of MDA_LAYERS) {
    const c = counts.get(layer) ?? 0;
    if (c > bestCount) {
      best = layer;
      bestCount = c;
    }
  }
  return bestCount > 0 ? best : null;
}

function layerOrder(layer: Layer | null): number {
  if (layer === null) return MDA_LAYERS.length;
  return MDA_LAYERS.indexOf(layer);
}
