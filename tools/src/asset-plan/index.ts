import type { Command } from "commander";
import { resolve } from "node:path";
import chalk from "chalk";

import { generatePlan } from "./generate.js";

const stub = (label: string) => () => {
  console.log(chalk.yellow(`[${label}] not yet implemented (Phase 0 stub).`));
  console.log(chalk.dim("Tracked by design/asset-plans/plan.md."));
};

interface GenerateOpts {
  newVersion?: boolean;
  dir?: string;
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
    .option("--resume", "Resume from the first non-executed milestone")
    .action(stub("asset-plan exec"));

  ap
    .command("list")
    .description("List every asset and its plan status")
    .action(stub("asset-plan list"));
}
