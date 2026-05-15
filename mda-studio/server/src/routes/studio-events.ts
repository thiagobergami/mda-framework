import { Router, type Request, type Response } from "express";
import { formatStudioEventSse, type StudioEvent } from "@mda-studio/shared";
import { subscribeStudioEvents } from "../services/studio-events.js";

/**
 * Server-Sent Events stream for live UI updates (plan §9.1, phase U6).
 *
 *   GET /api/studios/:studioId/events
 *
 * Returns a `text/event-stream` that re-publishes every `StudioEvent` from
 * the in-process bus. Each event arrives as:
 *
 *   event: <type>
 *   data: <json>
 *
 * The endpoint emits a `: hello` comment immediately so clients know the
 * connection is live, and a `: heartbeat` comment every `heartbeatMs` ms to
 * keep intermediaries from closing idle connections. Disabling the
 * heartbeat (heartbeatMs = 0) is supported for tests so they don't have to
 * tear down a timer.
 *
 * Scope: the bus is process-wide, so V1 emits all events to every
 * subscriber. Clients filter by `gameId` on the receiving side. When a real
 * studios table arrives, the route gains a per-studio filter here.
 */
export interface StudioEventsRouterOptions {
  /** Interval between `: heartbeat` comment lines. Set to 0 to disable. */
  heartbeatMs?: number;
}

const DEFAULT_HEARTBEAT_MS = 25_000;

export function studioEventsRouter(
  opts: StudioEventsRouterOptions = {},
): Router {
  const heartbeatMs = opts.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
  const router = Router();

  router.get(
    "/api/studios/:studioId/events",
    (req: Request, res: Response) => {
      const { studioId } = req.params;
      if (!studioId) {
        res.status(400).json({ error: "missing studioId" });
        return;
      }

      res.status(200);
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      // Nginx and similar proxies: disable response buffering so SSE frames
      // arrive in real time rather than being held back.
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      res.write(`: hello ${studioId}\n\n`);

      const unsubscribe = subscribeStudioEvents((event: StudioEvent) => {
        res.write(formatStudioEventSse(event));
      });

      const heartbeat =
        heartbeatMs > 0
          ? setInterval(() => {
              res.write(": heartbeat\n\n");
            }, heartbeatMs)
          : null;
      heartbeat?.unref?.();

      const close = (): void => {
        unsubscribe();
        if (heartbeat) clearInterval(heartbeat);
      };
      req.on("close", close);
      req.on("aborted", close);
    },
  );

  return router;
}
