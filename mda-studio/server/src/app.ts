import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { healthPath } from "@mda-studio/shared";
import { requestId } from "./middleware/request-id.js";

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(requestId());

  app.get(healthPath(), (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: `Not Found: ${req.method} ${req.path}` });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: err.message });
  });

  return app;
}
