import { readdir, stat } from "node:fs/promises";
import { resolve, basename, extname, join } from "node:path";
import chalk from "chalk";

import type { EngineProfile, SpecContent } from "../types.js";
import { findAssetSpec, assetTypeOf } from "./discover.js";
import { findLatestPlan, readPlan, writePlan, appendIterationLog } from "./plan-parser.js";
import type { ParsedPlan } from "./plan-parser.js";
import { loadEngineProfile, ASSET_PLAN_ROOT } from "./profile.js";
import { McpClient, type McpServerHandle } from "./mcp-client.js";
import { transitionPlan } from "./state.js";

export interface ImportResult {
  /** Where the artifact was placed in the engine, or "(manual mode)" */
  target: string;
  /** Path to the artifact that was imported */
  artifact: string;
  /** Tags applied (or that would be applied in manual mode) */
  tags: string[];
  /** Attributes applied */
  attributes: Record<string, AttributeValue>;
  /** Whether the MCP server actually ran the import */
  ranViaMcp: boolean;
  /** Final plan status after the dispatcher completes */
  finalStatus: string;
}

export type AttributeValue = string | number | boolean;

/**
 * Run the engine-import step for an asset whose plan has finished executing.
 * Idempotent: bails out cleanly if the plan is already `imported`.
 */
export async function runEngineImport(
  root: string,
  assetId: string,
): Promise<ImportResult> {
  const latest = await findLatestPlan(root, assetId);
  if (!latest) {
    throw new Error(`No plan found for ${assetId}.`);
  }

  const plan = await readPlan(latest.path);

  if (plan.file.status === "imported") {
    console.log(chalk.dim(`Plan ${plan.file.id} already imported. Nothing to do.`));
    return {
      target: "(already imported)",
      artifact: "",
      tags: [],
      attributes: {},
      ranViaMcp: false,
      finalStatus: plan.file.status,
    };
  }

  if (plan.file.status !== "executed") {
    throw new Error(
      `Plan ${plan.file.id} is in status "${plan.file.status}". Engine import ` +
        `only runs after every milestone executes (status: executed).`,
    );
  }

  const engine = await loadEngineProfile(root, plan.file.engine);
  const assetSpec = await findAssetSpec(root, assetId);
  const assetType = assetTypeOf(assetSpec);

  const artifactPath = await locateArtifact(root, assetId);
  const ext = extname(artifactPath).toLowerCase();
  if (!engine.importFormats.includes(ext)) {
    throw new Error(
      `Artifact ${basename(artifactPath)} has extension "${ext}", which is not in ` +
        `engine "${engine.name}" import-formats: [${engine.importFormats.join(", ")}].`,
    );
  }

  const target = resolveTargetPath(assetSpec, engine, assetType);
  const tags = extractTags(assetSpec);
  const attributes = extractAttributes(assetSpec);

  const mcp = new McpClient(root);
  await mcp.load();
  const mcpAvailable = engine.mcpRequired !== "none" && mcp.isConfigured(engine.mcpRequired);

  let ranViaMcp = false;
  let server: McpServerHandle | null = null;

  try {
    if (mcpAvailable) {
      try {
        server = await mcp.connect(engine.mcpRequired);
        await dispatchImport(server, artifactPath, target, assetSpec.name, tags, attributes);
        ranViaMcp = true;
        console.log(chalk.green(`Imported ${basename(artifactPath)} to ${target}.`));
      } catch (err) {
        console.log(
          chalk.yellow(
            `Engine MCP "${engine.mcpRequired}" failed: ${(err as Error).message}.\n` +
              `Falling back to manual mode.`,
          ),
        );
        printManualInstructions(artifactPath, target, tags, attributes);
      }
    } else {
      console.log(
        chalk.yellow(
          `Engine MCP "${engine.mcpRequired}" not configured. Showing manual instructions:`,
        ),
      );
      printManualInstructions(artifactPath, target, tags, attributes);
    }

    if (ranViaMcp) {
      plan.file.status = transitionPlan(plan.file.status, "imported");
      const today = new Date().toISOString().slice(0, 16).replace("T", " ");
      appendIterationLog(plan, {
        when: today,
        milestone: "(import)",
        verdict: "imported",
        notes: target,
      });
      await writePlan(plan);
      printAssetStatusSuggestion(assetSpec);
    }
  } finally {
    await mcp.closeAll();
  }

  return {
    target,
    artifact: artifactPath,
    tags,
    attributes,
    ranViaMcp,
    finalStatus: plan.file.status,
  };
}

// ---------------------------------------------------------------------------
// Artifact discovery
// ---------------------------------------------------------------------------

async function locateArtifact(root: string, assetId: string): Promise<string> {
  const outputDir = resolve(root, ASSET_PLAN_ROOT, assetId, "output");
  let entries: string[];
  try {
    entries = await readdir(outputDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `No output/ directory at ${outputDir}. The plan declared expected ` +
          `artifacts but nothing was produced — run the executor first or place ` +
          `the artifact manually.`,
      );
    }
    throw err;
  }

  if (entries.length === 0) {
    throw new Error(`Output directory ${outputDir} is empty. Nothing to import.`);
  }

  // Pick the most recently modified file
  const stamped = await Promise.all(
    entries.map(async (name) => {
      const p = join(outputDir, name);
      const s = await stat(p);
      return { path: p, mtime: s.mtimeMs, isFile: s.isFile() };
    }),
  );
  const files = stamped.filter((s) => s.isFile);
  if (files.length === 0) {
    throw new Error(`No regular files in ${outputDir}.`);
  }
  files.sort((a, b) => b.mtime - a.mtime);
  return files[0].path;
}

