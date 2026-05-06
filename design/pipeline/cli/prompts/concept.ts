import { input, checkbox, select } from "@inquirer/prompts";
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

export async function runConceptPrompt(
  root: string,
  game: string,
  runMda: (args: string[]) => Promise<number>,
): Promise<void> {
  console.log(chalk.cyan(`\n New Game Concept (game: ${game})\n`));

  const name = await input({
    message: "Concept name (often the same as the game):",
    validate: (v) => v.trim().length > 0 || "Name is required",
  });

  const vision = await input({
    message: "One-sentence pitch:",
    validate: (v) => v.trim().length > 0 || "Pitch is required",
  });

  const platform = await select({
    message: "Target platform:",
    choices: [
      { name: "Roblox (Luau)", value: "roblox" },
      { name: "Unity (C#)", value: "unity" },
      { name: "Unreal (C++/Blueprint)", value: "unreal" },
      { name: "Multiple / undecided", value: "multi" },
    ],
  });

  const primary = await select({
    message: "Primary aesthetic (the dominant experience goal):",
    choices: AESTHETIC_CATEGORIES,
  });

  const remaining = AESTHETIC_CATEGORIES.filter((c) => c.value !== primary);

  const secondary = await checkbox({
    message: "Secondary aesthetics (optional, supporting the primary):",
    choices: remaining,
    validate: (selections) =>
      selections.length <= 3 || "Pick at most 3 secondary aesthetics — focus matters",
  });

  console.log(chalk.gray("\n Scaffolding concept file..."));

  const code = await runMda(["new", "concept", name, "--game", game]);
  if (code !== 0) {
    console.log(chalk.red(" `mda new concept` failed; aborting wizard step."));
    return;
  }

  const slug = slugify(name);
  const file = resolve(root, "games", game, "specs/concept", `${slug}.concept.md`);

  try {
    await patchFrontmatter(file, {
      platform,
      primary_aesthetic: primary,
      secondary_aesthetics: secondary,
      pitch: vision,
    });
    console.log(chalk.green(`\n Wrote frontmatter to ${file}`));
  } catch (err) {
    console.log(chalk.yellow(`\n Couldn't patch frontmatter: ${err instanceof Error ? err.message : err}`));
  }

  console.log(chalk.gray("\n Next step: open the file and fill in the body sections, then add aesthetics."));
}
