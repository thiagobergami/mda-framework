import { Router, type Request, type Response } from "express";
import type { ActivityListResponse } from "@mda-studio/shared";
import { listActivityForStudio } from "../services/activity-log-store.js";

/**
 * Activity log API (plan §4.4, §5).
 *
 *   GET /api/studios/:studioId/activity[?gameId=&since=&limit=]
 *
 * Newest-first. `since` is an ISO timestamp that returns entries strictly
 * newer than the given value — useful for incremental polling alongside
 * SSE invalidation. `limit` is capped at 500 to mirror the in-memory ring
 * buffer.
 */
export function activityRouter(): Router {
  const router = Router();

  router.get(
    "/api/studios/:studioId/activity",
    (req: Request, res: Response) => {
      const { studioId } = req.params;
      if (!studioId) {
        res.status(400).json({ error: "missing studioId" });
        return;
      }
      const gameId =
        typeof req.query["gameId"] === "string" ? req.query["gameId"] : undefined;
      const since =
        typeof req.query["since"] === "string" ? req.query["since"] : undefined;
      const limitRaw =
        typeof req.query["limit"] === "string" ? req.query["limit"] : undefined;
      let limit: number | undefined;
      if (limitRaw !== undefined) {
        const parsed = Number.parseInt(limitRaw, 10);
        if (!Number.isFinite(parsed) || parsed < 1 || parsed > 500) {
          res.status(422).json({ error: "limit must be an integer 1..500" });
          return;
        }
        limit = parsed;
      }
      const entries = listActivityForStudio(studioId, {
        gameId,
        since,
        limit,
      });
      const body: ActivityListResponse = { studioId, entries };
      res.status(200).json(body);
    },
  );

  return router;
}
