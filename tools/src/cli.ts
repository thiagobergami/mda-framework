#!/usr/bin/env node

import { Command } from "commander";
import { resolve } from "node:path";
import { parseAll } from "./parser.js";
import { buildGraph } from "./graph.js";
import { allRules, runRules } from "./rules/index.js";
import { reportText, reportJson } from "./reporter.js";
import { runGate, type GateLayer } from "./gates/index.js";
import type { SpecContent } from "./types.js";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import chalk from "chalk";
import { scaffold, VALID_LAYERS, GAME_SPECIFIC_LAYERS, initGame } from "./scaffold.js";
import type { ScaffoldResult } from "./scaffold.js";

const VALID_GATES: GateLayer[] = ["concept", "aesthetic", "dynamic", "mechanic", "implementation"];

const program = new Command();

program
  .name("mda")
  .description("MDA spec-driven game development CLI")
  .version("0.1.0");

program
  .command("validate")
  .description("Validate spec integrity across all scopes")
  .option("-d, --dir <path>", "Project root directory", ".")
  .option("--json", "Output as JSON instead of formatted text")
  .option("--scope <name>", "Validate only a specific scope (e.g., 'specs', 'example:baby-chase')")
  .action(async (opts: { dir: string; json?: boolean; scope?: string }) => {
    const root = resolve(opts.dir);
    const allScopes = await parseAll(root);

    let exitCode = 0;

    const scopeEntries = opts.scope
      ? [[opts.scope, allScopes.get(opts.scope) ?? []] as const]
      : [...allScopes.entries()];

    for (const [scopeName, specs] of scopeEntries) {
      const graph = buildGraph(specs);
      const result = runRules(graph, allRules);

      if (opts.json) {
        console.log(JSON.stringify({ scope: scopeName, ...result }, null, 2));
      } else {
        if (scopeEntries.length > 1) {
          console.log(`\nScope: ${scopeName}`);
        }
        console.log(reportText(result));
      }

      if (!result.passed) {
        exitCode = 1;
      }
    }

    process.exit(exitCode);
  });

program
  .command("gate <layer>")
  .description("Run a quality gate (concept, aesthetic, dynamic, mechanic, implementation)")
  .option("-d, --dir <path>", "Project root directory", ".")
  .option("--override <reason>", "Override gate failure with a logged reason")
  .option("--strict", "Treat gate failures as errors (exit code 1)")
  .option("--json", "Output as JSON")
  .action(async (layer: string, opts: { dir: string; override?: string; strict?: boolean; json?: boolean }) => {
    if (!VALID_GATES.includes(layer as GateLayer)) {
      console.error(`Unknown gate: ${layer}. Valid gates: ${VALID_GATES.join(", ")}`);
      process.exit(1);
    }

    const gate = layer as GateLayer;
    const root = resolve(opts.dir);
    const allScopes = await parseAll(root);
    const specs = allScopes.get("specs") ?? [];
    const graph = buildGraph(specs as SpecContent[]);

    const results = runGate(gate, specs, graph, {
      override: opts.override != null,
      overrideReason: opts.override,
    });

    // Save gate status
    const statusPath = resolve(root, "specs", ".gate-status.json");
    let status: Record<string, unknown> = {};
    try {
      const existing = await readFile(statusPath, "utf-8");
      status = JSON.parse(existing);
    } catch {
      // File doesn't exist yet
    }
    for (const result of results) {
      status[result.gate] = {
        passed: result.passed,
        overridden: result.overridden,
        overrideReason: result.overrideReason,
        timestamp: new Date().toISOString(),
        checks: result.checks.map((c) => ({ name: c.name, passed: c.passed })),
      };
    }
    await mkdir(resolve(root, "specs"), { recursive: true });
    await writeFile(statusPath, JSON.stringify(status, null, 2) + "\n");

    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      for (const result of results) {
        const icon = result.passed ? chalk.green("PASS") : result.overridden ? chalk.yellow("OVERRIDE") : chalk.red("FAIL");
        console.log(`\n${icon} Gate: ${chalk.bold(result.gate)}`);
        if (result.overridden) {
          console.log(chalk.yellow(`  Overridden: ${result.overrideReason}`));
        }
        for (const check of result.checks) {
          const ci = check.passed ? chalk.green("  ✓") : chalk.red("  ✗");
          console.log(`${ci} ${check.name}: ${check.message}`);
        }
      }
      console.log("");
    }

    const anyFailed = results.some((r) => !r.passed);
    if (anyFailed && opts.strict) {
      process.exit(1);
    }
  });

program
  .command("new <layer> <name...>")
  .description("Scaffold a new spec (concept, aesthetic, dynamic, mechanic, tuning, asset, binding, level)")
  .option("-d, --dir <path>", "Project root directory", ".")
  .option("-g, --game <name>", "Target game under games/<name>/ (required for game-specific layers)")
  .option("--framework", "Allow scaffolding into the framework root instead of a game (rare; for framework-tool specs only)")
  .action(async (layer: string, nameParts: string[], opts: { dir: string; game?: string; framework?: boolean }) => {
    if (!VALID_LAYERS.includes(layer as any)) {
      console.error(`Unknown layer: ${layer}. Valid layers: ${VALID_LAYERS.join(", ")}`);
      process.exit(1);
    }

    const name = nameParts.join(" ");
    const root = resolve(opts.dir);

    const requiresGame = GAME_SPECIFIC_LAYERS.has(layer as any);
    if (requiresGame && !opts.game && !opts.framework) {
      console.error(chalk.red(
        `'${layer}' is a game-specific layer. Pass --game <name> to target a game ` +
        `(e.g., --game my-game), or --framework to override (only for framework-tool specs).`
      ));
      console.error(chalk.gray(`  Bootstrap a new game first: npx mda init game "<name>"`));
      process.exit(1);
    }

    try {
      const result = await scaffold(root, layer as any, name, {
        game: opts.framework ? null : (opts.game ?? null),
      });
      console.log(chalk.green(`Created ${result.id}`) + ` → ${result.file}`);
    } catch (err) {
      console.error(chalk.red("Failed to scaffold:"), err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("init <kind> <name...>")
  .description("Bootstrap a project structure. Currently supports: 'game' — creates games/<slug>/ with empty spec dirs.")
  .option("-d, --dir <path>", "Project root directory", ".")
  .action(async (kind: string, nameParts: string[], opts: { dir: string }) => {
    if (kind !== "game") {
      console.error(chalk.red(`Unknown init kind: '${kind}'. Currently supported: 'game'.`));
      process.exit(1);
    }
    const name = nameParts.join(" ");
    if (!name.trim()) {
      console.error(chalk.red("Game name is required"));
      process.exit(1);
    }
    const root = resolve(opts.dir);
    try {
      const result = await initGame(root, name);
      if (result.created) {
        console.log(chalk.green(`Created game directory`) + ` → ${result.dir}`);
        console.log(chalk.gray(`  Next: npx mda new concept "${name}" --game ${result.game}`));
      } else {
        console.log(chalk.yellow(`Game already exists`) + ` → ${result.dir}`);
        console.log(chalk.gray(`  (Missing subdirs were created; existing files left untouched.)`));
      }
    } catch (err) {
      console.error(chalk.red("Failed to init game:"), err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
