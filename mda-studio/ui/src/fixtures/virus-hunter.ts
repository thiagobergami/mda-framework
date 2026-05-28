/**
 * Phase U1 fixture: the "Virus Hunter" game tree from
 * `design/mda-studio/spec-tree-ui/plan.md §4.2`.
 *
 * This is hand-authored static data. Phase U2 replaces it with a real
 * `GET /api/games/:gameId/spec-tree` payload sourced from `specs/`.
 */

import type { GameCard, SpecTreeResponse, SpecTreeNode } from "@mda-studio/shared";

const nodes: SpecTreeNode[] = [
  {
    specId: "AES-001",
    layer: "A",
    title: "Fellowship under pressure",
    status: "frozen",
    canonicalParentSpecId: null,
    secondaryParentSpecIds: [],
    outgoingRefSpecIds: [],
    activeIssueId: null,
    activeIssueStatus: null,
    assigneeAgentId: null,
    assigneeAgentHandle: null,
    runStatus: null,
    costMtdCents: 812,
    costMtdSubtreeCents: 4_120,
    warningCount: 0,
  },
  {
    specId: "AES-002",
    layer: "A",
    title: "Discovery (puzzle rooms)",
    status: "draft",
    canonicalParentSpecId: null,
    secondaryParentSpecIds: [],
    outgoingRefSpecIds: [],
    activeIssueId: "ISS-014",
    activeIssueStatus: "in_progress",
    assigneeAgentId: "agent-1",
    assigneeAgentHandle: "@aes-lead",
    runStatus: "running",
    costMtdCents: 640,
    costMtdSubtreeCents: 640,
    warningCount: 1,
  },
  {
    specId: "DYN-001",
    layer: "D",
    title: "Co-op revive loop",
    status: "draft",
    canonicalParentSpecId: "AES-001",
    secondaryParentSpecIds: [],
    outgoingRefSpecIds: [],
    activeIssueId: "ISS-021",
    activeIssueStatus: "in_review",
    assigneeAgentId: "agent-2",
    assigneeAgentHandle: "@dyn-1",
    runStatus: "idle",
    costMtdCents: 340,
    costMtdSubtreeCents: 2_780,
    warningCount: 2,
  },
  {
    specId: "DYN-002",
    layer: "D",
    title: "Threat escalation",
    status: "frozen",
    canonicalParentSpecId: "AES-001",
    secondaryParentSpecIds: [],
    outgoingRefSpecIds: [],
    activeIssueId: null,
    activeIssueStatus: null,
    assigneeAgentId: null,
    assigneeAgentHandle: null,
    runStatus: null,
    costMtdCents: 120,
    costMtdSubtreeCents: 520,
    warningCount: 0,
  },
  {
    specId: "MEC-001",
    layer: "M",
    title: "Revive interaction",
    status: "impl",
    canonicalParentSpecId: "DYN-001",
    secondaryParentSpecIds: [],
    outgoingRefSpecIds: [],
    activeIssueId: "ISS-100",
    activeIssueStatus: "in_progress",
    assigneeAgentId: "agent-3",
    assigneeAgentHandle: "@mech-1",
    runStatus: "running",
    costMtdCents: 920,
    costMtdSubtreeCents: 1_240,
    warningCount: 0,
  },
  {
    specId: "MEC-002",
    layer: "M",
    title: "Downed state",
    status: "draft",
    canonicalParentSpecId: "DYN-001",
    secondaryParentSpecIds: [],
    outgoingRefSpecIds: [],
    activeIssueId: "ISS-101",
    activeIssueStatus: "todo",
    assigneeAgentId: "agent-3",
    assigneeAgentHandle: "@mech-1",
    runStatus: "idle",
    costMtdCents: 0,
    costMtdSubtreeCents: 0,
    warningCount: 1,
  },
  {
    specId: "MEC-003",
    layer: "M",
    title: "MDALogger",
    status: "impl",
    canonicalParentSpecId: "DYN-002",
    secondaryParentSpecIds: ["DYN-001", "AES-002"],
    outgoingRefSpecIds: [],
    activeIssueId: null,
    activeIssueStatus: null,
    assigneeAgentId: null,
    assigneeAgentHandle: null,
    runStatus: null,
    costMtdCents: 400,
    costMtdSubtreeCents: 400,
    warningCount: 0,
  },
  {
    specId: "AST-007",
    layer: "AST",
    title: "Revive VFX",
    status: "concept",
    canonicalParentSpecId: "MEC-001",
    secondaryParentSpecIds: [],
    outgoingRefSpecIds: [],
    activeIssueId: "ISS-200",
    activeIssueStatus: "todo",
    assigneeAgentId: "agent-4",
    assigneeAgentHandle: "@ast-lead",
    runStatus: "idle",
    costMtdCents: 320,
    costMtdSubtreeCents: 320,
    warningCount: 0,
  },
  {
    specId: "TUNE-001",
    layer: "TUNE",
    title: "Revive timing",
    status: "draft",
    canonicalParentSpecId: "MEC-001",
    secondaryParentSpecIds: [],
    outgoingRefSpecIds: [],
    activeIssueId: null,
    activeIssueStatus: null,
    assigneeAgentId: null,
    assigneeAgentHandle: null,
    runStatus: null,
    costMtdCents: 0,
    costMtdSubtreeCents: 0,
    warningCount: 0,
  },
  {
    specId: "LEVEL-tutorial-lab",
    layer: "LEVEL",
    title: "tutorial-lab",
    status: "blockout",
    canonicalParentSpecId: null,
    secondaryParentSpecIds: [],
    outgoingRefSpecIds: ["AES-001", "DYN-001", "MEC-001"],
    activeIssueId: "ISS-300",
    activeIssueStatus: "in_progress",
    assigneeAgentId: "agent-5",
    assigneeAgentHandle: "@level-1",
    runStatus: "running",
    costMtdCents: 280,
    costMtdSubtreeCents: 280,
    warningCount: 0,
  },
];

