/**
 * In-memory frontmatter cache, keyed by game id.
 *
 * Phase U2 keeps this in-process and rebuilds on demand. Phase U6 (SSE)
 * adds invalidation on git-push webhooks. A persistent `spec_frontmatter_cache`
 * table arrives once drizzle-kit is wired (parent plan note).
 *
 * The walker covers six directories under a game's workspace:
 *
 *   specs/aesthetics/*.aes.md
 *   specs/dynamics/*.dyn.md
 *   specs/mechanics/*.mec.md
 *   specs/assets/*.asset.md
 *   specs/tuning/*.tune.md
 *   design/levels/*.level.md
 *
 * Files whose basename starts with `_` are skipped (those are schemas, not
 * specs). Other unrecognized files are also skipped; the parser owns that
 * decision.
 */

import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, posix, relative, sep } from "node:path";
import {
  parseSpecFile,
  type ParseIssue,
  type ParsedSpec,
} from "./spec-parser.js";

const SCAN_DIRS: readonly string[] = [
  "specs/aesthetics",
  "specs/dynamics",
  "specs/mechanics",
  "specs/assets",
  "specs/tuning",
  "design/levels",
];

export interface CacheEntry {
  /** Absolute path to the game's workspace root. */
  specsRoot: string;
  specs: ParsedSpec[];
  issues: ParseIssue[];
  rebuiltAt: string; // ISO timestamp
}

const cache = new Map<string, CacheEntry>();

/** Returns the current cache entry for a game (or undefined if never built). */
export function getCacheEntry(gameId: string): CacheEntry | undefined {
  return cache.get(gameId);
}

/** Clears all cached entries. Test-only convenience. */
export function clearCache(): void {
  cache.clear();
}

/**
 * Rebuild the cache for one game by walking its specs/ + design/levels/
 * directories. Idempotent — rerunning replaces the previous entry.
 */
export async function rebuildSpecCache(
  gameId: string,
  specsRoot: string,
): Promise<CacheEntry> {
  const specs: ParsedSpec[] = [];
  const issues: ParseIssue[] = [];

  for (const rel of SCAN_DIRS) {
    const absDir = join(specsRoot, rel);
    let entries: string[];
    try {
      entries = await readdir(absDir);
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === "ENOENT") continue; // dir absent → skip silently
      throw e;
    }
    for (const name of entries) {
      if (name.startsWith("_")) continue;
      if (!name.endsWith(".md")) continue;
      const absFile = join(absDir, name);
      const sourcePath = toPosix(relative(specsRoot, absFile));
      let contents: string;
      try {
        contents = readFileSync(absFile, "utf8");
      } catch (e) {
        issues.push({
          kind: "skipped",
          sourcePath,
          reason: `read error: ${(e as Error).message}`,
        });
        continue;
      }
      const result = parseSpecFile(sourcePath, contents);
      if (result.ok) {
        specs.push(result.spec);
      } else {
        issues.push(result.issue);
      }
    }
  }

  specs.sort((a, b) => a.specId.localeCompare(b.specId));
  const entry: CacheEntry = {
    specsRoot,
    specs,
    issues,
    rebuiltAt: new Date().toISOString(),
  };
  cache.set(gameId, entry);
  return entry;
}

function toPosix(p: string): string {
  return p.split(sep).join(posix.sep);
}
