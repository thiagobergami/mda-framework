/**
 * Subtree cost rollup over the canonical-parent DAG.
 *
 * Each cost event with a `billingCode` is attributed to exactly one spec
 * (its own cost). Subtree totals are computed by DFS over canonical
 * parents only. That is the single bridge between V1 multi-parent specs
 * (e.g. MEC-003 serving multiple DYN) and *non-double-counting*: only
 * the canonical parent's subtree includes the child's cost.
 *
 * The plan §6 rollup CTE would do the same thing in SQL. Until then this
 * runs in-process against the same shape the API already returns.
 */

import {
  isInCurrentMonth,
  type CostEvent,
} from "@mda-studio/shared";
import type { ParsedSpec } from "./spec-parser.js";

export interface CostRollupMaps {
  /** Own cents per spec (only this spec's billing code matches). */
  ownCents: Map<string, number>;
  /** Subtree cents per spec (own + sum of all canonical descendants). */
  subtreeCents: Map<string, number>;
  /** Per-spec map of billingCode → cents, used by the drawer Costs tab. */
  byBillingCodeForSpec: Map<
    string,
    Array<{ billingCode: string; cents: number }>
  >;
  /** Sum of all events with billingCode === null (orphan, not attributed). */
  orphanCents: number;
}

export interface RollupInput {
  specs: readonly ParsedSpec[];
  events: readonly CostEvent[];
  /** When false, includes events from any month (used in tests). */
  mtdOnly?: boolean;
  /** Override the "current month" anchor; defaults to `new Date()`. */
  now?: Date;
}

export function computeCostRollup(input: RollupInput): CostRollupMaps {
  const mtdOnly = input.mtdOnly ?? true;
  const now = input.now ?? new Date();

  const ownCents = new Map<string, number>();
  const byBillingCodeForSpec = new Map<
    string,
    Map<string, number>
  >();
  let orphanCents = 0;

  for (const e of input.events) {
    if (mtdOnly && !isInCurrentMonth(e.occurredAt, now)) continue;
    if (e.billingCode === null) {
      orphanCents += e.costCents;
      continue;
    }
    ownCents.set(
      e.billingCode,
      (ownCents.get(e.billingCode) ?? 0) + e.costCents,
    );
    const inner =
      byBillingCodeForSpec.get(e.billingCode) ?? new Map<string, number>();
    inner.set(e.billingCode, (inner.get(e.billingCode) ?? 0) + e.costCents);
    byBillingCodeForSpec.set(e.billingCode, inner);
  }

  // Build a child index from canonical parents.
  const childrenByParent = new Map<string, string[]>();
  for (const s of input.specs) {
    if (!s.canonicalParentSpecId) continue;
    const arr = childrenByParent.get(s.canonicalParentSpecId) ?? [];
    arr.push(s.specId);
    childrenByParent.set(s.canonicalParentSpecId, arr);
  }

  // DFS post-order so subtree totals are stable regardless of declaration order.
  const subtreeCents = new Map<string, number>();
  const visit = (specId: string): number => {
    if (subtreeCents.has(specId)) return subtreeCents.get(specId)!;
    let total = ownCents.get(specId) ?? 0;
    for (const child of childrenByParent.get(specId) ?? []) {
      total += visit(child);
    }
    subtreeCents.set(specId, total);
    return total;
  };
  for (const s of input.specs) visit(s.specId);

  // Flatten byBillingCodeForSpec to ordered arrays.
  const out = new Map<
    string,
    Array<{ billingCode: string; cents: number }>
  >();
  for (const [specId, inner] of byBillingCodeForSpec) {
    out.set(
      specId,
      Array.from(inner.entries())
        .map(([billingCode, cents]) => ({ billingCode, cents }))
        .sort((a, b) => b.cents - a.cents),
    );
  }

  return { ownCents, subtreeCents, byBillingCodeForSpec: out, orphanCents };
}
