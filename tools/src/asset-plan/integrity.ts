import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

import type { Diagnostic, SpecGraph } from "../types.js";
import { ASSET_PLAN_ROOT, loadToolProfile, loadEngineProfile } from "./profile.js";
import { readPlan, findLatestPlan } from "./plan-parser.js";

/**
 * Validate every asset plan on disk against its asset spec, tool/engine
 * profiles, and the milestone-status invariants.
 *
 * Runs as a top-level check (filesystem-aware) rather than a sync graph
 * rule, but its diagnostics merge into the same list `mda validate`
 * surfaces. This is the asset-plan-integrity rule referenced by spec FR-26.
 */
export async function validateAssetPlans(
  root: string,
  graph: SpecGraph,
): Promise<Diagnostic[]> {
  const diagnostics: Diagnostic[] = [];

  const plansDir = resolve(root, ASSET_PLAN_ROOT);
  let entries: string[];
  try {
    entries = await readdir(plansDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return diagnostics;
    throw err;
  }

  // Subdirectories that look like asset plan dirs (start with `AST-`)
  const planDirs = entries.filter((name) => /^AST-\d+$/.test(name));

  for (const dirName of planDirs) {
    const assetId = dirName;

    // Check 4: orphan — plan dir exists but the asset spec doesn't
    const assetSpec = graph.specs.get(assetId);
    if (!assetSpec) {
      diagnostics.push({
        level: "error",
        rule: "asset-plan-integrity",
        specId: assetId,
        file: `${ASSET_PLAN_ROOT}/${dirName}/`,
        message: `orphan plan directory — no asset spec ${assetId} in specs/assets/`,
      });
      continue;
    }
    if (assetSpec.layer !== "AST") {
      diagnostics.push({
        level: "error",
        rule: "asset-plan-integrity",
        specId: assetId,
        file: `${ASSET_PLAN_ROOT}/${dirName}/`,
        message: `${assetId} resolves to a ${assetSpec.layer} spec, but the plan dir expects an AST.`,
      });
      continue;
    }

    // Find the latest plan for this asset
    const latest = await findLatestPlan(root, assetId);
    if (!latest) {
      // dir exists with no .plan.md — could be just refs/output created early; not an error
      continue;
    }

    let plan;
    try {
      plan = await readPlan(latest.path);
    } catch (err) {
      diagnostics.push({
        level: "error",
        rule: "asset-plan-integrity",
        specId: assetId,
        file: relativize(latest.path, root),
        message: `plan unreadable: ${(err as Error).message}`,
      });
      continue;
    }

    // Check that asset-id field matches the directory
    if (plan.file.assetId !== assetId) {
      diagnostics.push({
        level: "error",
        rule: "asset-plan-integrity",
        specId: assetId,
        file: relativize(latest.path, root),
        message: `plan asset-id "${plan.file.assetId}" does not match directory "${assetId}".`,
      });
    }

    // Check 2: tool resolves to a real profile
    try {
      await loadToolProfile(root, plan.file.tool);
    } catch (err) {
      diagnostics.push({
        level: "error",
        rule: "asset-plan-integrity",
        specId: assetId,
        file: relativize(latest.path, root),
        message: `plan tool "${plan.file.tool}" cannot be loaded: ${(err as Error).message}`,
      });
    }

    // Check 3: engine resolves to a real profile
    try {
      await loadEngineProfile(root, plan.file.engine);
    } catch (err) {
      diagnostics.push({
        level: "error",
        rule: "asset-plan-integrity",
        specId: assetId,
        file: relativize(latest.path, root),
        message: `plan engine "${plan.file.engine}" cannot be loaded: ${(err as Error).message}`,
      });
    }

    // Check status invariants:
    //   - imported plan must have every milestone in {executed, skipped-mcp}
    //   - executed plan must have every milestone in {executed, skipped-mcp}
    //   - draft/approved plan must not have all milestones executed (otherwise should be executed)
    const allExecutedish = plan.file.milestones.every(
      (m) => m.status === "executed" || m.status === "skipped-mcp",
    );
    const anyPending = plan.file.milestones.some((m) => m.status === "pending" || m.status === "rejected");

    if (plan.file.status === "imported" && !allExecutedish) {
      diagnostics.push({
        level: "error",
        rule: "asset-plan-integrity",
        specId: assetId,
        file: relativize(latest.path, root),
        message: `plan status is "imported" but some milestones are still pending or rejected.`,
      });
    }
    if (plan.file.status === "executed" && anyPending) {
      diagnostics.push({
        level: "error",
        rule: "asset-plan-integrity",
        specId: assetId,
        file: relativize(latest.path, root),
        message: `plan status is "executed" but some milestones are pending or rejected.`,
      });
    }
    if ((plan.file.status === "draft" || plan.file.status === "approved") && allExecutedish && plan.file.milestones.length > 0) {
      diagnostics.push({
        level: "warning",
        rule: "asset-plan-integrity",
        specId: assetId,
        file: relativize(latest.path, root),
        message: `every milestone is done but plan status is still "${plan.file.status}". Re-run \`mda asset-plan exec ${assetId}\` to update.`,
      });
    }
  }

  return diagnostics;
}

function relativize(absPath: string, root: string): string {
  const rootAbs = resolve(root);
  return absPath.startsWith(rootAbs) ? absPath.slice(rootAbs.length + 1) : absPath;
}
