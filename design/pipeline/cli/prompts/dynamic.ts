import { input, checkbox } from "@inquirer/prompts";
import { resolve } from "node:path";
import chalk from "chalk";

import { patchFrontmatter } from "../lib/patchFrontmatter.js";
import { listExistingSpecs } from "../lib/existingSpecs.js";
import { extractIds } from "../lib/extractIds.js";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function runDynamicPrompt(
  root: string,
  runMda: (args: string[]) => Promise<number>,
): Promise<void> {
  console.log(chalk.cyan("\n New Dynamic Spec\n"));

  const existing = await listExistingSpecs(root);
  if (existing.aesthetics.length === 0) {
    console.log(chalk.yellow(" No aesthetics exist yet — add at least one before authoring a dynamic."));
    return;
  }

  const aestheticIds = await extractIds(root, "specs/aesthetics");
  if (aestheticIds.length === 0) {
    console.log(chalk.yellow(" No AES IDs found in specs/aesthetics — check frontmatter."));
    return;
  }

  const name = await input({
    message: "Dynamic name (e.g. 'Hint Escalation Loop'):",
    validate: (v) => v.trim().length > 0 || "Name is required",
  });

  const tracesTo = await checkbox({
    message: "Which aesthetics does this dynamic serve? (space to select)",
    choices: aestheticIds.map(({ id, name: aname }) => ({
      name: `${id} — ${aname}`,
      value: id,
    })),
    validate: (v) => v.length > 0 || "Pick at least one — dynamics must trace to an aesthetic",
  });

  const code = await runMda(["new", "dynamic", name]);
  if (code !== 0) {
    console.log(chalk.red(" `mda new dynamic` failed; aborting."));
    return;
  }

  const slug = slugify(name);
  const file = resolve(root, "specs/dynamics", `${slug}.dyn.md`);

  try {
    await patchFrontmatter(file, { traces_to_aesthetics: tracesTo });
    console.log(chalk.green(`\n Wrote frontmatter to ${file}`));
  } catch (err) {
    console.log(chalk.yellow(`\n Couldn't patch frontmatter: ${err instanceof Error ? err.message : err}`));
  }

  console.log(chalk.gray("\n Next step: define feedback loops, invariants, and degenerate dynamics in the file body."));
}
