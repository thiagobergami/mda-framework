import { DEFAULT_HOST_LOOPBACK, DEFAULT_PORT } from "@mda-studio/shared";
import { createApp } from "./app.js";
import { createLogger } from "./logger.js";
import { seedFixtureIssues } from "./services/fixture-seed.js";
import { registerGame } from "./services/games-registry.js";

const log = createLogger();
const app = createApp();

const port = Number(process.env["PORT"] ?? DEFAULT_PORT);
const host = process.env["HOST"] ?? DEFAULT_HOST_LOOPBACK;

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
  if (process.env["MDA_STUDIO_SEED_FIXTURE_ISSUES"] === "true") {
    seedFixtureIssues(envGameId);
    log.info("seeded fixture issues", { gameId: envGameId });
  }
}

app.listen(port, host, () => {
  log.info("mda-studio server listening", { host, port });
});
