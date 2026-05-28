/**
 * Games-store interface + factory (D5.DB1b).
 *
 * `services/games-registry.ts` is the *facade* the rest of the server
 * imports. It delegates to whichever implementation the factory hands back
 * (memory or db).
 */

import { currentPersistenceMode } from "./persistence.js";
import { createMemoryGamesStore } from "./games-store-memory.js";
import { createDbGamesStore } from "./games-store-db.js";

export interface GameRow {
  gameId: string;
  name: string;
  specsRoot: string;
  conceptPath: string;
  primaryAesthetic: string;
  conceptTitle: string;
}

export interface GamesStore {
  /** Insert or replace a row keyed by gameId. */
  register(row: GameRow): Promise<void>;
  unregister(gameId: string): Promise<void>;
  get(gameId: string): Promise<GameRow | undefined>;
  list(): Promise<GameRow[]>;
  /** Drop every row. Test-only. */
  clear(): Promise<void>;
}

let singleton: GamesStore | null = null;

export async function getGamesStore(): Promise<GamesStore> {
  if (singleton) return singleton;
  singleton =
    currentPersistenceMode() === "db"
      ? await createDbGamesStore()
      : createMemoryGamesStore();
  return singleton;
}

/** Test-only: drop the cached singleton so the next call rebuilds it. */
export function _resetGamesStoreForTests(): void {
  singleton = null;
}
