#!/usr/bin/env tsx
/**
 * MDA Spec Wizard — guided spec authoring, scoped to one game.
 *
 * Each session targets a single game under games/<game>/. The wizard prompts you to pick
 * a game (or create a new one) up front, then walks Concept → Aesthetics → Dynamics →
 * Mechanics → Assets → Tuning → Levels for that game. Branching menus reflect what already
 * exists in the chosen game's specs/.
 *
 * Flags:
 *   --dry-run   Print what would happen without scaffolding files or patching frontmatter.
 *   --dir PATH  Run against an alternate project root (default: cwd).
 *   --game NAME Skip the "which game?" prompt and operate on this game directly.
 */

import { select, confirm } from "@inquirer/prompts";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import chalk from "chalk";

import { runConceptPrompt } from "./prompts/concept.js";
import { runAestheticPrompt } from "./prompts/aesthetic.js";
import { runDynamicPrompt } from "./prompts/dynamic.js";
import { runMechanicPrompt } from "./prompts/mechanic.js";
import { runAssetPrompt } from "./prompts/asset.js";
import { runTuningPrompt } from "./prompts/tuning.js";
import { runLevelPrompt } from "./prompts/level.js";
import { listExistingSpecs } from "./lib/existingSpecs.js";
import { pickGame } from "./lib/games.js";

interface CliOpts {
  dryRun: boolean;
  root: string;
  game: string | null;
}

function parseArgs(argv: string[]): CliOpts {
  const opts: CliOpts = { dryRun: false, root: process.cwd(), game: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--dry-run") opts.dryRun = true;
    else if (argv[i] === "--dir" && argv[i + 1]) {
      opts.root = resolve(argv[i + 1]);
      i++;
    } else if (argv[i] === "--game" && argv[i + 1]) {
      opts.game = argv[i + 1];
      i++;
    }
  }
  return opts;
}

type MenuChoice =
  | "concept"
  | "aesthetic"
  | "dynamic"
  | "mechanic"
  | "asset"
  | "tuning"
  | "level"
  | "validate"
  | "switch_game"
  | "exit";

async function topMenu(root: string, game: string): Promise<MenuChoice> {
  const existing = await listExistingSpecs(root, game);

  const choices: { name: string; value: MenuChoice; description?: string }[] = [];

  if (existing.concepts.length === 0) {
    choices.push({
      name: "Start a new game concept",
      value: "concept",
      description: "Required first step — every game starts here",
    });
  } else {
    choices.push({
      name: `Add another concept (${existing.concepts.length} exists)`,
      value: "concept",
    });

    if (existing.aesthetics.length < 3) {
      choices.push({
        name: `Add an aesthetic (${existing.aesthetics.length}/3+ recommended)`,
        value: "aesthetic",
      });
    } else {
      choices.push({
        name: `Add another aesthetic (${existing.aesthetics.length} exists)`,
        value: "aesthetic",
      });
    }

    if (existing.aesthetics.length > 0) {
      choices.push({
        name: `Add a dynamic (${existing.dynamics.length} exists)`,
        value: "dynamic",
        description: "Feedback systems, invariants — must trace to an aesthetic",
      });
    }

    if (existing.dynamics.length > 0) {
      choices.push({
        name: `Add a mechanic (${existing.mechanics.length} exists)`,
        value: "mechanic",
        description: "Player actions and rules — must trace to a dynamic",
      });
    }

    if (existing.mechanics.length > 0) {
      choices.push({
        name: `Add an asset (${existing.assets.length} exists)`,
        value: "asset",
      });
      choices.push({
        name: `Add a tuning spec (${existing.tuning.length} exists)`,
        value: "tuning",
      });
      choices.push({
        name: `Design a level (${existing.levels.length} exists)`,
        value: "level",
        description: "Compose mechanics + dynamics + aesthetics into a spatial layout",
      });
    }
  }

  choices.push({ name: `Validate this game (game:${game})`, value: "validate" });
  choices.push({ name: "Switch to a different game", value: "switch_game" });
  choices.push({ name: "Exit", value: "exit" });

  return await select<MenuChoice>({
    message: `What do you want to do? (game: ${game})`,
    choices,
  });
}

function makeRunMda(opts: CliOpts): (args: string[]) => Promise<number> {
  return (args: string[]) => {
    if (opts.dryRun) {
      console.log(chalk.magenta(` [dry-run] would run: npx mda ${args.join(" ")}`));
      return Promise.resolve(0);
    }
    return new Promise((resolveProc) => {
      const proc = spawn("npx", ["mda", ...args], {
        cwd: opts.root,
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      proc.on("close", (code) => resolveProc(code ?? 0));
    });
  };
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);
  const runMda = makeRunMda(opts);

  console.log(chalk.cyan.bold("\n MDA Spec Wizard\n"));
  if (opts.dryRun) {
    console.log(chalk.magenta(" [dry-run] — no files will be created or modified\n"));
  }
  console.log(chalk.gray(" Walks you through MDA spec authoring. Ctrl+C to exit at any time.\n"));

  let game: string | null = opts.game ?? (await pickGame(opts.root, opts.dryRun));
  if (!game) {
    console.log(chalk.yellow(" No game selected; exiting."));
    return;
  }

  let continueLoop = true;
  while (continueLoop) {
    const choice = await topMenu(opts.root, game);

    switch (choice) {
      case "concept":   await runConceptPrompt(opts.root, game, runMda); break;
      case "aesthetic": await runAestheticPrompt(opts.root, game, runMda); break;
      case "dynamic":   await runDynamicPrompt(opts.root, game, runMda); break;
      case "mechanic":  await runMechanicPrompt(opts.root, game, runMda); break;
      case "asset":     await runAssetPrompt(opts.root, game, runMda); break;
      case "tuning":    await runTuningPrompt(opts.root, game, runMda); break;
      case "level":     await runLevelPrompt(opts.root, game, runMda); break;
      case "validate":  await runMda(["validate", "--scope", `game:${game}`]); break;
      case "switch_game": {
        const next = await pickGame(opts.root, opts.dryRun);
        if (next) game = next;
        break;
      }
      case "exit":      continueLoop = false; break;
    }

    if (continueLoop) {
      const again = await confirm({ message: "Do something else?", default: true });
      if (!again) continueLoop = false;
    }
  }

  console.log(chalk.gray("\n Done.\n"));
}

main().catch((err) => {
  if (err && typeof err === "object" && "name" in err && err.name === "ExitPromptError") {
    console.log(chalk.gray("\n Cancelled.\n"));
    process.exit(0);
  }
  console.error(chalk.red("Wizard failed:"), err);
  process.exit(1);
});
