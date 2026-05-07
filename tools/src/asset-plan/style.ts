import type { SpecContent } from "../types.js";

/** A pointer to a spec section that constrains the plan's style. */
export interface StyleSource {
  /** Which precedence layer this source belongs to */
  layer: "aes" | "concept" | "asset" | "style-guide";
  /** Spec ID (e.g. "AES-001") or sentinel "STYLE-GUIDE" */
  ref: string;
  /** Repo-relative file path */
  file: string;
  /** Section headings inside the file the composer points the reader at */
  highlights: string[];
}

const ASSET_HIGHLIGHTS = ["emotional intent", "technical requirements", "purpose"];
const CONCEPT_HIGHLIGHTS = [
  "aesthetic profile",
  "visual direction",
  "audio direction",
  "vision",
];
const STYLE_GUIDE_FILE = "design/asset-plans/_style-guide.md";

/**
 * Build the precedence-ordered list of style sources for a plan.
 *
 * Order is significant — the composer renders them in this order, and the
 * convention is that earlier entries override later ones on conflict:
 *
 *   AES specs  →  concept spec  →  asset's own intent  →  global style guide
 *
 * Highlights point the reader at the sections most likely to contain
 * style-relevant constraints inside each file.
 */
export function aggregateStyle(
  assetSpec: SpecContent,
  conceptSpec: SpecContent | null,
  aesSpecs: SpecContent[],
): StyleSource[] {
  const sources: StyleSource[] = [];

  for (const aes of aesSpecs) {
    sources.push({
      layer: "aes",
      ref: aes.id,
      file: aes.file,
      highlights: pickHighlights(aes, ["mood", "visual", "audio", "style", "constraint", "tone"]),
    });
  }

  if (conceptSpec) {
    sources.push({
      layer: "concept",
      ref: conceptSpec.id,
      file: conceptSpec.file,
      highlights: pickHighlights(conceptSpec, CONCEPT_HIGHLIGHTS),
    });
  }

  sources.push({
    layer: "asset",
    ref: assetSpec.id,
    file: assetSpec.file,
    highlights: pickHighlights(assetSpec, ASSET_HIGHLIGHTS),
  });

  sources.push({
    layer: "style-guide",
    ref: "STYLE-GUIDE",
    file: STYLE_GUIDE_FILE,
    highlights: ["color", "3d", "texture", "audio", "animation", "naming"],
  });

  return sources;
}

/** Return section headings from a spec whose name contains any keyword. */
function pickHighlights(spec: SpecContent, keywords: string[]): string[] {
  const out: string[] = [];
  for (const heading of spec.sections.keys()) {
    if (keywords.some((kw) => heading.includes(kw))) {
      out.push(heading);
    }
  }
  return out;
}
