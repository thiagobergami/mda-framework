import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { specTreeResponseSchema } from "@mda-studio/shared";
import { rebuildSpecCache, clearCache } from "./spec-cache";
import { assembleSpecTreeResponse } from "./spec-tree-assembly";

const FIXTURE_ROOT = join(__dirname, "__fixtures__/specs-virus-hunter");

describe("assembleSpecTreeResponse", () => {
  it("produces a response that validates against the shared schema", async () => {
    clearCache();
    const entry = await rebuildSpecCache("virus-hunter", FIXTURE_ROOT);
    const response = assembleSpecTreeResponse({
      gameId: "virus-hunter",
      concept: {
        path: "specs/concept/virus-hunter.concept.md",
        primaryAesthetic: "Fellowship",
        title: "Virus Hunter",
      },
      specs: entry.specs,
    });
    expect(() => specTreeResponseSchema.parse(response)).not.toThrow();
    expect(response.nodes.length).toBe(entry.specs.length);
  });

  it("zero-fills issue/cost/warning fields in V1", async () => {
    clearCache();
    const entry = await rebuildSpecCache("virus-hunter", FIXTURE_ROOT);
    const response = assembleSpecTreeResponse({
      gameId: "virus-hunter",
      concept: { path: "x", primaryAesthetic: "Fellowship", title: "x" },
      specs: entry.specs,
    });
    for (const node of response.nodes) {
      expect(node.activeIssueId).toBeNull();
      expect(node.assigneeAgentId).toBeNull();
      expect(node.runStatus).toBeNull();
      expect(node.costMtdCents).toBe(0);
      expect(node.costMtdSubtreeCents).toBe(0);
      expect(node.warningCount).toBe(0);
    }
  });

  it("preserves canonical and secondary parents", async () => {
    clearCache();
    const entry = await rebuildSpecCache("virus-hunter", FIXTURE_ROOT);
    const response = assembleSpecTreeResponse({
      gameId: "virus-hunter",
      concept: { path: "x", primaryAesthetic: "Fellowship", title: "x" },
      specs: entry.specs,
    });
    const mec3 = response.nodes.find((n) => n.specId === "MEC-003");
    expect(mec3?.canonicalParentSpecId).toBe("DYN-002");
    expect(mec3?.secondaryParentSpecIds).toEqual(["DYN-001"]);
  });
});
