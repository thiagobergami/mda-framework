/**
 * Lazy shared DB handle (D5.DB1b).
 *
 * Every `*-store-db.ts` calls `getDb()` to obtain the same Drizzle
 * instance. The handle is opened on first use and reused thereafter; the
 * embedded driver (pglite) doesn't tolerate two parallel instances against
 * the same data directory.
 *
 * Schema migrations are owned by `pnpm --filter @mda-studio/db db:migrate`.
 * Stores call DDL on first use to keep tests self-contained without
 * depending on the migration command being run first.
 */

import { homedir } from "node:os";
import { createClient, resolveDatabaseConfig } from "@mda-studio/db";

let pending: Promise<{ drizzle: unknown; close(): Promise<void> }> | null = null;

export async function getDb(): Promise<{
  drizzle: unknown;
  close(): Promise<void>;
}> {
  if (!pending) {
    const config = resolveDatabaseConfig({ env: process.env, home: homedir() });
    pending = createClient(config).then(async (client) => {
      await ensureTables(client.drizzle);
      return client;
    });
  }
  return pending;
}

/** Test-only: drop the cached handle. The next `getDb()` opens fresh. */
export async function _resetDbHandleForTests(): Promise<void> {
  if (pending) {
    try {
      const handle = await pending;
      await handle.close();
    } catch {
      /* swallow — closing a half-initialised handle is best-effort */
    }
  }
  pending = null;
}

/**
 * Minimal idempotent DDL so tests can run against pglite without invoking
 * the drizzle-kit migration command first. The shape matches the schema
 * files in `@mda-studio/db/schema/`.
 */
async function ensureTables(drizzle: unknown): Promise<void> {
  const d = drizzle as { execute: (sql: string) => Promise<unknown> };
  await d.execute(`
    CREATE TABLE IF NOT EXISTS games (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      game_id text UNIQUE NOT NULL,
      workspace_root text NOT NULL,
      concept_path text NOT NULL,
      name text NOT NULL,
      concept_title text NOT NULL,
      primary_aesthetic text NOT NULL,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    )
  `);
  await d.execute(`
    CREATE TABLE IF NOT EXISTS issues (
      id text PRIMARY KEY,
      game_id text NOT NULL,
      spec_id text NOT NULL,
      title text NOT NULL,
      status text NOT NULL,
      priority text NOT NULL,
      assignee_agent_id text,
      assignee_agent_handle text,
      created_at text NOT NULL,
      updated_at text NOT NULL
    )
  `);
  await d.execute(`
    CREATE TABLE IF NOT EXISTS cost_events (
      id text PRIMARY KEY,
      studio_id text NOT NULL,
      game_id text NOT NULL,
      agent_id text,
      issue_id text,
      provider text NOT NULL,
      model text NOT NULL,
      input_tokens integer NOT NULL,
      output_tokens integer NOT NULL,
      cost_cents integer NOT NULL,
      occurred_at text NOT NULL,
      billing_code text,
      created_at text NOT NULL
    )
  `);
  await d.execute(`
    CREATE TABLE IF NOT EXISTS approvals (
      id text PRIMARY KEY,
      studio_id text NOT NULL,
      game_id text,
      spec_id text,
      kind text NOT NULL,
      title text NOT NULL,
      body text NOT NULL,
      requested_by_handle text NOT NULL,
      status text NOT NULL,
      created_at text NOT NULL,
      updated_at text NOT NULL,
      resolution_approver_handle text,
      resolution_resolved_at text,
      resolution_comment text
    )
  `);
}
