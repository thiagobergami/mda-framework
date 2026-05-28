import { sql } from "drizzle-orm";
import { getDb } from "./db-handle.js";
import type { GameRow, GamesStore } from "./games-store.js";

interface Drizzle {
  execute: (q: unknown) => Promise<{ rows?: Record<string, unknown>[] } | unknown[]>;
}

function rowToGame(r: Record<string, unknown>): GameRow {
  return {
    gameId: String(r["game_id"]),
    name: String(r["name"]),
    specsRoot: String(r["workspace_root"]),
    conceptPath: String(r["concept_path"]),
    primaryAesthetic: String(r["primary_aesthetic"]),
    conceptTitle: String(r["concept_title"]),
  };
}

async function rowsOf(
  d: Drizzle,
  q: unknown,
): Promise<Record<string, unknown>[]> {
  const result = await d.execute(q);
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  return (result as { rows?: Record<string, unknown>[] }).rows ?? [];
}

/**
 * Drizzle-backed games store.
 *
 * Uses the `sql` template helper so parameters are bound safely across
 * pglite (default), node-postgres, and any future driver that speaks the
 * same dialect.
 */
export async function createDbGamesStore(): Promise<GamesStore> {
  const { drizzle } = await getDb();
  const d = drizzle as Drizzle;

  return {
    async register(row) {
      await d.execute(sql`DELETE FROM games WHERE game_id = ${row.gameId}`);
      await d.execute(sql`
        INSERT INTO games
          (game_id, workspace_root, concept_path, name, concept_title, primary_aesthetic)
        VALUES
          (${row.gameId}, ${row.specsRoot}, ${row.conceptPath}, ${row.name}, ${row.conceptTitle}, ${row.primaryAesthetic})
      `);
    },
    async unregister(gameId) {
      await d.execute(sql`DELETE FROM games WHERE game_id = ${gameId}`);
    },
    async get(gameId) {
      const rows = await rowsOf(
        d,
        sql`SELECT * FROM games WHERE game_id = ${gameId}`,
      );
      const first = rows[0];
      return first ? rowToGame(first) : undefined;
    },
    async list() {
      const rows = await rowsOf(d, sql`SELECT * FROM games ORDER BY created_at`);
      return rows.map(rowToGame);
    },
    async clear() {
      await d.execute(sql`DELETE FROM games`);
    },
  };
}
