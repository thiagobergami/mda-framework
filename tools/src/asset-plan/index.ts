import type { Command } from "commander";
import { resolve } from "node:path";
import chalk from "chalk";

import { generatePlan } from "./generate.js";
import { executePlan } from "./execute.js";
import { runEngineImport } from "./engine-import.js";

const stub = (label: string) => () => {
  console.log(chalk.yellow(`[${label}] not yet implemented (Phase 0 stub).`));
  console.log(chalk.dim("Tracked by design/asset-plans/plan.md."));
};

interface GenerateOpts {
  newVersion?: boolean;
  dir?: string;
}

interface ExecOpts {
  resume?: boolean;
  dir?: string;
}

async function execAction(assetId: string, opts: ExecOpts): Promise<void> {
  const root = resolve(opts.dir ?? ".");
  try {
    const result = await executePlan(root, assetId, { resume: opts.resume });
    if (result.finalStatus === "executed") {
      console.log(
        chalk.dim(
          `\nNext: run \`mda asset-plan import ${assetId}\` to land the artifact in the engine.`,
        ),
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red("Failed to execute plan:"));
    console.error(message);
    process.exit(1);
  }
}

interface ImportOpts {
  dir?: string;
}

async function importAction(assetId: string, opts: ImportOpts): Promise<void> {
  const root = resolve(opts.dir ?? ".");
  try {
    await runEngineImport(root, assetId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red("Failed to import asset:"));
    console.error(message);
    process.exit(1);
  }
}

async function generateAction(assetId: string, opts: GenerateOpts): Promise<void> {
  const root = resolve(opts.dir ?? ".");
  try {
    const result = await generatePlan(root, assetId, { newVersion: opts.newVersion });
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red("Failed to generate plan:"));
    console.error(message);
    process.exit(1);
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
    .action(generateAction);

  ap
    .command("exec <asset-id>")
    .description("Execute the latest plan for the given asset, milestone by milestone")
    .option("-d, --dir <path>", "Project root directory", ".")
    .option("--resume", "Resume from the first non-executed milestone")
    .action(execAction);

  ap
    .command("import <asset-id>")
    .description("Run the engine-import step for an asset whose plan is in 'executed' status")
    .option("-d, --dir <path>", "Project root directory", ".")
    .action(importAction);

  ap
    .command("list")
    .description("List every asset and its plan status")
    .action(stub("asset-plan list"));
}
