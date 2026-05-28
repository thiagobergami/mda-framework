/**
 * Spec authoring route (D4.ST2).
 *
 *   POST /api/games/:gameId/specs    body: { layer, name, traces? }
 *
 * Drives `npx mda new <layer> <name> --from-json /tmp/o.json --no-prompt --json`
 * via the `mda-runner` service. The spec-watcher (D3.EN3) then fires a
 * `node-changed` SSE event so the tree updates without a manual reload.
 */

import { Router, type Request, type Response } from "express";
import { getGame } from "../services/games-registry.js";
import { runNew } from "../services/mda-runner.js";

const VALID_LAYERS = new Set([
  "concept",
  "aesthetic",
  "dynamic",
  "mechanic",
  "asset",
  "tuning",
  "binding",
  "level",
]);

export function specsRouter(): Router {
  const router = Router();

  router.post(
    "/api/games/:gameId/specs",
    async (req: Request, res: Response) => {
      const { gameId } = req.params;
      if (!gameId) {
        res.status(400).json({ error: "missing gameId" });
        return;
      }
      const game = getGame(gameId);
      if (!game) {
        res.status(404).json({ error: `unknown game: ${gameId}` });
        return;
      }
      const body = (req.body ?? {}) as {
        layer?: unknown;
        name?: unknown;
        traces?: unknown;
      };
      const layer =
        typeof body.layer === "string" ? body.layer.toLowerCase() : "";
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!VALID_LAYERS.has(layer)) {
        res
          .status(400)
          .json({ error: `invalid layer: ${layer}` });
        return;
      }
      if (!name) {
        res.status(400).json({ error: "name is required" });
        return;
      }
      const overrides: Record<string, unknown> =
        body.traces && typeof body.traces === "object" && !Array.isArray(body.traces)
          ? (body.traces as Record<string, unknown>)
          : {};

      try {
        const result = await runNew(game.specsRoot, layer, name, overrides);
        if (!result.parsed) {
          res.status(502).json({
            error: "mda new produced no parseable JSON",
            stderr: result.stderr.slice(0, 400),
          });
          return;
        }
        if (!result.parsed.ok) {
          res.status(422).json({ error: result.parsed.error });
          return;
        }
        res.status(201).json({
          id: result.parsed.id,
          file: result.parsed.file,
          layer: result.parsed.layer,
          name: result.parsed.name,
        });
      } catch (err) {
        res.status(502).json({
          error: "mda-runner failed",
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  return router;
}
