import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { join } from "node:path";
import request from "supertest";
import {
  agentRosterResponseSchema,
  assetPlanListResponseSchema,
  costsDetailResponseSchema,
} from "@mda-studio/shared";
import { createApp } from "../app";
import { clearCostEventsStore } from "../services/cost-events-store";
import { seedFixtureIssues } from "../services/fixture-seed";
import { clearGames, registerGame } from "../services/games-registry";
import { clearIssuesStore } from "../services/issues-store";
import { clearCache } from "../services/spec-cache";

const FIXTURE_ROOT = join(
  __dirname,
  "../services/__fixtures__/specs-virus-hunter",
);

const app = createApp();

beforeEach(() => {
  clearGames();
  clearCache();
  clearIssuesStore();
  clearCostEventsStore();
  registerGame({
    gameId: "virus-hunter",
    name: "Virus Hunter",
    specsRoot: FIXTURE_ROOT,
    conceptPath: "specs/concept/virus-hunter.concept.md",
    primaryAesthetic: "Fellowship",
    conceptTitle: "Virus Hunter",
  });
});

afterEach(() => {
  clearGames();
  clearCache();
  clearIssuesStore();
  clearCostEventsStore();
});

describe("GET /api/games/:gameId/costs", () => {
  it("returns a costs-detail payload for a registered game", async () => {
    seedFixtureIssues("virus-hunter");
    const res = await request(app).get("/api/games/virus-hunter/costs");
    expect(res.status).toBe(200);
    expect(() => costsDetailResponseSchema.parse(res.body)).not.toThrow();
    expect(res.body.gameId).toBe("virus-hunter");
    expect(res.body.scopeSpecId).toBeNull();
    expect(res.body.totalMtdCents).toBeGreaterThan(0);
    expect(res.body.byLayer.length).toBeGreaterThan(0);
  });

  it("scopes to a subtree when ?subtree=… is set", async () => {
    seedFixtureIssues("virus-hunter");
    const res = await request(app).get(
      "/api/games/virus-hunter/costs?subtree=MEC-001",
    );
    expect(res.status).toBe(200);
    expect(res.body.scopeSpecId).toBe("MEC-001");
    const allSpec = res.body.bySpec.map((r: { specId: string }) => r.specId);
    for (const s of allSpec) {
      expect(["MEC-001", "AST-007"]).toContain(s);
    }
  });

  it("404s for an unknown game", async () => {
    const res = await request(app).get("/api/games/nope/costs");
    expect(res.status).toBe(404);
  });

  it("404s for an unknown subtree spec", async () => {
    const res = await request(app).get(
      "/api/games/virus-hunter/costs?subtree=MEC-999",
    );
    expect(res.status).toBe(404);
  });
});

describe("GET /api/games/:gameId/agents", () => {
  it("returns an agent roster derived from issues", async () => {
    seedFixtureIssues("virus-hunter");
    const res = await request(app).get("/api/games/virus-hunter/agents");
    expect(res.status).toBe(200);
    expect(() => agentRosterResponseSchema.parse(res.body)).not.toThrow();
    expect(res.body.gameId).toBe("virus-hunter");
    expect(res.body.agents.length).toBeGreaterThan(0);
    const mech = res.body.agents.find(
      (a: { handle: string }) => a.handle === "@mech-1",
    );
    expect(mech?.primaryLayer).toBe("M");
  });

  it("returns an empty roster before any issues are seeded", async () => {
    const res = await request(app).get("/api/games/virus-hunter/agents");
    expect(res.status).toBe(200);
    expect(res.body.agents).toEqual([]);
  });

  it("404s for an unknown game", async () => {
    const res = await request(app).get("/api/games/nope/agents");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/games/:gameId/asset-plans", () => {
  it("returns an empty list when the fixture has no asset-plans dir", async () => {
    const res = await request(app).get(
      "/api/games/virus-hunter/asset-plans",
    );
    expect(res.status).toBe(200);
    expect(() => assetPlanListResponseSchema.parse(res.body)).not.toThrow();
    expect(res.body.entries).toEqual([]);
    expect(res.body.rootPath).toBe("design/asset-plans");
  });

  it("404s for an unknown game", async () => {
    const res = await request(app).get("/api/games/nope/asset-plans");
    expect(res.status).toBe(404);
  });
});
