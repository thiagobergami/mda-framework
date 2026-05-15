import { describe, expect, it } from "vitest";
import { specNodeDetailSchema } from "./spec-node-detail";

const fixture = {
  node: {
    specId: "MEC-001",
    layer: "M",
    title: "Revive interaction",
    status: "impl",
    canonicalParentSpecId: "DYN-001",
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
  spec: {
    path: "specs/mechanics/revive.mec.md",
    frontmatter: { id: "MEC-001", name: "Revive interaction" },
    body: "# Revive interaction\n\nHold E for 3 seconds.",
  },
  issues: [],
  recentComments: [],
  workProducts: [],
  costsMtd: { own: 0, subtree: 0, byBillingCode: [] },
  warnings: [],
  trace: { upward: [], secondaryParents: [], outgoingRefs: [] },
} as const;

describe("specNodeDetailSchema", () => {
  it("accepts a minimal fixture", () => {
    expect(() => specNodeDetailSchema.parse(fixture)).not.toThrow();
  });

  it("rejects an unknown layer in a trace ref", () => {
    expect(() =>
      specNodeDetailSchema.parse({
        ...fixture,
        trace: {
          ...fixture.trace,
          upward: [{ specId: "X", layer: "Z", title: "x" }],
        },
      }),
    ).toThrow();
  });

  it("accepts an issue summary inside the bundle", () => {
    const withIssue = {
      ...fixture,
      issues: [
        {
          id: "ISS-1",
          gameId: "g",
          specId: "MEC-001",
          title: "t",
          status: "todo",
          priority: "low",
          assigneeAgentId: null,
          assigneeAgentHandle: null,
          createdAt: "2026-05-12T00:00:00.000Z",
          updatedAt: "2026-05-12T00:00:00.000Z",
        },
      ],
    };
    expect(() => specNodeDetailSchema.parse(withIssue)).not.toThrow();
  });
});
