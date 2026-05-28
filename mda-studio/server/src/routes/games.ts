/**
 * Games CRUD routes (D4.ST1).
 *
 *   GET    /api/games                 → list registered games
 *   POST   /api/games                 → register a game from a workspaceRoot
 *                                       body: { workspaceRoot, conceptId? }
 *                                       422 if no concept spec found
 *                                       300 if multiple and no conceptId picked
 *   DELETE /api/games/:gameId         → unregister a game
 *
 * Persistence: still in-memory via `games-registry`. Drizzle backing arrives
 * in D5.DB1b. Each registration starts a `spec-watcher` automatically (the
 * registry does that).
 */

import { Router, type Request, type Response } from "express";
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import matter from "gray-matter";
import {
  listGames,
  registerGame,
  unregisterGame,
  type GameRegistration,
} from "../services/games-registry.js";

interface ConceptCandidate {
  conceptId: string;
  title: string;
  primaryAesthetic: string;
  conceptPath: string;
}

const CONCEPT_DIR = "specs/concept";

async function listConcepts(workspaceRoot: string): Promise<ConceptCandidate[]> {
  const dir = resolve(workspaceRoot, CONCEPT_DIR);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const found: ConceptCandidate[] = [];
  for (const name of entries) {
    if (!name.endsWith(".concept.md") || name.startsWith("_")) continue;
    const full = join(dir, name);
    try {
      const raw = await readFile(full, "utf-8");
      const fm = matter(raw).data as Record<string, unknown>;
      const id =
        typeof fm["id"] === "string" && fm["id"].length > 0 ? fm["id"] : name;
      const title =
        typeof fm["name"] === "string" && fm["name"].length > 0
          ? (fm["name"] as string)
          : id;
      const primary =
        typeof fm["primary_aesthetic"] === "string" &&
        (fm["primary_aesthetic"] as string).length > 0
          ? (fm["primary_aesthetic"] as string)
          : "Fellowship";
      found.push({
        conceptId: id,
        title,
        primaryAesthetic: primary,
        conceptPath: `${CONCEPT_DIR}/${name}`,
      });
    } catch {
      /* unreadable / unparseable — skip */
    }
  }
  return found;
}

async function workspaceIsValid(workspaceRoot: string): Promise<boolean> {
  try {
    const s = await stat(workspaceRoot);
    return s.isDirectory();
  } catch {
    return false;
  }
}

export function gamesRouter(): Router {
  const router = Router();

  router.get("/api/games", (_req: Request, res: Response) => {
    res.status(200).json({ games: listGames() });
  });

  router.post("/api/games", async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { workspaceRoot?: unknown; conceptId?: unknown };
    const workspaceRoot =
      typeof body.workspaceRoot === "string" ? body.workspaceRoot.trim() : "";
    const requestedConceptId =
      typeof body.conceptId === "string" && body.conceptId.length > 0
        ? body.conceptId
        : null;

    if (!workspaceRoot) {
      res
        .status(400)
        .json({ error: "workspaceRoot is required (absolute path to the repo)" });
      return;
    }
    const absRoot = resolve(workspaceRoot);
    if (!(await workspaceIsValid(absRoot))) {
      res.status(422).json({
        error: `workspaceRoot is not a readable directory: ${absRoot}`,
      });
      return;
    }

    const concepts = await listConcepts(absRoot);
    if (concepts.length === 0) {
      res.status(422).json({
        error: `No concept spec found under ${absRoot}/${CONCEPT_DIR}. Create one with \`npx mda new concept <name>\`.`,
      });
      return;
    }
    const first = concepts[0];
    if (!first) {
      res.status(422).json({ error: "no usable concept spec" });
      return;
    }
    let pick: ConceptCandidate = first;
    if (concepts.length > 1) {
      const matched = concepts.find((c) => c.conceptId === requestedConceptId);
      if (!matched) {
        res.status(300).json({
          error: "multiple concept specs found — pass `conceptId` to disambiguate",
          candidates: concepts.map((c) => ({
            conceptId: c.conceptId,
            title: c.title,
            primaryAesthetic: c.primaryAesthetic,
            conceptPath: c.conceptPath,
          })),
        });
        return;
      }
      pick = matched;
    }

    const reg: GameRegistration = {
      gameId: pick.conceptId,
      name: pick.title,
      specsRoot: absRoot,
      conceptPath: pick.conceptPath,
      primaryAesthetic: pick.primaryAesthetic,
      conceptTitle: pick.title,
    };
    registerGame(reg);
    res.status(201).json(reg);
  });

  router.delete("/api/games/:gameId", (req: Request, res: Response) => {
    const { gameId } = req.params;
    if (!gameId) {
      res.status(400).json({ error: "missing gameId" });
      return;
    }
    unregisterGame(gameId);
    res.status(204).end();
  });

  return router;
}
