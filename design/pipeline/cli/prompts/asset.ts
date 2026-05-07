import { input, checkbox, confirm, select } from "@inquirer/prompts";
import { readFile } from "node:fs/promises";
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

  // Phase 8: optional hand-off to the asset-plan pipeline
  const wantsPlan = await confirm({
    message: "Generate an implementation plan for this asset now?",
    default: false,
  });
  if (!wantsPlan) {
    console.log(
      chalk.dim(
        " You can generate one later with `mda asset-plan generate <asset-id>` once your reference inputs are in design/asset-plans/<id>/refs/.",
      ),
    );
    return;
  }

  const assetId = await readAssetId(file);
  if (!assetId) {
    console.log(chalk.yellow(" Couldn't read the new asset's ID — skipping plan generation."));
    return;
  }

  console.log(
    chalk.dim(
      `\n Drop reference inputs into design/asset-plans/${assetId}/refs/ before continuing.`,
    ),
  );
  const refsReady = await confirm({
    message: "References are in place. Proceed with `mda asset-plan generate`?",
    default: true,
  });
  if (!refsReady) {
    console.log(chalk.dim(` Run \`mda asset-plan generate ${assetId}\` when ready.`));
    return;
  }

  const planCode = await runMda(["asset-plan", "generate", assetId]);
  if (planCode !== 0) {
    console.log(
      chalk.yellow(
        ` Plan generation exited with code ${planCode}. Re-run \`mda asset-plan generate ${assetId}\` after fixing the cause.`,
      ),
    );
  }
}

/** Read the AST-NNN id from the freshly scaffolded asset spec frontmatter. */
async function readAssetId(file: string): Promise<string | null> {
  try {
    const content = await readFile(file, "utf-8");
    const m = content.match(/^id:\s*(AST-\d+)\s*$/m);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
