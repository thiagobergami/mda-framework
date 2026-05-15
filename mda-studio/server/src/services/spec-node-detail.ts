/**
 * Composes the SpecNodeDetail bundle for one (game, spec) pair.
 *
 * Aggregates:
 *   - the node from the assembled tree (decorated with active-issue data)
 *   - the spec frontmatter + raw markdown body from disk
 *   - all issues for the spec (newest first)
 *   - the newest 10 comments + work products across those issues
 *   - cost rollup (zero for now — fills in U4)
 *   - validator warnings (empty — fills in U4)
 *   - upward/secondary/outgoing trace refs
 */

import type {
  SpecNodeDetail,
  SpecTreeNode,
  TraceRef,
  ValidatorWarning,
} from "@mda-studio/shared";
import {
  listCommentsForIssues,
  listIssuesForSpec,
  listWorkProductsForIssues,
} from "./issues-store.js";
import { loadSpecBody } from "./spec-body-loader.js";
import type { ParsedSpec } from "./spec-parser.js";

export interface BuildNodeDetailInput {
  gameId: string;
  specsRoot: string;
  /** All parsed specs for the game (from the cache). */
  allSpecs: readonly ParsedSpec[];
  /** The node already assembled by `assembleSpecTreeResponse`. */
  node: SpecTreeNode;
  /** The matching parsed spec (used for sourcePath). */
  parsedSpec: ParsedSpec;
  /** Cost rollup data; missing → zeros + empty by-billing-code. */
  ownCostCents?: number;
  subtreeCostCents?: number;
  byBillingCode?: ReadonlyArray<{ billingCode: string; cents: number }>;
  /** All warnings from the latest validator run; filtered to this spec id. */
  allWarnings?: readonly ValidatorWarning[];
}

export async function buildSpecNodeDetail(
  input: BuildNodeDetailInput,
): Promise<SpecNodeDetail> {
  const { gameId, specsRoot, allSpecs, node, parsedSpec } = input;

  const body = await loadSpecBody(specsRoot, parsedSpec.sourcePath);

  const issues = listIssuesForSpec(gameId, node.specId);
  const issueIds = issues.map((i) => i.id);
  const recentComments = listCommentsForIssues(issueIds, 10);
  const workProducts = listWorkProductsForIssues(issueIds, 10);

  const trace = buildTrace(allSpecs, parsedSpec);

  const warnings = (input.allWarnings ?? []).filter(
    (w) => w.specId === node.specId,
  );

  return {
    node,
    spec: {
      path: parsedSpec.sourcePath,
      frontmatter: body.frontmatter,
      body: body.body,
    },
    issues,
    recentComments,
    workProducts,
    costsMtd: {
      own: input.ownCostCents ?? 0,
      subtree: input.subtreeCostCents ?? 0,
      byBillingCode: input.byBillingCode ? [...input.byBillingCode] : [],
    },
    warnings,
    trace,
  };
}

function buildTrace(
  allSpecs: readonly ParsedSpec[],
  spec: ParsedSpec,
): SpecNodeDetail["trace"] {
  const byId = new Map<string, ParsedSpec>(
    allSpecs.map((s) => [s.specId, s]),
  );
  const upward: TraceRef[] = [];
  let cursor: ParsedSpec | undefined = spec;
  while (cursor?.canonicalParentSpecId) {
    const parent = byId.get(cursor.canonicalParentSpecId);
    if (!parent) break;
    upward.unshift(toRef(parent));
    cursor = parent;
  }
  const secondaryParents = spec.secondaryParentSpecIds
    .map((id) => byId.get(id))
    .filter((s): s is ParsedSpec => Boolean(s))
    .map(toRef);
  const outgoingRefs = spec.outgoingRefSpecIds
    .map((id) => byId.get(id))
    .filter((s): s is ParsedSpec => Boolean(s))
    .map(toRef);
  return { upward, secondaryParents, outgoingRefs };
}

function toRef(s: ParsedSpec): TraceRef {
  return { specId: s.specId, layer: s.layer, title: s.title };
}
