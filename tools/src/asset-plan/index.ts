import type { Command } from "commander";
import { resolve } from "node:path";
import chalk from "chalk";

import { generatePlan } from "./generate.js";
import { executePlan } from "./execute.js";
import { runEngineImport } from "./engine-import.js";
import { listAssetPlans, formatRows } from "./list.js";
import { makeEmitter } from "./json-events.js";

interface GenerateOpts {
  newVersion?: boolean;
  dir?: string;
  json?: boolean;
}

interface ExecOpts {
  resume?: boolean;
  dir?: string;
  json?: boolean;
}

function emitErr(json: boolean, command: string, err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  if (json) {
    process.stdout.write(JSON.stringify({ event: "error", command, message, ts: new Date().toISOString() }) + "\n");
  } else {
    console.error(chalk.red(`Failed to ${command}:`));
    console.error(message);
  }
  process.exit(1);
}

async function execAction(assetId: string, opts: ExecOpts): Promise<void> {
  const root = resolve(opts.dir ?? ".");
  const events = makeEmitter(opts.json === true);
  try {
    const result = await executePlan(root, assetId, { resume: opts.resume, events });
    if (!opts.json && result.finalStatus === "executed") {
      console.log(
        chalk.dim(
          `\nNext: run \`mda asset-plan import ${assetId}\` to land the artifact in the engine.`,
        ),
      );
    }
  } catch (err) {
    emitErr(opts.json === true, "execute plan", err);
  }
}

interface ImportOpts {
  dir?: string;
  json?: boolean;
}

interface ListOpts {
  dir?: string;
  json?: boolean;
}

async function listAction(opts: ListOpts): Promise<void> {
  const root = resolve(opts.dir ?? ".");
  try {
    const rows = await listAssetPlans(root);
    if (opts.json) {
      process.stdout.write(JSON.stringify(rows) + "\n");
    } else {
      console.log(formatRows(rows));
    }
  } catch (err) {
    emitErr(opts.json === true, "list asset plans", err);
  }
}

async function importAction(assetId: string, opts: ImportOpts): Promise<void> {
  const root = resolve(opts.dir ?? ".");
  const events = makeEmitter(opts.json === true);
  try {
    await runEngineImport(root, assetId, { events });
  } catch (err) {
    emitErr(opts.json === true, "import asset", err);
  }
}

async function generateAction(assetId: string, opts: GenerateOpts): Promise<void> {
  const root = resolve(opts.dir ?? ".");
  const events = makeEmitter(opts.json === true);
  try {
    const result = await generatePlan(root, assetId, { newVersion: opts.newVersion, events });
    if (!opts.json) {
      console.log(
        chalk.green(`Generated plan v${result.version}`) + ` → ${chalk.cyan(result.path)}`,
      );
      if (result.intake.optional.length > 0 && result.intake.files.length === 0) {
        console.log(
          chalk.dim(
            `Hint: ${result.intake.optional.length} optional input(s) declared. ` +
              `Drop them into ${result.intake.refsDir} for a richer plan.`,
          ),
        );
      }
    }
  } catch (err) {
    emitErr(opts.json === true, "generate plan", err);
  }
}

/** Register `mda asset-plan` and its subcommands on the root program. */
export function registerAssetPlanCommands(program: Command): void {
  const ap = program
    .command("asset-plan")
    .description("Asset implementation pipeline (generate, execute, and import asset plans)");

  ap
    .command("generate <asset-id>")
    .description("Generate a new plan for the given asset")
    .option("-d, --dir <path>", "Project root directory", ".")
    .option("--new-version", "Fork a new version from the latest approved plan")
    .option("--json", "Emit NDJSON milestone events (suppresses other output)")
    .action(generateAction);

  ap
    .command("exec <asset-id>")
    .description("Execute the latest plan for the given asset, milestone by milestone")
    .option("-d, --dir <path>", "Project root directory", ".")
    .option("--resume", "Resume from the first non-executed milestone")
    .option("--json", "Emit NDJSON milestone events (auto-skips milestones that require prompts)")
    .action(execAction);

  ap
    .command("import <asset-id>")
    .description("Run the engine-import step for an asset whose plan is in 'executed' status")
    .option("-d, --dir <path>", "Project root directory", ".")
    .option("--json", "Emit NDJSON events instead of chalk output")
    .action(importAction);

  ap
    .command("list")
    .description("List every asset and its plan status")
    .option("-d, --dir <path>", "Project root directory", ".")
    .option("--json", "Emit a JSON array of asset rows instead of the formatted table")
    .action(listAction);
}
