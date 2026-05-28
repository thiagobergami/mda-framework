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
import { registerAssetPlanCommands } from "./asset-plan/index.js";
import { validateAssetPlans } from "./asset-plan/integrity.js";

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

      // Asset-plan integrity (filesystem-aware) only runs against the main "specs"
      // scope — example projects don't share the design/asset-plans/ tree.
      if (scopeName === "specs") {
        const planDiagnostics = await validateAssetPlans(root, graph);
        result.diagnostics.push(...planDiagnostics);
        if (planDiagnostics.some((d) => d.level === "error")) {
          result.passed = false;
        }
      }

      if (opts.json) {
        // One compact JSON object per scope (NDJSON when multi-scope) so the
        // mda-runner in @mda-studio/server can parse line-by-line.
        process.stdout.write(JSON.stringify({ scope: scopeName, ...result }) + "\n");
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
      // Single compact JSON line so the runner can parse it directly.
      process.stdout.write(JSON.stringify(results) + "\n");
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
  .option("--from-json <path>", "Load frontmatter overrides from a JSON file")
  .option("--no-prompt", "Fail loudly on any missing required field instead of prompting")
  .option("--json", "Emit a single JSON line describing the result (suppresses other output)")
  .action(async (
    layer: string,
    nameParts: string[],
    opts: { dir: string; fromJson?: string; prompt?: boolean; json?: boolean },
  ) => {
    const emit = (payload: Record<string, unknown>, ok: boolean): never => {
      if (opts.json) {
        process.stdout.write(JSON.stringify(payload) + "\n");
      } else if (ok) {
        const { id, file } = payload as { id: string; file: string };
        console.log(chalk.green(`Created ${id}`) + ` → ${file}`);
      } else {
        console.error(chalk.red("Failed to scaffold:"), payload.error);
      }
      process.exit(ok ? 0 : 1);
    };

    if (!VALID_LAYERS.includes(layer as any)) {
      return emit(
        { ok: false, error: `Unknown layer: ${layer}. Valid layers: ${VALID_LAYERS.join(", ")}` },
        false,
      );
    }

    let overrides: Record<string, unknown> = {};
    if (opts.fromJson) {
      try {
        const raw = await readFile(resolve(opts.fromJson), "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
          return emit(
            { ok: false, error: `--from-json must point to a JSON object, got ${Array.isArray(parsed) ? "array" : typeof parsed}` },
            false,
          );
        }
        overrides = parsed as Record<string, unknown>;
      } catch (err) {
        return emit(
          { ok: false, error: `--from-json read failed: ${err instanceof Error ? err.message : String(err)}` },
          false,
        );
      }
    }

    const name = nameParts.join(" ").trim();
    if (!name) {
      return emit({ ok: false, error: "name is required" }, false);
    }

    // --no-prompt is currently advisory: `mda new` is already non-interactive
    // for every layer. The flag remains a stable contract for callers that want
    // to assert they cannot answer prompts.
    void opts.prompt;

    const root = resolve(opts.dir);
    try {
      const result = await scaffold(root, layer as any, name, overrides);
      return emit(
        { ok: true, id: result.id, file: result.file, layer: result.layer, name },
        true,
      );
    } catch (err) {
      return emit(
        { ok: false, error: err instanceof Error ? err.message : String(err) },
        false,
      );
    }
  });

registerAssetPlanCommands(program);

program.parse();
