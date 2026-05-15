import { describe, expect, it } from "vitest";
import {
  LAYER_COLOR_TOKENS,
  LAYER_GLYPHS,
  LAYER_LABELS,
  MDA_LAYERS,
  STATUSES_BY_LAYER,
  STATUS_COLOR_TOKENS,
  STATUS_GLYPHS,
  STATUS_LABELS,
  SPEC_STATUSES,
  isValidStatusForLayer,
  layerFromSpecId,
} from "./mda";

describe("MDA layers", () => {
  it("exposes the six canonical layers in MDA order", () => {
    expect(MDA_LAYERS).toEqual(["A", "D", "M", "AST", "TUNE", "LEVEL"]);
  });

  it("every layer has a glyph, color token, and label", () => {
    for (const layer of MDA_LAYERS) {
      expect(LAYER_GLYPHS[layer]).toMatch(/.+/);
      expect(LAYER_COLOR_TOKENS[layer]).toMatch(/^--mda-layer-/);
      expect(LAYER_LABELS[layer]).toMatch(/.+/);
    }
  });

  it("every layer declares its allowed statuses (matches _schema.md)", () => {
    expect(STATUSES_BY_LAYER.A).toEqual(["draft", "frozen"]);
    expect(STATUSES_BY_LAYER.D).toEqual(["draft", "frozen"]);
    expect(STATUSES_BY_LAYER.M).toEqual(["draft", "impl"]);
    expect(STATUSES_BY_LAYER.AST).toEqual([
      "concept",
      "placeholder",
      "draft",
      "final",
    ]);
    expect(STATUSES_BY_LAYER.TUNE).toEqual(["draft", "live"]);
    expect(STATUSES_BY_LAYER.LEVEL).toEqual([
      "blockout",
      "playable",
      "polished",
    ]);
  });
});

describe("spec statuses", () => {
  it("every status has a glyph, color token, and label", () => {
    for (const status of SPEC_STATUSES) {
      expect(STATUS_GLYPHS[status]).toMatch(/.+/);
      expect(STATUS_COLOR_TOKENS[status]).toMatch(/^--mda-status-/);
      expect(STATUS_LABELS[status]).toMatch(/.+/);
    }
  });

  it("isValidStatusForLayer accepts canonical pairings", () => {
    expect(isValidStatusForLayer("A", "frozen")).toBe(true);
    expect(isValidStatusForLayer("M", "impl")).toBe(true);
    expect(isValidStatusForLayer("AST", "placeholder")).toBe(true);
    expect(isValidStatusForLayer("LEVEL", "blockout")).toBe(true);
  });

  it("isValidStatusForLayer rejects cross-layer mistakes", () => {
    expect(isValidStatusForLayer("A", "impl")).toBe(false);
    expect(isValidStatusForLayer("M", "frozen")).toBe(false);
    expect(isValidStatusForLayer("LEVEL", "draft")).toBe(false);
  });
});

describe("layerFromSpecId", () => {
  it.each([
    ["AES-001", "A"],
    ["DYN-042", "D"],
    ["MEC-003", "M"],
    ["AST-007", "AST"],
    ["TUN-001", "TUNE"],
    ["LVL-002", "LEVEL"],
  ] as const)("maps %s → %s", (id, layer) => {
    expect(layerFromSpecId(id)).toBe(layer);
  });

  it("returns null for unknown prefixes", () => {
    expect(layerFromSpecId("GAME-001")).toBe(null);
    expect(layerFromSpecId("XYZ-1")).toBe(null);
    expect(layerFromSpecId("")).toBe(null);
  });
});
