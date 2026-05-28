import { Router, type Request, type Response } from "express";
import { validatorRunInputSchema, type ValidatorWarning } from "@mda-studio/shared";
import { getGame } from "../services/games-registry.js";
import {
  latestValidatorRun,
  listValidatorWarnings,
  recordValidatorRun,
} from "../services/validator-runs-store.js";
import { runValidate } from "../services/mda-runner.js";

/**
 * Validator-run ingestion + read.
 *
 *   POST /api/games/:gameId/validator/runs    invokes `mda validate --json`
 *     (D3.ST3 — the studio drives the engine via subprocess instead of
 *     accepting an external payload). For tests and the historical
 *     fixture-seed code path, an explicit `{ warnings }` body still works.
 *   GET  /api/games/:gameId/validator/warnings
 */
export function validatorRunsRouter(): Router {
  const router = Router();

  router.post(
    "/api/games/:gameId/validator/runs",
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

      // Body path (legacy): caller supplied warnings explicitly.
      if (req.body && Object.keys(req.body as Record<string, unknown>).length > 0) {
        const parse = validatorRunInputSchema.safeParse(req.body);
        if (!parse.success) {
          res.status(422).json({
            error: "invalid validator-run payload",
            issues: parse.error.issues,
          });
          return;
        }
        const run = recordValidatorRun(gameId, parse.data.warnings);
        res.status(201).json(run);
        return;
      }

      // Default path: drive `mda validate --json` against the game's
      // workspace and translate diagnostics to ValidatorWarning rows.
      try {
        const result = await runValidate(game.specsRoot);
        if (!result.parsed) {
          res.status(502).json({
            error: "mda validate produced no parseable JSON",
            exitCode: result.exitCode,
            stderr: result.stderr.slice(0, 400),
          });
          return;
        }
        const warnings: ValidatorWarning[] = result.parsed.diagnostics
          .filter((d) => d.level === "warn" || d.level === "error")
          .map((d) => ({
            specId: d.specId ?? "(workspace)",
            rule: d.rule,
            message: d.message,
          }));
        const run = recordValidatorRun(gameId, warnings);
        res.status(201).json(run);
      } catch (err) {
        res.status(502).json({
          error: "mda-runner failed",
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  router.get(
    "/api/games/:gameId/validator/warnings",
    (req: Request, res: Response) => {
      const { gameId } = req.params;
      if (!gameId) {
        res.status(400).json({ error: "missing gameId" });
        return;
      }
      if (!getGame(gameId)) {
        res.status(404).json({ error: `unknown game: ${gameId}` });
        return;
      }
      const run = latestValidatorRun(gameId);
      res.status(200).json({
        gameId,
        ranAt: run?.ranAt ?? null,
        warnings: listValidatorWarnings(gameId),
      });
    },
  );

  return router;
}
