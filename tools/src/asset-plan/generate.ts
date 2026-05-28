import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";

import { resolveTool } from "./routing.js";
import {
  findAssetSpec,
  findConceptSpec,
  findAesSpecs,
  nextVersion,
  aesIdsFromAsset,
  assetTypeOf,
  toolOverrideOf,
} from "./discover.js";
import { checkIntake, type IntakeReport } from "./intake.js";
import { aggregateStyle } from "./style.js";
import { composePlan } from "./compose.js";
import { ASSET_PLAN_ROOT } from "./profile.js";
import { type EventEmitter, makeEmitter } from "./json-events.js";

export interface GenerateOptions {
  /** Reserved for future use (forking from approved); ignored in v1. */
  newVersion?: boolean;
  /** Engine target — defaults to "roblox". */
  engine?: string;
  /** Stream NDJSON milestone events to stdout. */
  events?: EventEmitter;
}

export interface GenerateResult {
  path: string;
  version: number;
  intake: IntakeReport;
}

/**
 * Generate a new plan version for an asset.
 *
 * Pipeline (per spec FR-11):
 *   route → discover → intake → style → compose → write
 *
 * Throws with a human-readable message if any step can't proceed (asset not
 * found, missing inputs, no tool routed, etc).
 */
export async function generatePlan(
  root: string,
  assetId: string,
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const events = options.events ?? makeEmitter(false);
  events.emit("generate-start", { assetId });

  const assetSpec = await findAssetSpec(root, assetId);
  const assetType = assetTypeOf(assetSpec);
  const override = toolOverrideOf(assetSpec);

  const profile = await resolveTool(root, assetType, override);
  const intake = await checkIntake(root, assetId, profile, assetType);

  if (!intake.ok) {
    const missingList = intake.missing
      .map((m) => `  - ${m.kind} (required) — ${m.description}`)
      .join("\n");
    events.emit("intake-missing", { assetId, missing: intake.missing });
    throw new Error(
      `Cannot generate plan for ${assetId}: missing required inputs.\n` +
        `Drop them into ${intake.refsDir} and re-run.\n\nMissing:\n${missingList}`,
    );
  }

  const conceptSpec = await findConceptSpec(root);
  const aesIds = aesIdsFromAsset(assetSpec);
  const aesSpecs = await findAesSpecs(root, aesIds);

  const styleSources = aggregateStyle(assetSpec, conceptSpec, aesSpecs);
  const version = await nextVersion(root, assetId);

  const markdown = composePlan({
    assetSpec,
    profile,
    assetType,
    intake,
    styleSources,
    conceptSpec,
    aesSpecs,
    version,
    engine: options.engine ?? "roblox",
  });

  const planPath = resolve(
    root,
    ASSET_PLAN_ROOT,
    assetId,
    `${assetId}.v${version}.plan.md`,
  );
  await mkdir(dirname(planPath), { recursive: true });
  await writeFile(planPath, markdown, "utf-8");

  events.emit("plan-saved", { assetId, path: planPath, version });
  return { path: planPath, version, intake };
}
