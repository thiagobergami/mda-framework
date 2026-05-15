/**
 * Walks `<specsRoot>/design/asset-plans/` and reports each per-asset
 * directory's state (plan §14 U7).
 *
 * Conventions (from design/asset-plans/spec.md, plan.md):
 *   - Each asset gets its own directory keyed by `assetId` (e.g.
 *     `revive-vfx/`). Underscore-prefixed entries are profile/style docs
 *     (`_tools/`, `_engines/`, `_routing.md`, `_style-guide.md`) and are
 *     skipped.
 *   - Plan files inside an asset dir follow `<assetId>.v<N>.plan.md`.
 *   - `refs/` holds inputs. `output/` holds artifacts produced by exec.
 *
 * State derivation (V1, best-effort from on-disk shape only):
 *   no-plan       — directory exists but contains no `*.v*.plan.md`
 *   planned       — plan file present, no `output/` artifacts
 *   in-progress   — plan present + at least one output artifact
 *   imported      — plan present + output artifacts + `.imported` marker
 *   unknown       — directory unreadable
 *
 * Returns an empty list (not an error) when `design/asset-plans/` is
 * missing — many V1 games will not have any asset plans yet.
 */

import { readdir, stat } from "node:fs/promises";
import { join, posix, relative, sep } from "node:path";
import {
  type AssetPlanEntry,
  type AssetPlanState,
} from "@mda-studio/shared";

const PLAN_RE = /^(?<asset>[a-z0-9][a-z0-9-]*)\.v(?<ver>\d+)\.plan\.md$/i;

export interface ScanAssetPlansResult {
  rootPath: string;
  entries: AssetPlanEntry[];
}

export async function scanAssetPlans(
  specsRoot: string,
): Promise<ScanAssetPlansResult> {
  const absRoot = join(specsRoot, "design", "asset-plans");
  const rootPath = toPosix(relative(specsRoot, absRoot));

  let topLevel: string[];
  try {
    topLevel = await readdir(absRoot);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return { rootPath, entries: [] };
    }
    throw e;
  }

  const entries: AssetPlanEntry[] = [];
  for (const name of topLevel) {
    if (name.startsWith("_")) continue;
    if (name.startsWith(".")) continue;
    const abs = join(absRoot, name);
    let s;
    try {
      s = await stat(abs);
    } catch {
      continue;
    }
    if (!s.isDirectory()) continue;
    const entry = await scanAssetDir(name, abs);
    entries.push(entry);
  }

  entries.sort((a, b) => a.assetId.localeCompare(b.assetId));
  return { rootPath, entries };
}

async function scanAssetDir(
  assetId: string,
  absDir: string,
): Promise<AssetPlanEntry> {
  let inner: string[];
  try {
    inner = await readdir(absDir);
  } catch {
    return {
      assetId,
      latestPlanVersion: null,
      latestPlanFile: null,
      state: "unknown",
      artifactCount: 0,
      refsCount: 0,
    };
  }

  let latestVersion: number | null = null;
  let latestFile: string | null = null;
  let hasImportMarker = false;

  for (const name of inner) {
    if (name === ".imported") {
      hasImportMarker = true;
      continue;
    }
    const m = PLAN_RE.exec(name);
    if (!m?.groups) continue;
    const ver = Number.parseInt(m.groups["ver"]!, 10);
    if (!Number.isFinite(ver) || ver < 1) continue;
    if (latestVersion === null || ver > latestVersion) {
      latestVersion = ver;
      latestFile = name;
    }
  }

  const refsCount = await countFiles(join(absDir, "refs"));
  const artifactCount = await countFiles(join(absDir, "output"));

  let state: AssetPlanState;
  if (latestVersion === null) state = "no-plan";
  else if (artifactCount === 0) state = "planned";
  else if (hasImportMarker) state = "imported";
  else state = "in-progress";

  return {
    assetId,
    latestPlanVersion: latestVersion,
    latestPlanFile: latestFile
      ? toPosix(`design/asset-plans/${assetId}/${latestFile}`)
      : null,
    state,
    artifactCount,
    refsCount,
  };
}

async function countFiles(abs: string): Promise<number> {
  try {
    const items = await readdir(abs);
    let count = 0;
    for (const name of items) {
      if (name.startsWith(".")) continue;
      try {
        const s = await stat(join(abs, name));
        if (s.isFile()) count += 1;
      } catch {
        // ignore unreadable entries
      }
    }
    return count;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return 0;
    return 0;
  }
}

function toPosix(p: string): string {
  return p.split(sep).join(posix.sep);
}
