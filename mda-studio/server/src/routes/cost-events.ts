import { Router, type Request, type Response } from "express";
import { costEventInputSchema } from "@mda-studio/shared";
import { recordCostEvent } from "../services/cost-events-store.js";

/**
 * Cost-event ingestion (plan §13.2).
 *
 *   POST /api/studios/:studioId/cost-events
 *
 * Body matches `costEventInputSchema` minus `studioId` (taken from the
 * URL). Returns the persisted event with id + createdAt. Rejects with
 * 422 on shape errors and 422 on an unrecognized billing-code prefix.
 */
export function costEventsRouter(): Router {
  const router = Router();

  router.post(
    "/api/studios/:studioId/cost-events",
    (req: Request, res: Response) => {
      const { studioId } = req.params;
      if (!studioId) {
        res.status(400).json({ error: "missing studioId" });
        return;
      }
      const parse = costEventInputSchema.safeParse({
        ...req.body,
        studioId,
      });
      if (!parse.success) {
        res.status(422).json({
          error: "invalid cost-event payload",
          issues: parse.error.issues,
        });
        return;
      }
      const result = recordCostEvent(parse.data);
      if (!result.ok) {
        res.status(422).json({ error: result.message });
        return;
      }
      res.status(201).json(result.event);
    },
  );

  return router;
}
