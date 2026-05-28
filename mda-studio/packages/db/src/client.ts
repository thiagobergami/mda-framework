/**
 * Concrete database client factory.
 *
 * Returns a Drizzle instance backed by whichever driver
 * `resolveDatabaseConfig` chose. Two real drivers are wired:
 *
 *   - `pglite`: in-process Postgres-on-Wasm. Default when DATABASE_URL is
 *     unset. No native compilation; great for WSL/Windows.
 *   - `pg`: node-postgres against the external endpoint named by
 *     DATABASE_URL.
 *
 * The third configured path — `embedded-postgres` — remains an
 * opt-in escape hatch (`MDA_STUDIO_DB_DRIVER=embedded-postgres`) for
 * power users with a working native build. It's wired here as a
 * descriptive throw so the code path stays visible; the actual
 * subprocess management lives in `embedded-postgres.ts` (not yet
 * created — see plan §5 for D5.DB2 follow-up).
 */

import { existsSync, mkdirSync } from "node:fs";
import type { DatabaseConfig } from "./config.js";

export interface DbClient<TDrizzle = unknown> {
  drizzle: TDrizzle;
  /** Release resources held by the underlying driver. */
  close(): Promise<void>;
}

export async function createClient(
  config: DatabaseConfig,
): Promise<DbClient> {
  if (config.kind === "external") {
    return createPgClient(config.url);
  }
  if (config.driver === "pglite") {
    return createPgliteClient(config.dataDir);
  }
  throw new Error(
    `embedded driver "${config.driver}" is not yet wired — set MDA_STUDIO_DB_DRIVER=pglite or supply DATABASE_URL`,
  );
}

async function createPgClient(url: string): Promise<DbClient> {
  const [{ Pool }, { drizzle }] = await Promise.all([
    import("pg"),
    import("drizzle-orm/node-postgres"),
  ]);
  const pool = new Pool({ connectionString: url });
  return {
    drizzle: drizzle(pool),
    async close() {
      await pool.end();
    },
  };
}

async function createPgliteClient(dataDir: string): Promise<DbClient> {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const [{ PGlite }, { drizzle }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
  ]);
  const pg = new PGlite(dataDir);
  await pg.waitReady;
  return {
    drizzle: drizzle(pg),
    async close() {
      await pg.close();
    },
  };
}
