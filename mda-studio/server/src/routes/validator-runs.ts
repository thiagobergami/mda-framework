import { Router, type Request, type Response } from "express";
import { validatorRunInputSchema } from "@mda-studio/shared";
import { getGame } from "../services/games-registry.js";
import {
  latestValidatorRun,
  listValidatorWarnings,
  recordValidatorRun,
} from "../services/validator-runs-store.js";

/**
 * Validator-run ingestion + read.
 *
 *   POST /api/games/:gameId/validator/runs    body { warnings: ValidatorWarning[] }
 *   GET  /api/games/:gameId/validator/warnings
 *
 * Phase U4 only retains the latest run. The U6 webhook (mda validate
 * on git push) writes here; until then, fixture-seed populates it on
 * boot.
 */
export function validatorRunsRouter(): Router {
  const router = Router();

  router.post(
    "/api/games/:gameId/validator/runs",
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
