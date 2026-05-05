import { input, checkbox } from "@inquirer/prompts";
import { resolve } from "node:path";
import chalk from "chalk";

import { patchFrontmatter } from "../lib/patchFrontmatter.js";
import { extractIds } from "../lib/extractIds.js";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function runTuningPrompt(
  root: string,
  runMda: (args: string[]) => Promise<number>,
): Promise<void> {
  console.log(chalk.cyan("\n New Tuning Spec\n"));

  const [mecIds, dynIds, aesIds] = await Promise.all([
    extractIds(root, "specs/mechanics"),
    extractIds(root, "specs/dynamics"),
    extractIds(root, "specs/aesthetics"),
  ]);

  if (mecIds.length === 0 || dynIds.length === 0 || aesIds.length === 0) {
    console.log(chalk.yellow(" Tuning specs require at least one MEC, one DYN, and one AES to trace to. Add those first."));
    return;
  }

  const name = await input({
    message: "Tuning spec name (e.g. 'Hint Pacing'):",
    validate: (v) => v.trim().length > 0 || "Name is required",
  });

  const mec = await checkbox({
    message: "Mechanic(s) this tuning targets:",
    choices: mecIds.map(({ id, name: n }) => ({ name: `${id} — ${n}`, value: id })),
    validate: (v) => v.length > 0 || "At least one MEC is required",
  });
  const dyn = await checkbox({
    message: "Dynamic(s) this tuning influences:",
    choices: dynIds.map(({ id, name: n }) => ({ name: `${id} — ${n}`, value: id })),
    validate: (v) => v.length > 0 || "At least one DYN is required",
  });
  const aes = await checkbox({
    message: "Aesthetic(s) this tuning ultimately serves:",
    choices: aesIds.map(({ id, name: n }) => ({ name: `${id} — ${n}`, value: id })),
    validate: (v) => v.length > 0 || "At least one AES is required",
  });

  const code = await runMda(["new", "tuning", name]);
  if (code !== 0) {
    console.log(chalk.red(" `mda new tuning` failed; aborting."));
    return;
  }

  const slug = slugify(name);
  const file = resolve(root, "specs/tuning", `${slug}.tune.md`);

  try {
    await patchFrontmatter(file, {
      traces_to_mechanics: mec,
      traces_to_dynamics: dyn,
      traces_to_aesthetics: aes,
    });
    console.log(chalk.green(`\n Wrote frontmatter to ${file}`));
  } catch (err) {
    console.log(chalk.yellow(`\n Couldn't patch frontmatter: ${err instanceof Error ? err.message : err}`));
  }

  console.log(chalk.gray("\n Next step: list parameters, ranges, and the iteration log."));
}
