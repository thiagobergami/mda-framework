/**
 * Discovers existing games under games/<slug>/ and prompts the user to pick one
 * (or create a new one). Used as the wizard's first prompt — every game-specific
 * action is scoped to one game, so we resolve that up front and pass it through.
 */

import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { input, select } from "@inquirer/prompts";
import { spawn } from "node:child_process";
import chalk from "chalk";

export async function listGames(root: string): Promise<string[]> {
  try {
    const entries = await readdir(resolve(root, "games"), { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

function runMdaCapture(root: string, args: string[]): Promise<number> {
  return new Promise((resolveProc) => {
    const proc = spawn("npx", ["mda", ...args], {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    proc.on("close", (code) => resolveProc(code ?? 0));
  });
}

/**
 * Resolve which game the wizard should operate on. If only one game exists, returns it
 * directly. Otherwise prompts. Offers a "Create new game" option that runs `mda init game`.
 */
export async function pickGame(root: string, dryRun: boolean): Promise<string | null> {
  const games = await listGames(root);

  if (games.length === 0) {
    console.log(chalk.yellow("\n No games yet — let's bootstrap one.\n"));
    return await createGame(root, dryRun);
  }

  const choice = await select<string>({
    message: "Which game?",
    choices: [
      ...games.map((g) => ({ name: g, value: g })),
      { name: chalk.cyan("+ Create a new game"), value: "__new__" },
    ],
  });

  if (choice === "__new__") {
    return await createGame(root, dryRun);
  }
  return choice;
}

async function createGame(root: string, dryRun: boolean): Promise<string | null> {
  const name = await input({
    message: "New game name:",
    validate: (v) => v.trim().length > 0 || "Name is required",
  });

  if (dryRun) {
    console.log(chalk.magenta(` [dry-run] would run: npx mda init game "${name}"`));
    // Best-effort slug for downstream prompts to display
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  const code = await runMdaCapture(root, ["init", "game", name]);
  if (code !== 0) {
    console.log(chalk.red(" Failed to create game; aborting wizard step."));
    return null;
  }

  // Slug matches the scaffolder's slugify
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
