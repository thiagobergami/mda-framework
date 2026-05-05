/**
 * Reads what specs already exist on disk so the wizard can branch its menu.
 * Walks `specs/{concept,aesthetics,dynamics,mechanics,tuning,assets}` and returns a
 * lightweight summary keyed by layer. Falls back to empty arrays if a directory is missing.
 */

import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

export interface ExistingSpecs {
  concepts: string[];
  aesthetics: string[];
  dynamics: string[];
  mechanics: string[];
  tuning: string[];
  assets: string[];
  levels: string[];
}

async function listMarkdown(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    return entries.filter((e) => e.endsWith(".md") && !e.startsWith("_"));
  } catch {
    return [];
  }
}

export async function listExistingSpecs(root: string): Promise<ExistingSpecs> {
  const [concepts, aesthetics, dynamics, mechanics, tuning, assets, levels] = await Promise.all([
    listMarkdown(resolve(root, "specs/concept")),
    listMarkdown(resolve(root, "specs/aesthetics")),
    listMarkdown(resolve(root, "specs/dynamics")),
    listMarkdown(resolve(root, "specs/mechanics")),
    listMarkdown(resolve(root, "specs/tuning")),
    listMarkdown(resolve(root, "specs/assets")),
    listMarkdown(resolve(root, "design/levels")),
  ]);
  return { concepts, aesthetics, dynamics, mechanics, tuning, assets, levels };
}