export const virusHunterTree: SpecTreeResponse = {
  gameId: "virus-hunter",
  generatedAt: "2026-05-12T12:00:00.000Z",
  concept: {
    path: "specs/concept/virus-hunter.concept.md",
    primaryAesthetic: "Fellowship under pressure",
    title: "Virus Hunter",
  },
  nodes,
};

/** Per-spec markdown bodies for the U1 drawer Spec tab. */
export const virusHunterSpecBodies: Readonly<Record<string, string>> = {
  "AES-001": `# AES-001 — Fellowship under pressure

**Aesthetic category:** Fellowship

The team feels bonded by shared stakes. Players who survive a wave together
should feel like they pulled each other through. Failure should feel like a
shared failure, not an individual one.

## Proxies
- Players within 8m of each other ≥ 60% of session
- Mutual revives per minute ≥ 0.4`,
  "AES-002": `# AES-002 — Discovery (puzzle rooms)

**Aesthetic category:** Discovery

Each puzzle room reveals a piece of the lab's history. Solving is exploration,
not gating.`,
  "DYN-001": `# DYN-001 — Co-op revive loop

When a player goes down, the team has 20s to revive before the player is
removed for the wave. Reviving is interruptible by threats.

## Invariants
- INV-1: a downed player always has at least one valid revive interactor
- INV-2: threats redirect to active reviver within 0.5s`,
  "DYN-002": `# DYN-002 — Threat escalation

Threat density scales with party size, not solo player count.`,
  "MEC-001": `# MEC-001 — Revive interaction

\`\`\`luau
function Revive.startInteraction(actor, target) ...
\`\`\`

Hold E for 3s. Interrupted by damage. Visual feedback per AST-007.`,
  "MEC-002": `# MEC-002 — Downed state

Disables movement, attaches floor decal, broadcasts \`DOWNED\` event.`,
  "MEC-003": `# MEC-003 — MDALogger

Structured logging tagged with MDA layer + spec id. Serves multiple dynamics
(DYN-001 invariants, DYN-002 escalation traces) and AES-002 (discovery
proxies).`,
  "AST-007": `# AST-007 — Revive VFX

**Status:** concept. Placeholder will be a cyan particle ring at the revive
target's feet, brightening as progress completes.`,
  "TUNE-001": `# TUNE-001 — Revive timing

\`reviveDurationSec\` ∈ [2.0, 5.0], default 3.0.
\`interruptGraceSec\` ∈ [0.1, 0.5], default 0.25.`,
  "LEVEL-tutorial-lab": `# tutorial-lab.level.md

Onboarding level. References AES-001, DYN-001, MEC-001. Three beats:
introduction → first downed player → first cooperative revive.`,
};

/**
 * Studio home grid fixture (D5.Q2).
 *
 * Gated behind VITE_MDA_STUDIO_DEMO so production-style installs don't render
 * the demo card alongside real games. Vitest builds set the flag through
 * the test setup, so component tests still see the fixture.
 */
const DEMO_CARDS: GameCard[] = [
  {
    gameId: "virus-hunter",
    studioId: "studio-1",
    name: "Virus Hunter",
    conceptSummary: "Co-op lab survival; revive each other or lose the wave.",
    primaryAesthetic: "Fellowship under pressure",
    mtdSpendCents: 4_220,
    activeAgentCount: 3,
    openRecoveryIssueCount: 2,
  },
];

function demoEnabled(): boolean {
  // Vitest sets `import.meta.env.MODE === "test"`; the demo flag opts in
  // explicitly otherwise.
  const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  if (env["VITE_MDA_STUDIO_DEMO"] === "1") return true;
  if (env["MODE"] === "test") return true;
  return false;
}

export const fixtureGameCards: readonly GameCard[] = demoEnabled() ? DEMO_CARDS : [];
