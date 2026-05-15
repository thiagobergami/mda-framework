/**
 * In-memory registry mapping game ids to workspace roots.
 *
 * Phase U2 keeps this in-process so the server has *something* to serve
 * without depending on a persisted `games` table yet. The configuration
 * comes from env vars resolved at startup (see `app.ts`).
 *
 * Real game registration moves into the `games` Drizzle table in a later
 * phase. The shape here (`gameId → specsRoot`) is forward-compatible.
 */

export interface GameRegistration {
  gameId: string;
  name: string;
  specsRoot: string;
  conceptPath: string;
  primaryAesthetic: string;
  conceptTitle: string;
}

const games = new Map<string, GameRegistration>();

export function registerGame(reg: GameRegistration): void {
  games.set(reg.gameId, reg);
}

export function unregisterGame(gameId: string): void {
  games.delete(gameId);
}

export function getGame(gameId: string): GameRegistration | undefined {
  return games.get(gameId);
}

export function listGames(): GameRegistration[] {
  return Array.from(games.values());
}

/** Test-only convenience to reset the registry between specs. */
export function clearGames(): void {
  games.clear();
}
