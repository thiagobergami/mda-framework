import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { healthPath } from "@mda-studio/shared";
import { requestId } from "./middleware/request-id.js";
import { activityRouter } from "./routes/activity.js";
import { approvalsRouter } from "./routes/approvals.js";
import { assetPlanActionsRouter } from "./routes/asset-plan-actions.js";
import { costEventsRouter } from "./routes/cost-events.js";
import { gamesRouter } from "./routes/games.js";
import { issuesRouter } from "./routes/issues.js";
import { secondarySurfacesRouter } from "./routes/secondary-surfaces.js";
import { specsRouter } from "./routes/specs.js";
import { specTreeRouter } from "./routes/spec-tree.js";
import {
  studioEventsRouter,
  type StudioEventsRouterOptions,
} from "./routes/studio-events.js";
import { validatorRunsRouter } from "./routes/validator-runs.js";

export interface CreateAppOptions {
  studioEvents?: StudioEventsRouterOptions;
}

export function createApp(opts: CreateAppOptions = {}): Express {
  const app = express();

  app.use(express.json());
  app.use(requestId());

  app.get(healthPath(), (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(gamesRouter());
  app.use(specsRouter());
  app.use(assetPlanActionsRouter());
  app.use(specTreeRouter());
  app.use(issuesRouter());
  app.use(costEventsRouter());
  app.use(validatorRunsRouter());
  app.use(approvalsRouter());
  app.use(activityRouter());
  app.use(secondarySurfacesRouter());
  app.use(studioEventsRouter(opts.studioEvents));

  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: `Not Found: ${req.method} ${req.path}` });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: err.message });
  });

  return app;
}