// ---------------------------------------------------------------------------
// Spec → target / tags / attributes
// ---------------------------------------------------------------------------

export function resolveTargetPath(
  asset: SpecContent,
  engine: EngineProfile,
  assetType: string,
): string {
  // 1. Frontmatter target-path
  const fmTarget = asset.frontmatter["target-path"];
  if (typeof fmTarget === "string" && fmTarget.length > 0) return fmTarget;

  // 2. Body's Engine Integration → Container
  const integration = asset.sections.get("engine integration") ?? "";
  const containerMatch = integration.match(/-\s*\*\*Container\*\*:\s*(.+?)\s*$/m);
  if (containerMatch) {
    const value = containerMatch[1].trim();
    // Strip surrounding backticks / braces / explanatory text after a comma
    const cleaned = value.replace(/`/g, "").split(/[,(]/)[0].trim();
    if (cleaned && !/^\{.*\}$/.test(cleaned)) return cleaned;
  }

  // 3. Default
  const defaultTarget =
    typeof engine.importSteps === "string" ? extractDefaultTarget(engine) : "ReplicatedStorage/Assets";
  return `${defaultTarget}/${capitalize(assetType)}`;
}

function extractDefaultTarget(engine: EngineProfile): string {
  const fm = (engine as unknown as { defaultTarget?: string }).defaultTarget;
  if (typeof fm === "string" && fm.length > 0) return fm;
  return "ReplicatedStorage/Assets";
}

export function extractTags(asset: SpecContent): string[] {
  const integration = asset.sections.get("engine integration") ?? "";
  const m = integration.match(/-\s*\*\*Tags(?:\s*\/\s*markers)?\*\*:\s*(.+?)\s*$/m);
  if (!m) return [];
  return m[1]
    .split(/[\n,]/)
    .map((s) => s.replace(/`/g, "").replace(/^[-*]\s*/, "").trim())
    .filter((s) => s.length > 0 && !/^\{.*\}$/.test(s));
}

export function extractAttributes(asset: SpecContent): Record<string, AttributeValue> {
  const integration = asset.sections.get("engine integration") ?? "";
  const m = integration.match(/-\s*\*\*Attributes(?:\s*\/\s*properties)?\*\*:\s*([\s\S]+?)(?=\n\s*-\s*\*\*|\n##|$)/);
  if (!m) return {};
  const out: Record<string, AttributeValue> = {};
  for (const raw of m[1].split("\n")) {
    const line = raw.trim().replace(/^[-*]\s*/, "").trim();
    if (!line || /^\{.*\}$/.test(line)) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const name = line.slice(0, eq).replace(/`/g, "").trim();
    const value = line.slice(eq + 1).replace(/`/g, "").trim();
    if (!name) continue;
    out[name] = coerceAttributeValue(value);
  }
  return out;
}

function coerceAttributeValue(raw: string): AttributeValue {
  if (raw === "true") return true;
  if (raw === "false") return false;
  const num = Number(raw);
  if (!Number.isNaN(num) && raw.length > 0) return num;
  return raw.replace(/^["']|["']$/g, "");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// MCP dispatch + manual fallback
// ---------------------------------------------------------------------------

async function dispatchImport(
  server: McpServerHandle,
  artifact: string,
  target: string,
  name: string,
  tags: string[],
  attributes: Record<string, AttributeValue>,
): Promise<void> {
  const importResult = await server.callTool("studio.importAsset", {
    path: artifact,
    target,
    name,
  });
  if (!importResult.ok) {
    throw new Error(`studio.importAsset failed: ${importResult.error}`);
  }

  for (const tag of tags) {
    const r = await server.callTool("studio.addTag", { target, tag });
    if (!r.ok) console.log(chalk.yellow(`  warn: addTag(${tag}) failed: ${r.error}`));
  }
  for (const [name, value] of Object.entries(attributes)) {
    const r = await server.callTool("studio.setAttribute", { target, name, value });
    if (!r.ok)
      console.log(chalk.yellow(`  warn: setAttribute(${name}) failed: ${r.error}`));
  }

  const save = await server.callTool("studio.savePlace", {});
  if (!save.ok) console.log(chalk.yellow(`  warn: savePlace failed: ${save.error}`));
}

function printManualInstructions(
  artifact: string,
  target: string,
  tags: string[],
  attributes: Record<string, AttributeValue>,
): void {
  console.log(chalk.bold("\nManual import steps:"));
  console.log(`  1. Import ${chalk.cyan(artifact)}`);
  console.log(`  2. Place the imported instance at ${chalk.cyan(target)}`);
  if (tags.length > 0) {
    console.log(`  3. Apply tags: ${tags.map((t) => chalk.cyan(t)).join(", ")}`);
  }
  if (Object.keys(attributes).length > 0) {
    console.log("  4. Set attributes:");
    for (const [name, value] of Object.entries(attributes)) {
      console.log(`     - ${chalk.cyan(name)} = ${chalk.cyan(String(value))}`);
    }
  }
  console.log(
    chalk.dim(
      `\n  After completing manually, re-run \`mda asset-plan import ${basename(target)}\` ` +
        `with the MCP available to flip the plan to imported.`,
    ),
  );
}

function printAssetStatusSuggestion(asset: SpecContent): void {
  const current = asset.frontmatter["status"];
  const next: Record<string, string> = {
    concept: "placeholder",
    placeholder: "draft",
    draft: "final",
  };
  const suggestion = typeof current === "string" ? next[current] : null;
  if (!suggestion) return;
  console.log(
    chalk.dim(
      `\nSuggestion: advance ${asset.id} status from "${current}" to "${suggestion}" ` +
        `now that the artifact is in the engine. (Edit ${asset.file} manually.)`,
    ),
  );
}
