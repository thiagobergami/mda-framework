import { describe, expect, it } from "vitest";
import { virusHunterTree } from "../fixtures/virus-hunter";
import {
  EMPTY_LENSES,
  applyLensPatch,
  applyLenses,
  lensesAreActive,
  parseLenses,
} from "./lenses";

const nodes = virusHunterTree.nodes;

describe("parseLenses", () => {
  it("returns EMPTY_LENSES for an empty query string", () => {
    expect(parseLenses(new URLSearchParams(""))).toEqual(EMPTY_LENSES);
  });

  it("parses every supported lens, stripping a leading @ from agent", () => {
    const ps = new URLSearchParams(
      "agent=@mech-1&status=draft&layer=M&lens=warnings&q=revive",
    );
    expect(parseLenses(ps)).toEqual({
      agent: "mech-1",
      status: "draft",
      layer: "M",
      warnings: true,
      q: "revive",
    });
  });

  it("ignores unknown status / layer values", () => {
    const ps = new URLSearchParams("status=shipped&layer=Z");
    const r = parseLenses(ps);
    expect(r.status).toBeNull();
    expect(r.layer).toBeNull();
  });

  it("treats `lens` values other than 'warnings' as no-op for U5", () => {
    expect(parseLenses(new URLSearchParams("lens=other")).warnings).toBe(false);
  });
});

describe("applyLensPatch", () => {
  it("setting a value adds the param; setting to empty removes it", () => {
    const ps = new URLSearchParams("node=MEC-001");
    const a = applyLensPatch(ps, { agent: "mech-1" });
    expect(a.get("agent")).toBe("mech-1");
    expect(a.get("node")).toBe("MEC-001"); // unrelated key preserved

    const b = applyLensPatch(a, { agent: null });
    expect(b.get("agent")).toBe(null);
  });

  it("warnings=true sets lens=warnings; false removes it only if currently warnings", () => {
    const ps = applyLensPatch(new URLSearchParams(""), { warnings: true });
    expect(ps.get("lens")).toBe("warnings");
    const cleared = applyLensPatch(ps, { warnings: false });
    expect(cleared.get("lens")).toBe(null);
  });

  it("warnings=false leaves an unrelated `lens` param alone", () => {
    const ps = new URLSearchParams("lens=future-mode");
    const out = applyLensPatch(ps, { warnings: false });
    expect(out.get("lens")).toBe("future-mode");
  });

  it("q='' removes the param entirely", () => {
    const ps = new URLSearchParams("q=foo");
    expect(applyLensPatch(ps, { q: "" }).get("q")).toBe(null);
  });
});

describe("lensesAreActive", () => {
  it("returns false for EMPTY_LENSES", () => {
    expect(lensesAreActive(EMPTY_LENSES)).toBe(false);
  });

  it("returns true if any single lens is set", () => {
    expect(lensesAreActive({ ...EMPTY_LENSES, q: "x" })).toBe(true);
    expect(lensesAreActive({ ...EMPTY_LENSES, warnings: true })).toBe(true);
  });
});

describe("applyLenses", () => {
  it("returns all nodes visible when no lens is active", () => {
    const r = applyLenses(nodes, EMPTY_LENSES);
    expect(r.visibleSpecIds.size).toBe(nodes.length);
    expect(r.matchingSpecIds.size).toBe(nodes.length);
    expect(r.ancestorSpecIds.size).toBe(0);
  });

  it("free-text q filters to MEC-001 and pulls in AES-001 + DYN-001 as ancestors", () => {
    const r = applyLenses(nodes, { ...EMPTY_LENSES, q: "revive interaction" });
    expect([...r.matchingSpecIds]).toEqual(["MEC-001"]);
    expect(r.ancestorSpecIds.has("DYN-001")).toBe(true);
    expect(r.ancestorSpecIds.has("AES-001")).toBe(true);
    expect(r.visibleSpecIds.has("MEC-001")).toBe(true);
    expect(r.visibleSpecIds.has("DYN-001")).toBe(true);
  });

  it("layer lens shows only matching layer plus their ancestors (here AES has none)", () => {
    const r = applyLenses(nodes, { ...EMPTY_LENSES, layer: "M" });
    expect([...r.matchingSpecIds].sort()).toEqual(
      ["MEC-001", "MEC-002", "MEC-003"].sort(),
    );
    // MEC ancestors include DYN + AES
    expect(r.visibleSpecIds.has("DYN-001")).toBe(true);
    expect(r.visibleSpecIds.has("AES-001")).toBe(true);
  });

  it("agent lens matches without the leading @", () => {
    const r = applyLenses(nodes, { ...EMPTY_LENSES, agent: "mech-1" });
    expect(r.matchingSpecIds.has("MEC-001")).toBe(true);
  });

  it("warnings lens drops nodes with warningCount = 0", () => {
    // Fixture: AES-002 has 1 warning; MEC-001 has 0
    const r = applyLenses(nodes, { ...EMPTY_LENSES, warnings: true });
    expect(r.matchingSpecIds.has("AES-002")).toBe(true);
    expect(r.matchingSpecIds.has("MEC-001")).toBe(false);
  });

  it("combines lenses with AND", () => {
    const r = applyLenses(nodes, {
      ...EMPTY_LENSES,
      layer: "M",
      status: "impl",
    });
    expect([...r.matchingSpecIds].sort()).toEqual(["MEC-001", "MEC-003"]);
  });
});
