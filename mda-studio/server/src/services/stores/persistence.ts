/**
 * Persistence configuration shared by every store factory (D5.DB1b).
 *
 *   memory — pure in-process state. Fast tests; nothing survives a restart.
 *   db     — Drizzle-backed pglite by default. Survives restarts; matches
 *            the V1-lite cut from plan.html week 5.
 *
 * The mode is read once at module load via `currentPersistenceMode()`.
 * Tests that want to drive a specific mode set `MDA_STUDIO_PERSISTENCE`
 * before importing the factory.
 */

export type PersistenceMode = "memory" | "db";

const DEFAULT_MODE: PersistenceMode = "memory";

export function currentPersistenceMode(
  env: NodeJS.ProcessEnv = process.env,
): PersistenceMode {
  const raw = env["MDA_STUDIO_PERSISTENCE"];
  if (raw === "memory" || raw === "db") return raw;
  if (raw !== undefined && raw !== "") {
    throw new Error(
      `MDA_STUDIO_PERSISTENCE must be "memory" or "db", got "${raw}"`,
    );
  }
  return DEFAULT_MODE;
}
