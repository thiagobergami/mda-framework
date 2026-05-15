import { describe, expect, it } from "vitest";
import {
  formatCents,
  specTreeNodeSchema,
  specTreeResponseSchema,
} from "./spec-tree";

const baseNode = {
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
} as const;

describe("specTreeNodeSchema", () => {
  it("accepts a minimal node", () => {
    expect(() => specTreeNodeSchema.parse(baseNode)).not.toThrow();
  });

  it("rejects an unknown layer", () => {
    expect(() =>
      specTreeNodeSchema.parse({ ...baseNode, layer: "X" }),
    ).toThrow();
  });

  it("rejects an unknown status", () => {
    expect(() =>
      specTreeNodeSchema.parse({ ...baseNode, status: "shipped" }),
    ).toThrow();
  });

  it("rejects a negative cost", () => {
    expect(() =>
      specTreeNodeSchema.parse({ ...baseNode, costMtdCents: -1 }),
    ).toThrow();
  });
});

describe("specTreeResponseSchema", () => {
  it("requires at least an empty nodes array", () => {
    const ok = specTreeResponseSchema.safeParse({
      gameId: "game-1",
      generatedAt: "2026-05-12T00:00:00.000Z",
      concept: {
        path: "specs/concept/x.concept.md",
        primaryAesthetic: "Fellowship under pressure",
        title: "x",
      },
      nodes: [],
    });
    expect(ok.success).toBe(true);
  });
});

describe("formatCents", () => {
  it("formats under $1k with two decimals", () => {
    expect(formatCents(42)).toBe("$0.42");
    expect(formatCents(1234)).toBe("$12.34");
    expect(formatCents(0)).toBe("$0.00");
  });

  it("collapses to k-suffix at $1000+", () => {
    expect(formatCents(100_000)).toBe("$1.0k");
    expect(formatCents(1_234_500)).toBe("$12.3k");
  });
});
