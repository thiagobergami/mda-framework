/**
 * Reads one spec .md file and produces a normalized `ParsedSpec`.
 *
 * The parser is deliberately tolerant: a malformed file produces an issue
 * (with `kind: "skipped"` and a reason) rather than throwing. Callers
 * decide whether to log, warn, or surface the issue.
 *
 * Coverage:
 *   - AES / DYN / MEC / AST / TUN: layer derived from frontmatter `id` prefix
 *   - LVL (under `design/levels/`): layer derived the same way; canonical
 *     parent is null (level appears as a parallel root branch per plan D4);
 *     outgoing refs come from the `references:` block
 *
 * The parser does NOT touch the filesystem — pass it the raw text. The
 * cache layer is responsible for walking the directory.
 */

import { parse as parseYaml } from "yaml";
import {
  layerFromSpecId,
  isValidStatusForLayer,
  type Layer,
  type SpecStatus,
} from "@mda-studio/shared";

export interface ParsedSpec {
  /** Frontmatter `id`, e.g. "MEC-003". */
  specId: string;
  layer: Layer;
  /** Frontmatter `name` if present, else first H1 in the body, else the id. */
  title: string;
  status: SpecStatus;
  canonicalParentSpecId: string | null;
  secondaryParentSpecIds: string[];
  outgoingRefSpecIds: string[];
  /** Source path relative to the specs root (e.g. "specs/mechanics/x.mec.md"). */
  sourcePath: string;
}

export interface ParseIssue {
  kind: "skipped";
  sourcePath: string;
  reason: string;
}

export type ParseResult =
  | { ok: true; spec: ParsedSpec }
  | { ok: false; issue: ParseIssue };

interface Frontmatter {
  id?: unknown;
  name?: unknown;
  status?: unknown;
  traces_to_aesthetics?: unknown;
  traces_to_dynamics?: unknown;
  traces_to_mechanics?: unknown;
  references?: unknown;
}

interface ReferencesBlock {
  aesthetics?: unknown;
  dynamics?: unknown;
  mechanics?: unknown;
  assets?: unknown;
}

/** Default status used when the spec frontmatter omits one. */
const DEFAULT_STATUS_BY_LAYER: Readonly<Record<Layer, SpecStatus>> = {
  A: "draft",
  D: "draft",
  M: "draft",
  AST: "concept",
  TUNE: "draft",
  LEVEL: "blockout",
};

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Parse one spec file's contents.
 *
 * @param sourcePath path relative to the specs root, used only in errors and
 *                   in the returned ParsedSpec
 * @param contents   raw markdown
 */
export function parseSpecFile(
  sourcePath: string,
  contents: string,
): ParseResult {
  const match = FRONTMATTER_RE.exec(contents);
  if (!match) {
    return skipped(sourcePath, "no frontmatter block");
  }
  const [, yamlBlock, body] = match;
  if (yamlBlock === undefined || body === undefined) {
    return skipped(sourcePath, "empty frontmatter");
  }

  let fm: Frontmatter;
  try {
    const parsed = parseYaml(yamlBlock);
    if (!parsed || typeof parsed !== "object") {
      return skipped(sourcePath, "frontmatter is not an object");
    }
    fm = parsed as Frontmatter;
  } catch (e) {
    return skipped(sourcePath, `yaml parse error: ${(e as Error).message}`);
  }

  if (typeof fm.id !== "string" || fm.id.trim() === "") {
    return skipped(sourcePath, "missing or empty `id`");
  }
  const specId = fm.id.trim();
  const layer = layerFromSpecId(specId);
  if (!layer) {
    return skipped(sourcePath, `unrecognized id prefix in "${specId}"`);
  }

  const title = extractTitle(fm, body, specId);
  const status = resolveStatus(fm.status, layer);

  const parents = resolveParents(layer, fm);
  const outgoingRefs = layer === "LEVEL" ? resolveLevelRefs(fm.references) : [];

  return {
    ok: true,
    spec: {
      specId,
      layer,
      title,
      status,
      canonicalParentSpecId: parents.canonical,
      secondaryParentSpecIds: parents.secondary,
      outgoingRefSpecIds: outgoingRefs,
      sourcePath,
    },
  };
}

function skipped(sourcePath: string, reason: string): ParseResult {
  return { ok: false, issue: { kind: "skipped", sourcePath, reason } };
}

function extractTitle(fm: Frontmatter, body: string, fallback: string): string {
  if (typeof fm.name === "string" && fm.name.trim()) return fm.name.trim();
  const h1 = /^#\s+(.+?)\s*$/m.exec(body);
  if (h1 && h1[1]) return h1[1].trim();
  return fallback;
}

function resolveStatus(raw: unknown, layer: Layer): SpecStatus {
  if (typeof raw === "string") {
    const candidate = raw.trim() as SpecStatus;
    if (isValidStatusForLayer(layer, candidate)) return candidate;
  }
  return DEFAULT_STATUS_BY_LAYER[layer];
}

interface ResolvedParents {
  canonical: string | null;
  secondary: string[];
}

/**
 * Per plan D1: each spec has one canonical parent (first in the relevant
 * traces_to_* array for its layer); the rest are secondary.
 *
 *   layer  canonical-comes-from         (others → secondary)
 *   ─────  ───────────────────────────  ───────────────────────────────
 *   A      —                             —
 *   D      traces_to_aesthetics[0]       …[1..]
 *   M      traces_to_dynamics[0]         …[1..] + traces_to_aesthetics
 *   AST    traces_to_mechanics[0]        …[1..] + traces_to_aesthetics
 *   TUNE   traces_to_mechanics[0]        …[1..] + traces_to_dynamics
 *                                              + traces_to_aesthetics
 *   LEVEL  —  (parallel root branch)     —  (refs go in outgoingRefSpecIds)
 */
function resolveParents(layer: Layer, fm: Frontmatter): ResolvedParents {
  const aes = stringArray(fm.traces_to_aesthetics);
  const dyn = stringArray(fm.traces_to_dynamics);
  const mec = stringArray(fm.traces_to_mechanics);

  switch (layer) {
    case "A":
    case "LEVEL":
      return { canonical: null, secondary: [] };
    case "D":
      return splitFirst(aes);
    case "M": {
      const head = splitFirst(dyn);
      return { canonical: head.canonical, secondary: [...head.secondary, ...aes] };
    }
    case "AST": {
      const head = splitFirst(mec);
      return { canonical: head.canonical, secondary: [...head.secondary, ...aes] };
    }
    case "TUNE": {
      const head = splitFirst(mec);
      return {
        canonical: head.canonical,
        secondary: [...head.secondary, ...dyn, ...aes],
      };
    }
  }
}

function splitFirst(arr: string[]): ResolvedParents {
  if (arr.length === 0) return { canonical: null, secondary: [] };
  const [first, ...rest] = arr;
  return { canonical: first ?? null, secondary: rest };
}

function resolveLevelRefs(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const refs = raw as ReferencesBlock;
  return [
    ...stringArray(refs.aesthetics),
    ...stringArray(refs.dynamics),
    ...stringArray(refs.mechanics),
    ...stringArray(refs.assets),
  ];
}

function stringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const t = item.trim();
      if (t) out.push(t);
    }
  }
  return out;
}
