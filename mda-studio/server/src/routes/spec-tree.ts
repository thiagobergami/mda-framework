import { Router, type Request, type Response } from "express";
import type { IssueSummary } from "@mda-studio/shared";
import { listCostEventsForGame } from "../services/cost-events-store.js";
import {
  computeCostRollup,
  type CostRollupMaps,
} from "../services/cost-rollup.js";
import {
  getGame,
  type GameRegistration,
} from "../services/games-registry.js";
import { findActiveIssueForSpec } from "../services/issues-store.js";
import {
  getCacheEntry,
  rebuildSpecCache,
  type CacheEntry,
} from "../services/spec-cache.js";
import { buildSpecNodeDetail } from "../services/spec-node-detail.js";
import { assembleSpecTreeResponse } from "../services/spec-tree-assembly.js";
import { listValidatorWarnings } from "../services/validator-runs-store.js";

/**
 * Routes that back the spec-tree-first UI (plan §7).
 *
 *   GET  /api/games/:gameId/spec-tree                    current tree
 *   GET  /api/games/:gameId/spec-tree/node/:specId       drawer detail
 *   POST /api/games/:gameId/spec-tree/refresh            force a rebuild
 */
export function specTreeRouter(): Router {
  const router = Router();

  router.get(
    "/api/games/:gameId/spec-tree",
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
      const entry = await ensureCache(gameId, game.specsRoot);
      const response = buildTreeResponse(gameId, game, entry);
      res.status(200).json(response);
    },
  );

  router.get(
    "/api/games/:gameId/spec-tree/node/:specId",
    async (req: Request, res: Response) => {
      const { gameId, specId } = req.params;
      if (!gameId || !specId) {
        res.status(400).json({ error: "missing gameId or specId" });
        return;
      }
      const game = getGame(gameId);
      if (!game) {
        res.status(404).json({ error: `unknown game: ${gameId}` });
        return;
      }
      const entry = await ensureCache(gameId, game.specsRoot);
      const parsed = entry.specs.find((s) => s.specId === specId);
      if (!parsed) {
        res.status(404).json({ error: `unknown spec: ${specId}` });
        return;
      }
      const tree = buildTreeResponse(gameId, game, entry);
      const node = tree.nodes.find((n) => n.specId === specId);
      if (!node) {
        res.status(500).json({ error: "internal: node missing in assembled tree" });
        return;
      }
      const rollup = buildRollup(gameId, entry);
      const warnings = listValidatorWarnings(gameId);
      const detail = await buildSpecNodeDetail({
        gameId,
        specsRoot: game.specsRoot,
        allSpecs: entry.specs,
        node,
        parsedSpec: parsed,
        ownCostCents: rollup.ownCents.get(specId) ?? 0,
        subtreeCostCents: rollup.subtreeCents.get(specId) ?? 0,
        byBillingCode: rollup.byBillingCodeForSpec.get(specId) ?? [],
        allWarnings: warnings,
      });
      res.status(200).json(detail);
    },
  );

  router.post(
    "/api/games/:gameId/spec-tree/refresh",
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
      const entry = await rebuildSpecCache(gameId, game.specsRoot);
      res.status(200).json({
        gameId,
        rebuiltAt: entry.rebuiltAt,
        specCount: entry.specs.length,
        issueCount: entry.issues.length,
      });
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

function buildActiveIssueMap(
  gameId: string,
  specIds: readonly string[],
): Map<string, IssueSummary> {
  const out = new Map<string, IssueSummary>();
  for (const id of specIds) {
    const active = findActiveIssueForSpec(gameId, id);
    if (active) out.set(id, active);
  }
  return out;
}

function buildRollup(gameId: string, entry: CacheEntry): CostRollupMaps {
  return computeCostRollup({
    specs: entry.specs,
    events: listCostEventsForGame(gameId),
  });
}

function buildWarningCounts(gameId: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const w of listValidatorWarnings(gameId)) {
    counts.set(w.specId, (counts.get(w.specId) ?? 0) + 1);
  }
  return counts;
}

function buildTreeResponse(
  gameId: string,
  game: GameRegistration,
  entry: CacheEntry,
) {
  const activeMap = buildActiveIssueMap(
    gameId,
    entry.specs.map((s) => s.specId),
  );
  const rollup = buildRollup(gameId, entry);
  const warningCounts = buildWarningCounts(gameId);
  return assembleSpecTreeResponse({
    gameId,
    concept: {
      path: game.conceptPath,
      primaryAesthetic: game.primaryAesthetic,
      title: game.conceptTitle,
    },
    specs: entry.specs,
    generatedAt: entry.rebuiltAt,
    activeIssueBySpecId: activeMap,
    ownCostBySpecId: rollup.ownCents,
    subtreeCostBySpecId: rollup.subtreeCents,
    warningCountBySpecId: warningCounts,
  });
}
