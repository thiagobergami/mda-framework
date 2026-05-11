import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { parseAll } from "../parser.js";
import type { SpecContent } from "../types.js";
import { ASSET_PLAN_ROOT } from "./profile.js";

/** Find a single spec by its ID across the main "specs" scope. */
export async function findSpecById(root: string, specId: string): Promise<SpecContent | null> {
  const allScopes = await parseAll(root);
  const specs = allScopes.get("specs") ?? [];
  return specs.find((s) => s.id === specId) ?? null;
}

/**
 * Find the asset spec for the given asset ID. Throws with a clear message if
 * not found, since the entire plan generation depends on it.
 */
export async function findAssetSpec(root: string, assetId: string): Promise<SpecContent> {
  if (!/^AST-\d+$/.test(assetId)) {
    throw new Error(`Invalid asset ID "${assetId}". Expected format AST-NNN.`);
  }
  const spec = await findSpecById(root, assetId);
  if (!spec) {
    throw new Error(
      `Asset spec ${assetId} not found in specs/assets/. ` +
        `Run \`mda new asset "<name>"\` to create one.`,
    );
  }
  if (spec.layer !== "AST") {
    throw new Error(`Spec ${assetId} exists but is not an asset (layer: ${spec.layer}).`);
  }
  return spec;
}

/** Find the project's game-concept spec, if any. */
export async function findConceptSpec(root: string): Promise<SpecContent | null> {
  const allScopes = await parseAll(root);
  const specs = allScopes.get("specs") ?? [];
  const concepts = specs.filter((s) => s.layer === "GAME");
  return concepts[0] ?? null;
}

/** Find AES specs whose ID is in `ids`. Returns them in input order. */
export async function findAesSpecs(root: string, ids: string[]): Promise<SpecContent[]> {
  if (ids.length === 0) return [];
  const allScopes = await parseAll(root);
  const specs = allScopes.get("specs") ?? [];
  const byId = new Map(specs.map((s) => [s.id, s] as const));
  const out: SpecContent[] = [];
  for (const id of ids) {
    const spec = byId.get(id);
    if (spec && spec.layer === "AES") out.push(spec);
  }
  return out;
}

/**
 * Compute the next plan version for an asset. Scans existing
 * `design/asset-plans/{assetId}/{assetId}.v*.plan.md` files and returns
 * `max(N) + 1`, or 1 if none exist.
 */
export async function nextVersion(root: string, assetId: string): Promise<number> {
  const dir = resolve(root, ASSET_PLAN_ROOT, assetId);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return 1;
    throw err;
  }

  const re = new RegExp(`^${assetId}\\.v(\\d+)\\.plan\\.md$`);
  const versions = entries
    .map((name) => name.match(re))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => parseInt(m[1], 10))
    .filter((n) => !isNaN(n));

  return versions.length === 0 ? 1 : Math.max(...versions) + 1;
}

/**
 * Extract `traces_to_aesthetics` IDs from an asset spec's frontmatter,
 * tolerating both string-list and comma-string forms.
 */
export function aesIdsFromAsset(asset: SpecContent): string[] {
  const value = asset.frontmatter["traces_to_aesthetics"];
  if (Array.isArray(value)) {
    return value.flatMap((v) => String(v).match(/AES-\d+/g) ?? []);
  }
  if (typeof value === "string") {
    return value.match(/AES-\d+/g) ?? [];
  }
  return [];
}

/**
 * Extract the `type:` field (model | animation | sound | …) from an asset
 * spec. Throws if missing or invalid — every asset must declare its type
 * so the router can pick a tool.
 */
export function assetTypeOf(asset: SpecContent): string {
  const value = asset.frontmatter["type"];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `Asset ${asset.id} is missing required frontmatter field "type". ` +
        `Expected one of: model, animation, sound, music, texture, particle, ui.`,
    );
  }
  return value.toLowerCase();
}

/** Extract an optional per-asset tool override from frontmatter. */
export function toolOverrideOf(asset: SpecContent): string | undefined {
  const value = asset.frontmatter["tool"];
  return typeof value === "string" && value.length > 0 ? value.toLowerCase() : undefined;
}
