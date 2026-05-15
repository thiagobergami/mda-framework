/**
 * Demo data seeder. Called when `MDA_STUDIO_SEED_FIXTURE_ISSUES=true`.
 *
 * Produces enough activity for the spec-tree UI to show issue chips, run
 * dots, comments, work products, MTD costs per node, and validator
 * warning badges. Idempotent — clears each store before seeding.
 */

import { DEFAULT_STUDIO_ID } from "@mda-studio/shared";
import { clearActivityLog } from "./activity-log-store.js";
import {
  clearApprovalsStore,
  createApproval,
  resolveApproval,
} from "./approvals-store.js";
import {
  clearCostEventsStore,
  recordCostEvent,
} from "./cost-events-store.js";
import {
  clearIssuesStore,
  createComment,
  createIssue,
  createWorkProduct,
  updateIssue,
} from "./issues-store.js";
import {
  clearValidatorRunsStore,
  recordValidatorRun,
} from "./validator-runs-store.js";

export function seedFixtureIssues(gameId: string): void {
  clearIssuesStore();
  clearCostEventsStore();
  clearValidatorRunsStore();
  clearApprovalsStore();
  clearActivityLog();

  // MEC-001 — active impl with an in-progress assignee
  const mec1 = createIssue({
    gameId,
    specId: "MEC-001",
    title: "Implement revive interaction (E hold + cancel)",
    status: "todo",
    priority: "high",
    assigneeAgentId: "agent-3",
    assigneeAgentHandle: "@mech-1",
  });
  updateIssue(mec1.id, { status: "in_progress" });
  createComment({
    issueId: mec1.id,
    authorHandle: "@mech-1",
    body: "Starting on the hold-progress UI. Will land cancel-on-damage in a follow-up.",
  });
  createWorkProduct({
    issueId: mec1.id,
    kind: "report",
    label: "mda validate — passing",
    href: null,
  });

  // DYN-001 — in_review awaiting design sign-off
  const dyn1 = createIssue({
    gameId,
    specId: "DYN-001",
    title: "Revive loop INV-2 frequency tuning",
    status: "todo",
    priority: "medium",
    assigneeAgentId: "agent-2",
    assigneeAgentHandle: "@dyn-1",
  });
  updateIssue(dyn1.id, { status: "in_progress" });
  updateIssue(dyn1.id, { status: "in_review" });
  createComment({
    issueId: dyn1.id,
    authorHandle: "@director",
    body: "Looks good — one note on the threat-redirect window before approval.",
  });

  // AES-002 — todo, no assignee yet
  createIssue({
    gameId,
    specId: "AES-002",
    title: "Draft AES-002 aesthetic spec",
    status: "todo",
    priority: "medium",
    assigneeAgentId: "agent-1",
    assigneeAgentHandle: "@aes-lead",
  });

  // AST-007 — concept asset, blocked on placeholder approval
  const ast7 = createIssue({
    gameId,
    specId: "AST-007",
    title: "Revive VFX — concept → placeholder",
    status: "todo",
    priority: "low",
    assigneeAgentId: "agent-4",
    assigneeAgentHandle: "@ast-lead",
  });
  updateIssue(ast7.id, { status: "in_progress" });
  updateIssue(ast7.id, { status: "blocked" });

  // MEC-002 — backlog, no assignee
  createIssue({
    gameId,
    specId: "MEC-002",
    title: "Downed-state broadcast event",
    status: "todo",
    priority: "low",
    assigneeAgentId: null,
    assigneeAgentHandle: null,
  });

  // LVL-001 — in_progress level blockout
  const lvl1 = createIssue({
    gameId,
    specId: "LVL-001",
    title: "tutorial-lab blockout beat chart",
    status: "todo",
    priority: "medium",
    assigneeAgentId: "agent-5",
    assigneeAgentHandle: "@level-1",
  });
  updateIssue(lvl1.id, { status: "in_progress" });

  seedFixtureCostEvents(gameId);
  seedFixtureValidatorRun(gameId);
  seedFixtureApprovals(gameId);
}

function seedFixtureApprovals(gameId: string): void {
  const studioId = DEFAULT_STUDIO_ID;
  createApproval({
    studioId,
    gameId,
    specId: "MEC-001",
    kind: "mechanic-impl",
    title: "Promote MEC-001 (Revive interaction) to impl",
    body: "Revive hold-progress + cancel are wired. mda validate passes. Approve to flip status from draft → impl.",
    requestedByHandle: "@mech-1",
  });
  createApproval({
    studioId,
    gameId,
    specId: "AST-007",
    kind: "asset-final",
    title: "AST-007 placeholder approval",
    body: "Concept VFX needs sign-off before the placeholder is checked in.",
    requestedByHandle: "@ast-lead",
  });
  const resolved = createApproval({
    studioId,
    gameId,
    specId: "AES-001",
    kind: "spec-freeze",
    title: "Freeze AES-001 (Fellowship under pressure)",
    body: "Aesthetic spec is stable across two iterations.",
    requestedByHandle: "@aes-lead",
  });
  resolveApproval(resolved.id, {
    status: "approved",
    approverHandle: "@director",
    comment: "Looks good — proceed.",
  });
}

function seedFixtureCostEvents(gameId: string): void {
  const now = new Date().toISOString();
  const lastMonth = (() => {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - 1);
    d.setUTCDate(15);
    return d.toISOString();
  })();
  const studioId = "studio-1";
  const cost = (
    billingCode: string,
    cents: number,
    occurredAt = now,
  ): void => {
    recordCostEvent({
      studioId,
      gameId,
      provider: "anthropic",
      model: "claude-opus-4-7",
      inputTokens: cents * 10,
      outputTokens: 100,
      costCents: cents,
      occurredAt,
      billingCode,
    });
  };

  // Current month — these roll up the canonical-parent tree.
  cost("MEC-001", 920);
  cost("MEC-001", 240);
  cost("MEC-003", 400);
  cost("DYN-001", 340);
  cost("AES-001", 812);
  cost("AST-007", 320);
  cost("AES-002", 640);
  cost("LVL-001", 280);

  // Last month — must be filtered out of MTD.
  cost("MEC-001", 99_999, lastMonth);
}

function seedFixtureValidatorRun(gameId: string): void {
  recordValidatorRun(gameId, [
    {
      specId: "AST-007",
      rule: "asset-status-aged",
      message: "AST-007 has been in `concept` status for > 30 days",
    },
    {
      specId: "MEC-002",
      rule: "missing-implementation",
      message: "MEC-002 has no MDALogger emissions yet",
    },
  ]);
}
