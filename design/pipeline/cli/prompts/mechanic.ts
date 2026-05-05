import { input, checkbox } from "@inquirer/prompts";
import { resolve } from "node:path";
import chalk from "chalk";

import { patchFrontmatter } from "../lib/patchFrontmatter.js";
import { extractIds } from "../lib/extractIds.js";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function runMechanicPrompt(
  root: string,
  runMda: (args: string[]) => Promise<number>,
): Promise<void> {
  console.log(chalk.cyan("\n New Mechanic Spec\n"));

  const dynIds = await extractIds(root, "specs/dynamics");
  if (dynIds.length === 0) {
    console.log(chalk.yellow(" No dynamics exist yet — mechanics must trace to a dynamic. Add a DYN spec first."));
    return;
  }

  const name = await input({
    message: "Mechanic name (e.g. 'Lantern Interaction'):",
    validate: (v) => v.trim().length > 0 || "Name is required",
  });

  const tracesTo = await checkbox({
    message: "Which dynamic(s) does this mechanic produce? (space to select)",
    choices: dynIds.map(({ id, name: dname }) => ({
      name: `${id} — ${dname}`,
      value: id,
    })),
    validate: (v) => v.length > 0 || "Pick at least one — mechanics cannot exist in isolation",
  });

  const code = await runMda(["new", "mechanic", name]);
  if (code !== 0) {
    console.log(chalk.red(" `mda new mechanic` failed; aborting."));
    return;
  }

  const slug = slugify(name);
  const file = resolve(root, "specs/mechanics", `${slug}.mec.md`);

  try {
    await patchFrontmatter(file, { traces_to_dynamics: tracesTo });
    console.log(chalk.green(`\n Wrote frontmatter to ${file}`));
  } catch (err) {
    console.log(chalk.yellow(`\n Couldn't patch frontmatter: ${err instanceof Error ? err.message : err}`));
  }

  console.log(chalk.gray("\n Next step: write rules, behavioral contract, and acceptance criteria."));
}
