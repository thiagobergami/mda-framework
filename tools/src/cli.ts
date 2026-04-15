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
import { scaffold, VALID_LAYERS } from "./scaffold.js";
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
  .description("Scaffold a new spec (concept, aesthetic, dynamic, mechanic, tuning, asset, binding)")
  .option("-d, --dir <path>", "Project root directory", ".")
  .action(async (layer: string, nameParts: string[], opts: { dir: string }) => {
    if (!VALID_LAYERS.includes(layer as any)) {
      console.error(`Unknown layer: ${layer}. Valid layers: ${VALID_LAYERS.join(", ")}`);
      process.exit(1);
    }

    const name = nameParts.join(" ");
    const root = resolve(opts.dir);

    try {
      const result = await scaffold(root, layer as any, name);
      console.log(chalk.green(`Created ${result.id}`) + ` → ${result.file}`);
    } catch (err) {
      console.error(chalk.red("Failed to scaffold:"), err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
