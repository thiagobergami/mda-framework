/**
 * Fetches the per-node drawer bundle for one (game, spec) pair.
 *
 * Falls back to a thin synthesized payload when the API is unreachable:
 * the spec body comes from the bundled `virusHunterSpecBodies` map and
 * the rest of the bundle is empty. That keeps the drawer working offline
 * exactly like the tree itself does.
 */

import { useCallback, useEffect, useState } from "react";
import {
  specNodeDetailSchema,
  type SpecNodeDetail,
  type SpecTreeNode,
} from "@mda-studio/shared";
import { virusHunterSpecBodies } from "../fixtures/virus-hunter";
import { upwardTrace } from "../components/spec-tree-utils";

export type DetailSource = "api" | "fixture";

export interface SpecNodeDetailState {
  status: "loading" | "ready" | "error";
  data: SpecNodeDetail | null;
  source: DetailSource | null;
  error: string | null;
  refetch: () => void;
}

export function useSpecNodeDetail(
  gameId: string,
  specId: string | null,
  allNodesForFallback: readonly SpecTreeNode[],
): SpecNodeDetailState {
  const [state, setState] = useState<Omit<SpecNodeDetailState, "refetch">>({
    status: "loading",
    data: null,
    source: null,
    error: null,
  });
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!specId) {
      setState({ status: "ready", data: null, source: null, error: null });
      return;
    }
    let cancelled = false;
    setState({ status: "loading", data: null, source: null, error: null });
    (async () => {
      try {
        const res = await fetch(
          `/api/games/${gameId}/spec-tree/node/${specId}`,
          { headers: { accept: "application/json" } },
        );
        if (cancelled) return;
        if (res.ok) {
          const json = await res.json();
          const parsed = specNodeDetailSchema.safeParse(json);
          if (!parsed.success) {
            throw new Error(`bad payload: ${parsed.error.message}`);
          }
          setState({
            status: "ready",
            data: parsed.data,
            source: "api",
            error: null,
          });
          return;
        }
        fallback(specId, allNodesForFallback, setState, `${res.status}`);
      } catch (e) {
        if (cancelled) return;
        fallback(specId, allNodesForFallback, setState, (e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId, specId, reloadKey, allNodesForFallback]);

  return { ...state, refetch };
}

function fallback(
  specId: string,
  allNodes: readonly SpecTreeNode[],
  setState: (s: Omit<SpecNodeDetailState, "refetch">) => void,
  reason: string,
): void {
  const node = allNodes.find((n) => n.specId === specId);
  if (!node) {
    setState({
      status: "error",
      data: null,
      source: null,
      error: `node ${specId} not in tree (api: ${reason})`,
    });
    return;
  }
  const upward = upwardTrace(allNodes, specId).map((n) => ({
    specId: n.specId,
    layer: n.layer,
    title: n.title,
  }));
  const detail: SpecNodeDetail = {
    node,
    spec: {
      path: `specs/${specId}.md`,
      frontmatter: { id: specId, name: node.title },
      body: virusHunterSpecBodies[specId] ?? `# ${specId}\n\n${node.title}`,
    },
    issues: [],
    recentComments: [],
    workProducts: [],
    costsMtd: { own: 0, subtree: 0, byBillingCode: [] },
    warnings: [],
    trace: {
      upward,
      secondaryParents: node.secondaryParentSpecIds
        .map((id) => allNodes.find((n) => n.specId === id))
        .filter((n): n is SpecTreeNode => Boolean(n))
        .map((n) => ({ specId: n.specId, layer: n.layer, title: n.title })),
      outgoingRefs: node.outgoingRefSpecIds
        .map((id) => allNodes.find((n) => n.specId === id))
        .filter((n): n is SpecTreeNode => Boolean(n))
        .map((n) => ({ specId: n.specId, layer: n.layer, title: n.title })),
    },
  };
  setState({ status: "ready", data: detail, source: "fixture", error: null });
}
