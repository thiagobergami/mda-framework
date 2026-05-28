/**
 * Games registry — public facade for the rest of the server.
 *
 * D5.DB1b: this module is now a thin wrapper around `GamesStore` (memory
 * or DB, chosen by `MDA_STUDIO_PERSISTENCE`). The free-function API is
 * preserved so route files don't change, but the underlying implementation
 * is swappable.
 *
 * Game registration also starts a `spec-watcher` (D3.EN3) so the UI
 * reflects on-disk edits. The watcher lives outside the store; the store
 * is pure persistence.
 */

import { startSpecWatcher, type SpecWatcherHandle } from "./spec-watcher.js";
import { getGamesStore } from "./stores/games-store.js";

export interface GameRegistration {
  gameId: string;
  name: string;
  specsRoot: string;
  conceptPath: string;
  primaryAesthetic: string;
  conceptTitle: string;
}

const watchers = new Map<string, SpecWatcherHandle>();

// Synchronous shadow cache. Most callers (routes, the SSE bus, the spec
// tree assembler) consume registrations synchronously and would be painful
// to refactor to await. The shadow stays consistent because every mutation
// updates it inline alongside the async store write.
const shadow = new Map<string, GameRegistration>();

export function registerGame(reg: GameRegistration): void {
  shadow.set(reg.gameId, reg);
  void getGamesStore().then((s) => s.register(reg));
  stopWatcherFor(reg.gameId);
  try {
    watchers.set(reg.gameId, startSpecWatcher(reg.gameId, reg.specsRoot));
  } catch {
    /* watcher failed; manual refresh still works */
  }
}

export function unregisterGame(gameId: string): void {
  shadow.delete(gameId);
  void getGamesStore().then((s) => s.unregister(gameId));
  stopWatcherFor(gameId);
}

export function getGame(gameId: string): GameRegistration | undefined {
  return shadow.get(gameId);
}

export function listGames(): GameRegistration[] {
  return Array.from(shadow.values());
}

export function clearGames(): void {
  for (const gameId of shadow.keys()) stopWatcherFor(gameId);
  shadow.clear();
  void getGamesStore().then((s) => s.clear());
}

/**
 * Reload the shadow cache from the persistent store. Tests with
 * `MDA_STUDIO_PERSISTENCE=db` call this after restart simulations to
 * verify rows survived.
 */
export async function rehydrateGamesFromStore(): Promise<void> {
  const store = await getGamesStore();
  shadow.clear();
  for (const row of await store.list()) {
    shadow.set(row.gameId, { ...row });
  }
}

function stopWatcherFor(gameId: string): void {
  const handle = watchers.get(gameId);
  if (!handle) return;
  watchers.delete(gameId);
  handle.close().catch(() => {});
}
