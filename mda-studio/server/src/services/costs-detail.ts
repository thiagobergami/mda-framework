/**
 * Builds the chrome-level Costs detail payload (plan §14 U7).
 *
 * Whole-game read: aggregate own-cost per layer, list every spec with
 * non-zero spend (newest plan first), and surface the most recent N
 * cost events. Optionally narrow to a subtree by `scopeSpecId`, which
 * walks the canonical-parent DAG (same rule the rollup uses).
 *
 * Cents values come from `CostRollupMaps` so the chrome view and the
 * drawer view stay numerically consistent.
 */

import {
  type CostEvent,
  type CostsDetailEvent,
  type CostsDetailLayer,
  type CostsDetailResponse,
  type CostsDetailSpecRow,
  type Layer,
  MDA_LAYERS,
} from "@mda-studio/shared";
import type { CostRollupMaps } from "./cost-rollup.js";
import type { ParsedSpec } from "./spec-parser.js";

const RECENT_EVENTS_LIMIT = 30;
const TOP_SPECS_LIMIT = 25;

export interface BuildCostsDetailInput {
  gameId: string;
  generatedAt: string;
  specs: readonly ParsedSpec[];
  events: readonly CostEvent[];
  rollup: CostRollupMaps;
  scopeSpecId?: string | null;
}

export function buildCostsDetail(input: BuildCostsDetailInput): CostsDetailResponse {
  const scopeSpecId = input.scopeSpecId ?? null;
  const scoped = scopeSpecId
    ? collectSubtreeSpecIds(input.specs, scopeSpecId)
    : null;
  const scopedSet = scoped ? new Set(scoped) : null;

  const inScope = (specId: string): boolean =>
    scopedSet === null || scopedSet.has(specId);

  const layerTotals = new Map<Layer, { cents: number; specIds: Set<string> }>();
  let totalMtdCents = 0;
  for (const s of input.specs) {
    if (!inScope(s.specId)) continue;
    const own = input.rollup.ownCents.get(s.specId) ?? 0;
    if (own === 0) continue;
    totalMtdCents += own;
    const bucket = layerTotals.get(s.layer) ?? {
      cents: 0,
      specIds: new Set<string>(),
    };
    bucket.cents += own;
    bucket.specIds.add(s.specId);
    layerTotals.set(s.layer, bucket);
  }

  const byLayer: CostsDetailLayer[] = MDA_LAYERS.filter((l) =>
    layerTotals.has(l),
  ).map((l) => {
    const bucket = layerTotals.get(l)!;
    return { layer: l, cents: bucket.cents, specCount: bucket.specIds.size };
  });

  const titleBySpec = new Map<string, ParsedSpec>();
  for (const s of input.specs) titleBySpec.set(s.specId, s);

  const bySpec: CostsDetailSpecRow[] = Array.from(input.rollup.ownCents.entries())
    .filter(([specId, cents]) => cents > 0 && inScope(specId))
    .map(([specId, ownCents]) => {
      const parsed = titleBySpec.get(specId);
      return {
        specId,
        layer: parsed?.layer ?? ("M" as Layer),
        title: parsed?.title ?? specId,
        ownCents,
        subtreeCents: input.rollup.subtreeCents.get(specId) ?? ownCents,
      };
    })
    .sort((a, b) => b.ownCents - a.ownCents || a.specId.localeCompare(b.specId))
    .slice(0, TOP_SPECS_LIMIT);

  const recentEvents: CostsDetailEvent[] = input.events
    .filter((e) => {
      if (!scopedSet) return true;
      if (e.billingCode === null) return false;
      return scopedSet.has(e.billingCode);
    })
    .slice()
    .sort((a, b) => {
      const t = b.occurredAt.localeCompare(a.occurredAt);
      return t !== 0 ? t : b.id.localeCompare(a.id);
    })
    .slice(0, RECENT_EVENTS_LIMIT)
    .map((e) => ({
      id: e.id,
      provider: e.provider,
      model: e.model,
      costCents: e.costCents,
      occurredAt: e.occurredAt,
      billingCode: e.billingCode,
      agentId: e.agentId ?? null,
      issueId: e.issueId ?? null,
    }));

  const orphanCents = scopedSet ? 0 : input.rollup.orphanCents;

  return {
    gameId: input.gameId,
    generatedAt: input.generatedAt,
    scopeSpecId,
    totalMtdCents,
    orphanCents,
    byLayer,
    bySpec,
    recentEvents,
  };
}

/** DFS over canonical parents to gather the subtree rooted at `rootSpecId`. */
function collectSubtreeSpecIds(
  specs: readonly ParsedSpec[],
  rootSpecId: string,
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const s of specs) {
    if (!s.canonicalParentSpecId) continue;
    const arr = childrenByParent.get(s.canonicalParentSpecId) ?? [];
    arr.push(s.specId);
    childrenByParent.set(s.canonicalParentSpecId, arr);
  }
  const out: string[] = [];
  const stack = [rootSpecId];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    for (const c of childrenByParent.get(id) ?? []) stack.push(c);
  }
  return out;
}
