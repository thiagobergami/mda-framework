import { DEFAULT_HOST_LOOPBACK, DEFAULT_STUDIO_ID, DEFAULT_PORT } from "@mda-studio/shared";
import { createApp } from "./app.js";
import { createLogger } from "./logger.js";
import { seedFixtureIssues } from "./services/fixture-seed.js";
import {
  registerGame,
  rehydrateGamesFromStore,
} from "./services/games-registry.js";
import { rehydrateIssuesFromStore } from "./services/issues-store.js";
import { rehydrateCostEventsFromStore } from "./services/cost-events-store.js";
import { rehydrateApprovalsFromStore } from "./services/approvals-store.js";

const log = createLogger();
const app = createApp();

const port = Number(process.env["PORT"] ?? DEFAULT_PORT);
const host = process.env["HOST"] ?? DEFAULT_HOST_LOOPBACK;

/**
 * Rehydrate every shadow Map from the persistence store (D5.DB1b). When
 * MDA_STUDIO_PERSISTENCE=memory this is a no-op; when =db it loads every
 * row that survived the last restart.
 *
 * Order matters: games first, then anything keyed to a game.
 */
async function rehydrateAll(): Promise<void> {
  await rehydrateGamesFromStore();
  await rehydrateIssuesFromStore();
  await rehydrateCostEventsFromStore();
  await rehydrateApprovalsFromStore([DEFAULT_STUDIO_ID]);
}
void rehydrateAll().catch((err) => {
  log.error("rehydrate failed", { error: err instanceof Error ? err.message : String(err) });
});

/**
 * Boot-time game registration via env vars (Phase U2). When the persistent
 * `games` table arrives this disappears in favor of a DB read.
 *
 *   MDA_STUDIO_GAME_ID                 (e.g. "virus-hunter")
 *   MDA_STUDIO_GAME_NAME               human label
 *   MDA_STUDIO_GAME_SPECS_ROOT         absolute path containing specs/
 *   MDA_STUDIO_GAME_CONCEPT_PATH       e.g. "specs/concept/x.concept.md"
 *   MDA_STUDIO_GAME_PRIMARY_AESTHETIC  free text, surfaced in UI chrome
 *   MDA_STUDIO_GAME_CONCEPT_TITLE      free text
 */
const envGameId = process.env["MDA_STUDIO_GAME_ID"];
const envSpecsRoot = process.env["MDA_STUDIO_GAME_SPECS_ROOT"];
if (envGameId && envSpecsRoot) {
  registerGame({
    gameId: envGameId,
    name: process.env["MDA_STUDIO_GAME_NAME"] ?? envGameId,
    specsRoot: envSpecsRoot,
    conceptPath:
      process.env["MDA_STUDIO_GAME_CONCEPT_PATH"] ??
      "specs/concept/unknown.concept.md",
    primaryAesthetic:
      process.env["MDA_STUDIO_GAME_PRIMARY_AESTHETIC"] ?? "Fellowship",
    conceptTitle: process.env["MDA_STUDIO_GAME_CONCEPT_TITLE"] ?? envGameId,
  });
  log.info("registered game from env", { gameId: envGameId, specsRoot: envSpecsRoot });
  // D5.Q2: seeding is now under a single MDA_STUDIO_DEMO=1 gate. The legacy
  // `MDA_STUDIO_SEED_FIXTURE_ISSUES=true` value is still accepted so older
  // e2e scripts keep working.
  if (
    process.env["MDA_STUDIO_DEMO"] === "1" ||
    process.env["MDA_STUDIO_SEED_FIXTURE_ISSUES"] === "true"
  ) {
    seedFixtureIssues(envGameId);
    log.info("seeded fixture issues", { gameId: envGameId });
  }
}

app.listen(port, host, () => {
  log.info("mda-studio server listening", { host, port });
});
