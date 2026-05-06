import { input, select } from "@inquirer/prompts";
import { resolve } from "node:path";
import chalk from "chalk";

import { patchFrontmatter } from "../lib/patchFrontmatter.js";

const AESTHETIC_CATEGORIES = [
  { name: "Sensation — game as sense-pleasure", value: "Sensation" },
  { name: "Fantasy — game as make-believe", value: "Fantasy" },
  { name: "Narrative — game as drama", value: "Narrative" },
  { name: "Challenge — game as obstacle course", value: "Challenge" },
  { name: "Fellowship — game as social framework", value: "Fellowship" },
  { name: "Discovery — game as uncharted territory", value: "Discovery" },
  { name: "Expression — game as self-discovery", value: "Expression" },
  { name: "Submission — game as pastime", value: "Submission" },
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function runAestheticPrompt(
  root: string,
  game: string,
  runMda: (args: string[]) => Promise<number>,
): Promise<void> {
  console.log(chalk.cyan(`\n New Aesthetic Spec (game: ${game})\n`));

  const name = await input({
    message: "Aesthetic name (e.g. 'Forest Discovery'):",
    validate: (v) => v.trim().length > 0 || "Name is required",
  });

  const primary = await select({
    message: "Primary aesthetic category:",
    choices: AESTHETIC_CATEGORIES,
  });

  const audience = await input({
    message: "Target audience (e.g., 'children 6-10, casual'):",
    default: "",
  });

  console.log(chalk.gray("\n Scaffolding aesthetic file..."));

  const code = await runMda(["new", "aesthetic", name, "--game", game]);
  if (code !== 0) {
    console.log(chalk.red(" `mda new aesthetic` failed; aborting wizard step."));
    return;
  }

  const slug = slugify(name);
  const file = resolve(root, "games", game, "specs/aesthetics", `${slug}.aes.md`);

  const patch: Record<string, string | string[]> = {
    primary_aesthetic: primary,
  };
  if (audience.trim()) patch.target_audience = audience.trim();

  try {
    await patchFrontmatter(file, patch);
    console.log(chalk.green(`\n Wrote frontmatter to ${file}`));
  } catch (err) {
    console.log(chalk.yellow(`\n Couldn't patch frontmatter: ${err instanceof Error ? err.message : err}`));
  }

  console.log(chalk.gray("\n Next step: open the file, fill experience goal + observable proxies, then add a dynamic."));
}
