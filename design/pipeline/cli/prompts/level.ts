import { input, checkbox, select } from "@inquirer/prompts";
import { resolve } from "node:path";
import chalk from "chalk";

import { patchFrontmatter } from "../lib/patchFrontmatter.js";
import { extractIds } from "../lib/extractIds.js";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function runLevelPrompt(
  root: string,
  game: string,
  runMda: (args: string[]) => Promise<number>,
): Promise<void> {
  console.log(chalk.cyan(`\n New Level Spec (game: ${game})\n`));

  const [mecIds, dynIds, aesIds, astIds] = await Promise.all([
    extractIds(root, game, "specs/mechanics"),
    extractIds(root, game, "specs/dynamics"),
    extractIds(root, game, "specs/aesthetics"),
    extractIds(root, game, "specs/assets"),
  ]);

  if (mecIds.length === 0 || dynIds.length === 0 || aesIds.length === 0) {
    console.log(chalk.yellow(" Levels require at least one MEC, one DYN, and one AES. Add those first."));
    return;
  }

  const name = await input({
    message: "Level name (e.g. 'Tutorial Forest'):",
    validate: (v) => v.trim().length > 0 || "Name is required",
  });

  const status = await select({
    message: "Status:",
    choices: [
      { name: "blockout — geometry placeholders only", value: "blockout" },
      { name: "playable — full geometry, encounters wired", value: "playable" },
      { name: "polished — art/audio/tuning passes done", value: "polished" },
    ],
    default: "blockout",
  });

  const aes = await checkbox({
    message: "Aesthetics this level targets (one or more):",
    choices: aesIds.map(({ id, name: n }) => ({ name: `${id} — ${n}`, value: id })),
    validate: (v) => v.length > 0 || "At least one aesthetic is required",
  });
  const dyn = await checkbox({
    message: "Dynamics active in this level:",
    choices: dynIds.map(({ id, name: n }) => ({ name: `${id} — ${n}`, value: id })),
    validate: (v) => v.length > 0 || "At least one dynamic is required",
  });
  const mec = await checkbox({
    message: "Mechanics surfaced in this level:",
    choices: mecIds.map(({ id, name: n }) => ({ name: `${id} — ${n}`, value: id })),
    validate: (v) => v.length > 0 || "At least one mechanic is required",
  });
  const ast = astIds.length > 0
    ? await checkbox({
        message: "Assets used (optional, space to select):",
        choices: astIds.map(({ id, name: n }) => ({ name: `${id} — ${n}`, value: id })),
      })
    : [];

  const duration = await input({
    message: "Estimated duration on critical path (seconds):",
    default: "120",
    validate: (v) => /^\d+$/.test(v) || "Whole seconds only",
  });

  const code = await runMda(["new", "level", name, "--game", game]);
  if (code !== 0) {
    console.log(chalk.red(" `mda new level` failed; aborting."));
    return;
  }

  const slug = slugify(name);
  const file = resolve(root, "games", game, "design/levels", `${slug}.level.md`);

  try {
    await patchFrontmatter(file, {
      status,
      estimated_duration: duration,
    });
    const { readFile, writeFile } = await import("node:fs/promises");
    let content = await readFile(file, "utf-8");
    const refsBlock = `references:\n  aesthetics: [${aes.join(", ")}]\n  dynamics:   [${dyn.join(", ")}]\n  mechanics:  [${mec.join(", ")}]\n  assets:     [${ast.join(", ")}]`;
    content = content.replace(
      /references:\n\s*aesthetics: \[\][\s\S]*?assets:\s*\[\]/,
      refsBlock,
    );
    await writeFile(file, content);

    console.log(chalk.green(`\n Wrote frontmatter and references to ${file}`));
  } catch (err) {
    console.log(chalk.yellow(`\n Couldn't patch frontmatter: ${err instanceof Error ? err.message : err}`));
  }

  console.log(chalk.gray("\n Next step: fill blockout, beat chart, encounters, and affordances in the file body."));
}
