/**
 * Pure lens model for the spec-tree UI (plan §11).
 *
 * Lenses combine with AND. A "match" is a node satisfying every active
 * lens; visible nodes include matches plus the canonical ancestors of
 * every match so the path is never lost.
 *
 * V1 lenses (no aesthetic-target yet — that wants per-spec metadata the
 * server doesn't populate yet):
 *
 *   - agent     ?agent=<handle without @>
 *   - status    ?status=<spec status>
 *   - layer     ?layer=A|D|M|AST|TUNE|LEVEL
 *   - warnings  ?lens=warnings   (boolean, presence-only)
 *   - q         ?q=<free text>   (matches spec id, title, assignee handle)
 *
 * Other URL params are passed through untouched (e.g. `node`, `tab`,
 * future routing keys).
 */

import {
  MDA_LAYERS,
  SPEC_STATUSES,
  type Layer,
  type SpecStatus,
  type SpecTreeNode,
} from "@mda-studio/shared";

export interface ActiveLenses {
  agent: string | null; // bare handle, no @
  status: SpecStatus | null;
  layer: Layer | null;
  warnings: boolean;
  q: string; // empty string when not applied
}

export const EMPTY_LENSES: ActiveLenses = {
  agent: null,
  status: null,
  layer: null,
  warnings: false,
  q: "",
};

export function lensesAreActive(l: ActiveLenses): boolean {
  return (
    l.agent !== null ||
    l.status !== null ||
    l.layer !== null ||
    l.warnings ||
    l.q !== ""
  );
}

export function parseLenses(params: URLSearchParams): ActiveLenses {
  const agent = params.get("agent");
  const statusRaw = params.get("status");
  const layerRaw = params.get("layer");
  const lens = params.get("lens");
  const q = params.get("q") ?? "";

  const status =
    statusRaw && (SPEC_STATUSES as readonly string[]).includes(statusRaw)
      ? (statusRaw as SpecStatus)
      : null;
  const layer =
    layerRaw && (MDA_LAYERS as readonly string[]).includes(layerRaw)
      ? (layerRaw as Layer)
      : null;

  return {
    agent: agent ? agent.replace(/^@/, "") : null,
    status,
    layer,
    warnings: lens === "warnings",
    q: q.trim(),
  };
}

/**
 * Merges the lens patch into a *copy* of `params` and returns the result.
 * Setting a value to its empty form (null, false, "") removes the key.
 * Other params (node, tab, …) are preserved unchanged.
 */
export function applyLensPatch(
  params: URLSearchParams,
  patch: Partial<ActiveLenses>,
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (patch.agent !== undefined) {
    if (patch.agent === null || patch.agent === "") next.delete("agent");
    else next.set("agent", patch.agent.replace(/^@/, ""));
  }
  if (patch.status !== undefined) {
    if (patch.status === null) next.delete("status");
    else next.set("status", patch.status);
  }
  if (patch.layer !== undefined) {
    if (patch.layer === null) next.delete("layer");
    else next.set("layer", patch.layer);
  }
  if (patch.warnings !== undefined) {
    if (patch.warnings) next.set("lens", "warnings");
    else if (next.get("lens") === "warnings") next.delete("lens");
  }
  if (patch.q !== undefined) {
    if (patch.q === "") next.delete("q");
    else next.set("q", patch.q);
  }
  return next;
}

export interface LensResult {
  /** All nodes the user should see: matches + canonical ancestors of matches. */
  visibleSpecIds: Set<string>;
  /** The subset that actually satisfied the lens (no ancestor padding). */
  matchingSpecIds: Set<string>;
  /** Ancestors of matches — auto-expand these so matches are reachable. */
  ancestorSpecIds: Set<string>;
}

export function applyLenses(
  nodes: readonly SpecTreeNode[],
  lenses: ActiveLenses,
): LensResult {
  if (!lensesAreActive(lenses)) {
    const ids = new Set(nodes.map((n) => n.specId));
    return {
      visibleSpecIds: ids,
      matchingSpecIds: ids,
      ancestorSpecIds: new Set(),
    };
  }

  const matching = new Set<string>();
  for (const n of nodes) if (matches(n, lenses)) matching.add(n.specId);

  const byId = new Map(nodes.map((n) => [n.specId, n]));
  const ancestors = new Set<string>();
  for (const id of matching) {
    let cursor = byId.get(id);
    while (cursor?.canonicalParentSpecId) {
      const parent = byId.get(cursor.canonicalParentSpecId);
      if (!parent) break;
      ancestors.add(parent.specId);
      cursor = parent;
    }
  }

  const visible = new Set<string>([...matching, ...ancestors]);
  return {
    visibleSpecIds: visible,
    matchingSpecIds: matching,
    ancestorSpecIds: ancestors,
  };
}

function matches(node: SpecTreeNode, l: ActiveLenses): boolean {
  if (l.layer && node.layer !== l.layer) return false;
  if (l.status && node.status !== l.status) return false;
  if (l.warnings && node.warningCount === 0) return false;
  if (l.agent) {
    const handle = node.assigneeAgentHandle?.replace(/^@/, "") ?? "";
    if (handle.toLowerCase() !== l.agent.toLowerCase()) return false;
  }
  if (l.q) {
    const needle = l.q.toLowerCase();
    const hay = [
      node.specId,
      node.title,
      node.assigneeAgentHandle ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}
