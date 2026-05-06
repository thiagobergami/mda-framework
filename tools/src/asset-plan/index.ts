import type { Command } from "commander";
import chalk from "chalk";

const stub = (label: string) => () => {
  console.log(chalk.yellow(`[${label}] not yet implemented (Phase 0 stub).`));
  console.log(chalk.dim("Tracked by design/asset-plans/plan.md."));
};

/** Register `mda asset-plan` and its subcommands on the root program. */
export function registerAssetPlanCommands(program: Command): void {
  const ap = program
    .command("asset-plan")
    .description("Asset implementation pipeline (generate, execute, and import asset plans)");

  ap
    .command("generate <asset-id>")
    .description("Generate a new plan for the given asset")
    .option("--new-version", "Fork a new version from the latest approved plan")
    .action(stub("asset-plan generate"));

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
