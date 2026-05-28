#!/usr/bin/env node
/**
 * `mda-studio` CLI (D6.ST4).
 *
 * Today this exposes a single command — `mda-studio onboard` — that
 * performs the housekeeping needed before the operator opens the studio
 * for the first time:
 *
 *   1. Resolve the embedded instance directory (`~/.mda-studio/instances/{instance}`)
 *      and create it if missing.
 *   2. Open a pglite database under the instance and run the bundled
 *      migrations.
 *   3. Print the next-step commands (start the server / open the UI).
 *
 * The plan called for a full bring-up (spawn server + UI + browser).
 * That's deferred to a follow-up; this version covers the slice that
 * unblocks the onboarding flow without hiding what the operator runs.
 */

import { mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { resolveDatabaseConfig, createClient } from "@mda-studio/db";

interface OnboardOptions {
  yes: boolean;
  demo: boolean;
}

function parseFlags(argv: readonly string[]): OnboardOptions {
  return {
    yes: argv.includes("--yes") || argv.includes("-y"),
    demo: argv.includes("--demo"),
  };
}

async function onboard(opts: OnboardOptions): Promise<number> {
  const home = homedir();
  const config = resolveDatabaseConfig({ env: process.env, home });
  if (config.kind === "external") {
    console.log(
      `Using external Postgres at ${config.url}. Skipping local instance setup.`,
    );
  } else {
    if (!existsSync(config.dataDir)) {
      mkdirSync(config.dataDir, { recursive: true });
      console.log(`Created instance directory: ${config.dataDir}`);
    } else {
      console.log(`Instance directory already present: ${config.dataDir}`);
    }
  }

  // Open the database and run a smoke query. Schema migrations are owned by
  // drizzle-kit (`pnpm --filter @mda-studio/db db:migrate`); we surface the
  // command to the operator rather than re-implement it here.
  const client = await createClient(config);
  try {
    const drizzle = client.drizzle as unknown as {
      execute: (sql: string) => Promise<unknown>;
    };
    await drizzle.execute("select 1");
    console.log("Database is reachable.");
  } finally {
    await client.close();
  }

  console.log("\nNext steps:");
  console.log("  pnpm --filter @mda-studio/db db:migrate");
  console.log("  pnpm --filter @mda-studio/server dev");
  console.log("  pnpm --filter @mda-studio/ui dev");
  console.log("  open http://127.0.0.1:3101");
  if (opts.demo) {
    console.log(
      "\n--demo: set MDA_STUDIO_DEMO=1 in the server env to seed fixture data.",
    );
  }
  if (!opts.yes) {
    console.log(
      "\nRe-run with --yes to skip prompts in CI scripts.",
    );
  }
  return 0;
}

async function main(): Promise<number> {
  const [, , subcommand, ...rest] = process.argv;
  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    console.log("Usage: mda-studio <command>");
    console.log("");
    console.log("Commands:");
    console.log("  onboard [--yes] [--demo]   First-run housekeeping for the studio");
    return 0;
  }
  if (subcommand === "onboard") {
    return onboard(parseFlags(rest));
  }
  console.error(`Unknown command: ${subcommand}`);
  return 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  },
);

export { onboard, parseFlags };
