import { describe, expect, it } from "vitest";
import { buildSpecTree, upwardTrace } from "./spec-tree-utils";
import { virusHunterTree } from "../fixtures/virus-hunter";

describe("buildSpecTree", () => {
  it("returns the two AES roots and the LEVEL root from the virus-hunter fixture", () => {
    const tree = buildSpecTree(virusHunterTree.nodes);
    const rootIds = tree.map((r) => r.node.specId);
    expect(rootIds).toEqual(["AES-001", "AES-002", "LEVEL-tutorial-lab"]);
  });

  it("nests MEC-001 under DYN-001 under AES-001 with AST-007 as a leaf", () => {
    const tree = buildSpecTree(virusHunterTree.nodes);
    const aes001 = tree.find((r) => r.node.specId === "AES-001");
    const dyn001 = aes001?.children.find((c) => c.node.specId === "DYN-001");
    const mec001 = dyn001?.children.find((c) => c.node.specId === "MEC-001");
    expect(mec001?.children.map((c) => c.node.specId)).toEqual(
      expect.arrayContaining(["AST-007", "TUNE-001"]),
    );
  });

  it("renders MEC-003 only under its canonical DYN-002 parent (not duplicated)", () => {
    const tree = buildSpecTree(virusHunterTree.nodes);
    const ids: string[] = [];
    const walk = (rows: ReturnType<typeof buildSpecTree>): void => {
      for (const r of rows) {
        ids.push(r.node.specId);
        walk(r.children);
      }
    };
    walk(tree);
    const appearances = ids.filter((id) => id === "MEC-003").length;
    expect(appearances).toBe(1);
  });
});

describe("upwardTrace", () => {
  it("traces MEC-001 → DYN-001 → AES-001", () => {
    const trail = upwardTrace(virusHunterTree.nodes, "MEC-001").map(
      (n) => n.specId,
    );
    expect(trail).toEqual(["AES-001", "DYN-001"]);
  });

  it("returns empty for a root", () => {
    expect(upwardTrace(virusHunterTree.nodes, "AES-001")).toEqual([]);
  });
});
