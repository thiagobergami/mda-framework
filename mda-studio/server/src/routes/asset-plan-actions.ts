/**
 * Asset-plan operator actions (D6.EN4).
 *
 *   POST /api/games/:gameId/asset-plans/:assetId/generate
 *   POST /api/games/:gameId/asset-plans/:assetId/exec
 *   POST /api/games/:gameId/asset-plans/:assetId/import
 *
 * Each route drives the matching `mda asset-plan` subcommand through the
 * runner and streams NDJSON events into the studio's existing SSE bus so
 * other tabs see live progress.
 *
 * The route returns once the subprocess exits; long-running calls (exec)
 * therefore block the request. A streaming variant is in scope for week 7
 * but out of scope here — operators currently get a single response that
 * summarises the run.
 */

import { Router, type Request, type Response } from "express";
import { getGame } from "../services/games-registry.js";
import {
  runAssetPlanExec,
  runAssetPlanGenerate,
  runAssetPlanImport,
} from "../services/mda-runner.js";

const ACTIONS = new Set(["generate", "exec", "import"] as const);
type Action = typeof ACTIONS extends Set<infer T> ? T : never;

export function assetPlanActionsRouter(): Router {
  const router = Router();

  router.post(
    "/api/games/:gameId/asset-plans/:assetId/:action",
    async (req: Request, res: Response) => {
      const { gameId, assetId, action } = req.params;
      if (!gameId || !assetId || !action) {
        res.status(400).json({ error: "missing path parameter" });
        return;
      }
      if (!ACTIONS.has(action as Action)) {
        res.status(400).json({ error: `unknown action: ${action}` });
        return;
      }
      const game = getGame(gameId);
      if (!game) {
        res.status(404).json({ error: `unknown game: ${gameId}` });
        return;
      }

      try {
        const fn =
          action === "generate"
            ? runAssetPlanGenerate
            : action === "exec"
              ? runAssetPlanExec
              : runAssetPlanImport;
        const result = await fn(game.specsRoot, assetId);
        if (result.exitCode !== 0) {
          res.status(502).json({
            error: `mda asset-plan ${action} failed`,
            exitCode: result.exitCode,
            stderr: result.stderr.slice(0, 400),
          });
          return;
        }
        res.status(200).json({
          assetId,
          action,
          lastEvent: result.parsed,
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
