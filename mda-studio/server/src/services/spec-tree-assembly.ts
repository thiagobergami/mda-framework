/**
 * Assembles a `SpecTreeResponse` from a cached `ParsedSpec[]`.
 *
 * Phase U3 wires the issue decoration: if `activeIssueBySpecId` is
 * supplied, each spec's active issue (if any) drives `activeIssueId`,
 * `activeIssueStatus`, `assigneeAgentId`, `assigneeAgentHandle`, and
 * `runStatus`. Cost + warning fields stay zero-filled until U4.
 */

import type {
  IssueSummary,
  RunStatus,
  SpecTreeNode,
  SpecTreeResponse,
} from "@mda-studio/shared";
import type { ParsedSpec } from "./spec-parser.js";

export interface AssembleInput {
  gameId: string;
  concept: {
    path: string;
    primaryAesthetic: string;
    title: string;
  };
  specs: readonly ParsedSpec[];
  generatedAt?: string;
  /** spec id → its active (non-terminal) issue, if any. */
  activeIssueBySpecId?: ReadonlyMap<string, IssueSummary>;
  /** spec id → own cost MTD (cents). Missing keys mean zero. */
  ownCostBySpecId?: ReadonlyMap<string, number>;
  /** spec id → rolled-up subtree cost MTD (cents). Missing keys mean zero. */
  subtreeCostBySpecId?: ReadonlyMap<string, number>;
  /** spec id → validator warning count. Missing keys mean zero. */
  warningCountBySpecId?: ReadonlyMap<string, number>;
}

export function assembleSpecTreeResponse(
  input: AssembleInput,
): SpecTreeResponse {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  return {
    gameId: input.gameId,
    generatedAt,
    concept: input.concept,
    nodes: input.specs.map((spec) =>
      toNode(spec, {
        issue: input.activeIssueBySpecId?.get(spec.specId),
        own: input.ownCostBySpecId?.get(spec.specId) ?? 0,
        subtree: input.subtreeCostBySpecId?.get(spec.specId) ?? 0,
        warningCount: input.warningCountBySpecId?.get(spec.specId) ?? 0,
      }),
    ),
  };
}

/**
 * Derive a presentational run status from an issue's lifecycle status.
 * "in_progress" → running, "blocked" → paused, others → idle.
 */
function deriveRunStatus(issue: IssueSummary): RunStatus {
  switch (issue.status) {
    case "in_progress":
      return "running";
    case "blocked":
      return "paused";
    default:
      return "idle";
  }
}

interface NodeDecoration {
  issue: IssueSummary | undefined;
  own: number;
  subtree: number;
  warningCount: number;
}

function toNode(spec: ParsedSpec, dec: NodeDecoration): SpecTreeNode {
  const { issue } = dec;
  return {
    specId: spec.specId,
    layer: spec.layer,
    title: spec.title,
    status: spec.status,
    canonicalParentSpecId: spec.canonicalParentSpecId,
    secondaryParentSpecIds: spec.secondaryParentSpecIds,
    outgoingRefSpecIds: spec.outgoingRefSpecIds,
    activeIssueId: issue?.id ?? null,
    activeIssueStatus: issue?.status ?? null,
    assigneeAgentId: issue?.assigneeAgentId ?? null,
    assigneeAgentHandle: issue?.assigneeAgentHandle ?? null,
    runStatus: issue ? deriveRunStatus(issue) : null,
    costMtdCents: dec.own,
    costMtdSubtreeCents: dec.subtree,
    warningCount: dec.warningCount,
  };
}
