import type { GameRow, GamesStore } from "./games-store.js";

export function createMemoryGamesStore(): GamesStore {
  const rows = new Map<string, GameRow>();
  return {
    async register(row) {
      rows.set(row.gameId, { ...row });
    },
    async unregister(gameId) {
      rows.delete(gameId);
    },
    async get(gameId) {
      const row = rows.get(gameId);
      return row ? { ...row } : undefined;
    },
    async list() {
      return Array.from(rows.values(), (r) => ({ ...r }));
    },
    async clear() {
      rows.clear();
    },
  };
}
