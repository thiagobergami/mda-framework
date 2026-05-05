import { input, checkbox, select } from "@inquirer/prompts";
import { resolve } from "node:path";
import chalk from "chalk";

import { patchFrontmatter } from "../lib/patchFrontmatter.js";
import { extractIds } from "../lib/extractIds.js";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function runAssetPrompt(
  root: string,
  runMda: (args: string[]) => Promise<number>,
): Promise<void> {
  console.log(chalk.cyan("\n New Asset Spec\n"));

  const mecIds = await extractIds(root, "specs/mechanics");
  if (mecIds.length === 0) {
    console.log(chalk.yellow(" No mechanics exist yet — assets must trace to a mechanic. Add a MEC spec first."));
    return;
  }

  const name = await input({
    message: "Asset name (e.g. 'Firefly Creature'):",
    validate: (v) => v.trim().length > 0 || "Name is required",
  });

  const tracesToMec = await checkbox({
    message: "Which mechanic(s) operate on this asset?",
    choices: mecIds.map(({ id, name: mname }) => ({ name: `${id} — ${mname}`, value: id })),
    validate: (v) => v.length > 0 || "At least one MEC trace is required",
  });

  const status = await select({
    message: "Status:",
    choices: [
      { name: "concept — described, not yet built", value: "concept" },
      { name: "placeholder — gray-box stand-in exists", value: "placeholder" },
      { name: "draft — first pass art/audio in place", value: "draft" },
      { name: "polished — final asset", value: "polished" },
    ],
    default: "concept",
  });

  const code = await runMda(["new", "asset", name]);
  if (code !== 0) {
    console.log(chalk.red(" `mda new asset` failed; aborting."));
    return;
  }

  const slug = slugify(name);
  const file = resolve(root, "specs/assets", `${slug}.asset.md`);

  try {
    await patchFrontmatter(file, {
      traces_to_mechanics: tracesToMec,
      status,
    });
    console.log(chalk.green(`\n Wrote frontmatter to ${file}`));
  } catch (err) {
    console.log(chalk.yellow(`\n Couldn't patch frontmatter: ${err instanceof Error ? err.message : err}`));
  }

  console.log(chalk.gray("\n Next step: define emotional intent, technical reqs, and placeholder protocol."));
}
