import { describe, expect, it } from "vitest";
import { specTreeResponseSchema } from "@mda-studio/shared";
import { virusHunterTree, virusHunterSpecBodies } from "./virus-hunter";

describe("virus-hunter fixture", () => {
  it("validates against the shared SpecTreeResponse schema", () => {
    expect(() => specTreeResponseSchema.parse(virusHunterTree)).not.toThrow();
  });

  it("every node's canonical parent (if set) exists in the tree", () => {
    const ids = new Set(virusHunterTree.nodes.map((n) => n.specId));
    for (const n of virusHunterTree.nodes) {
      if (n.canonicalParentSpecId) {
        expect(ids.has(n.canonicalParentSpecId)).toBe(true);
      }
    }
  });

  it("every secondary parent reference exists", () => {
    const ids = new Set(virusHunterTree.nodes.map((n) => n.specId));
    for (const n of virusHunterTree.nodes) {
      for (const p of n.secondaryParentSpecIds) {
        expect(ids.has(p)).toBe(true);
      }
    }
  });

  it("provides a spec body for every node", () => {
    for (const n of virusHunterTree.nodes) {
      expect(virusHunterSpecBodies[n.specId]).toBeTruthy();
    }
  });
});
