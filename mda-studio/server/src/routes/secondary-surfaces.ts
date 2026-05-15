/**
 * Chrome-level read endpoints for the secondary surfaces in plan §14 U7:
 *
 *   GET /api/games/:gameId/costs[?subtree=SPEC-ID]   chrome Costs page
 *   GET /api/games/:gameId/agents                    chrome Org chart
 *   GET /api/games/:gameId/asset-plans               chrome Asset Plans list
 *
 * All three lean on data the rest of the server already maintains:
 *   - the spec cache (for parsed specs)
 *   - the cost-events store + rollup (for Costs)
 *   - the issues store (for Org chart)
 *   - the filesystem under <specsRoot>/design/asset-plans (for Asset Plans)
 */

import { Router, type Request, type Response } from "express";
import type {
  AgentRosterResponse,
  AssetPlanListResponse,
  CostsDetailResponse,
} from "@mda-studio/shared";
import { buildAgentRoster } from "../services/agent-roster.js";
import { scanAssetPlans } from "../services/asset-plans-scan.js";
import { listCostEventsForGame } from "../services/cost-events-store.js";
import { computeCostRollup } from "../services/cost-rollup.js";
import { buildCostsDetail } from "../services/costs-detail.js";
import { getGame } from "../services/games-registry.js";
import { listIssuesForGame } from "../services/issues-store.js";
import {
  getCacheEntry,
  rebuildSpecCache,
  type CacheEntry,
} from "../services/spec-cache.js";

export function secondarySurfacesRouter(): Router {
  const router = Router();

  router.get(
    "/api/games/:gameId/costs",
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
      const subtreeRaw = req.query["subtree"];
      const scopeSpecId =
        typeof subtreeRaw === "string" && subtreeRaw.trim() !== ""
          ? subtreeRaw.trim()
          : null;
      const entry = await ensureCache(gameId, game.specsRoot);
      if (
        scopeSpecId &&
        !entry.specs.some((s) => s.specId === scopeSpecId)
      ) {
        res
          .status(404)
          .json({ error: `unknown spec: ${scopeSpecId}` });
        return;
      }
      const events = listCostEventsForGame(gameId);
      const rollup = computeCostRollup({ specs: entry.specs, events });
      const body: CostsDetailResponse = buildCostsDetail({
        gameId,
        generatedAt: new Date().toISOString(),
        specs: entry.specs,
        events,
        rollup,
        scopeSpecId,
      });
      res.status(200).json(body);
    },
  );

  router.get(
    "/api/games/:gameId/agents",
    (req: Request, res: Response) => {
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
      const body: AgentRosterResponse = {
        gameId,
        generatedAt: new Date().toISOString(),
        agents: buildAgentRoster(listIssuesForGame(gameId)),
      };
      res.status(200).json(body);
    },
  );

  router.get(
    "/api/games/:gameId/asset-plans",
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
      const scan = await scanAssetPlans(game.specsRoot);
      const body: AssetPlanListResponse = {
        gameId,
        generatedAt: new Date().toISOString(),
        rootPath: scan.rootPath,
        entries: scan.entries,
      };
      res.status(200).json(body);
    },
  );

  return router;
}

async function ensureCache(
  gameId: string,
  specsRoot: string,
): Promise<CacheEntry> {
  return getCacheEntry(gameId) ?? (await rebuildSpecCache(gameId, specsRoot));
}
