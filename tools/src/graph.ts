import type { SpecLayer, SpecMeta, SpecGraph } from "./types.js";

/** Build a SpecGraph from a list of parsed specs */
export function buildGraph(specs: SpecMeta[]): SpecGraph {
  const specsMap = new Map<string, SpecMeta>();
  const outbound = new Map<string, Set<string>>();
  const inbound = new Map<string, Set<string>>();
  const byLayer = new Map<SpecLayer, SpecMeta[]>();
  const byFile = new Map<string, string>();

  // Index all specs
  for (const spec of specs) {
    specsMap.set(spec.id, spec);
    byFile.set(spec.id, spec.file);

    if (!byLayer.has(spec.layer)) {
      byLayer.set(spec.layer, []);
    }
    byLayer.get(spec.layer)!.push(spec);

    // Initialize edge sets
    if (!outbound.has(spec.id)) {
      outbound.set(spec.id, new Set());
    }
    if (!inbound.has(spec.id)) {
      inbound.set(spec.id, new Set());
    }
  }

  // Build edges from traces
  for (const spec of specs) {
    for (const targetId of spec.tracesTo) {
      outbound.get(spec.id)!.add(targetId);

      if (!inbound.has(targetId)) {
        inbound.set(targetId, new Set());
      }
      inbound.get(targetId)!.add(spec.id);
    }
  }

  return { specs: specsMap, outbound, inbound, byLayer, byFile };
}

/** Walk the trace chain upward (outbound) or downward (inbound) from a spec */
export function traceChain(
  graph: SpecGraph,
  startId: string,
  direction: "up" | "down",
): string[] {
  const visited = new Set<string>();
  const queue = [startId];
  const result: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    if (current !== startId) {
      result.push(current);
    }

    const edges = direction === "up"
      ? graph.outbound.get(current)
      : graph.inbound.get(current);

    if (edges) {
      for (const next of edges) {
        if (!visited.has(next)) {
          queue.push(next);
        }
      }
    }
  }

  return result;
}
