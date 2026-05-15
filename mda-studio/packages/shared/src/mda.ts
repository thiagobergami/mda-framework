/**
 * MDA framework vocabulary as shared by the Studio server and UI.
 *
 * The six layers and the per-layer status values mirror the spec `_schema.md`
 * files in `specs/` and `design/levels/`. Glyphs and color tokens are the
 * single source of truth for the spec-tree-first UI (see
 * `design/mda-studio/spec-tree-ui/plan.md §10`).
 */

export const MDA_LAYERS = ["A", "D", "M", "AST", "TUNE", "LEVEL"] as const;
export type Layer = (typeof MDA_LAYERS)[number];

/** Statuses observed across MDA spec frontmatter, unioned per layer. */
export const SPEC_STATUSES = [
  "concept",
  "draft",
  "frozen",
  "impl",
  "placeholder",
  "final",
  "live",
  "blockout",
  "playable",
  "polished",
] as const;
export type SpecStatus = (typeof SPEC_STATUSES)[number];

/** Which statuses are legal for which layer (per `_schema.md`). */
export const STATUSES_BY_LAYER: Readonly<Record<Layer, readonly SpecStatus[]>> = {
  A: ["draft", "frozen"],
  D: ["draft", "frozen"],
  M: ["draft", "impl"],
  AST: ["concept", "placeholder", "draft", "final"],
  TUNE: ["draft", "live"],
  LEVEL: ["blockout", "playable", "polished"],
};

/**
 * Real MDA spec frontmatter uses long-form id prefixes (AES-, DYN-, MEC-,
 * AST-, TUN-, LVL-). The studio UI uses short layer codes (A/D/M/AST/TUNE/
 * LEVEL). This mapping is the single bridge between the two vocabularies.
 *
 * The longest matching prefix wins so AES- isn't misread as AST- etc.
 */
const ID_PREFIX_TO_LAYER: ReadonlyArray<readonly [string, Layer]> = [
  ["AES-", "A"],
  ["DYN-", "D"],
  ["MEC-", "M"],
  ["AST-", "AST"],
  ["TUN-", "TUNE"],
  ["LVL-", "LEVEL"],
];

/** Returns the layer for a spec id like "MEC-003" or null if unrecognized. */
export function layerFromSpecId(specId: string): Layer | null {
  for (const [prefix, layer] of ID_PREFIX_TO_LAYER) {
    if (specId.startsWith(prefix)) return layer;
  }
  return null;
}

/** Single-character layer badge. */
export const LAYER_GLYPHS: Readonly<Record<Layer, string>> = {
  A: "A",
  D: "D",
  M: "M",
  AST: "★",
  TUNE: "≈",
  LEVEL: "◇",
};

/** CSS custom-property names for each layer's color token. */
export const LAYER_COLOR_TOKENS: Readonly<Record<Layer, string>> = {
  A: "--mda-layer-a",
  D: "--mda-layer-d",
  M: "--mda-layer-m",
  AST: "--mda-layer-ast",
  TUNE: "--mda-layer-tune",
  LEVEL: "--mda-layer-level",
};

/** Status → glyph. ◌ → ◐ → ● is the progression; LEVEL has its own. */
export const STATUS_GLYPHS: Readonly<Record<SpecStatus, string>> = {
  concept: "◌",
  draft: "◐",
  frozen: "●",
  impl: "●",
  placeholder: "◐",
  final: "●",
  live: "●",
  blockout: "▣",
  playable: "◧",
  polished: "◆",
};

/** Status → CSS color token. */
export const STATUS_COLOR_TOKENS: Readonly<Record<SpecStatus, string>> = {
  concept: "--mda-status-concept",
  draft: "--mda-status-draft",
  frozen: "--mda-status-frozen",
  impl: "--mda-status-impl",
  placeholder: "--mda-status-draft",
  final: "--mda-status-frozen",
  live: "--mda-status-frozen",
  blockout: "--mda-status-blockout",
  playable: "--mda-status-playable",
  polished: "--mda-status-polished",
};

/** Plain-English label for tooltips and aria-labels. */
export const STATUS_LABELS: Readonly<Record<SpecStatus, string>> = {
  concept: "Concept",
  draft: "Draft",
  frozen: "Frozen",
  impl: "Implemented",
  placeholder: "Placeholder",
  final: "Final",
  live: "Live",
  blockout: "Blockout",
  playable: "Playable",
  polished: "Polished",
};

export const LAYER_LABELS: Readonly<Record<Layer, string>> = {
  A: "Aesthetic",
  D: "Dynamic",
  M: "Mechanic",
  AST: "Asset",
  TUNE: "Tuning",
  LEVEL: "Level",
};

export function isValidStatusForLayer(layer: Layer, status: SpecStatus): boolean {
  return STATUSES_BY_LAYER[layer].includes(status);
}
