/**
 * Reads what specs already exist on disk for a specific game so the wizard can branch
 * its menu. Walks `games/<game>/specs/{...}` and `games/<game>/design/levels/`. Returns
 * empty arrays for missing directories.
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

export async function listExistingSpecs(root: string, game: string): Promise<ExistingSpecs> {
  const gameRoot = resolve(root, "games", game);
  const [concepts, aesthetics, dynamics, mechanics, tuning, assets, levels] = await Promise.all([
    listMarkdown(resolve(gameRoot, "specs/concept")),
    listMarkdown(resolve(gameRoot, "specs/aesthetics")),
    listMarkdown(resolve(gameRoot, "specs/dynamics")),
    listMarkdown(resolve(gameRoot, "specs/mechanics")),
    listMarkdown(resolve(gameRoot, "specs/tuning")),
    listMarkdown(resolve(gameRoot, "specs/assets")),
    listMarkdown(resolve(gameRoot, "design/levels")),
  ]);
  return { concepts, aesthetics, dynamics, mechanics, tuning, assets, levels };
}
