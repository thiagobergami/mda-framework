import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { join } from "node:path";
import request from "supertest";
import {
  specNodeDetailSchema,
  specTreeResponseSchema,
} from "@mda-studio/shared";
import { createApp } from "../app";
import { seedFixtureIssues } from "../services/fixture-seed";
import {
  clearGames,
  registerGame,
} from "../services/games-registry";
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
});

describe("GET /api/games/:gameId/spec-tree", () => {
  it("returns a SpecTreeResponse for a registered game", async () => {
    const res = await request(app).get("/api/games/virus-hunter/spec-tree");
    expect(res.status).toBe(200);
    expect(() => specTreeResponseSchema.parse(res.body)).not.toThrow();
    expect(res.body.gameId).toBe("virus-hunter");
    expect(res.body.concept.primaryAesthetic).toBe("Fellowship");
    const ids = res.body.nodes.map((n: { specId: string }) => n.specId);
    expect(ids).toEqual(
      expect.arrayContaining([
        "AES-001",
        "AES-002",
        "DYN-001",
        "DYN-002",
        "MEC-001",
        "MEC-003",
        "AST-007",
        "TUN-001",
        "LVL-001",
      ]),
    );
  });

  it("returns 404 for an unknown game", async () => {
    const res = await request(app).get("/api/games/nope/spec-tree");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/unknown game/);
  });

  it("subsequent reads use the cache (same generatedAt)", async () => {
    const a = await request(app).get("/api/games/virus-hunter/spec-tree");
    const b = await request(app).get("/api/games/virus-hunter/spec-tree");
    expect(a.body.generatedAt).toBe(b.body.generatedAt);
  });
});

describe("GET /api/games/:gameId/spec-tree/node/:specId", () => {
  it("returns SpecNodeDetail for a known spec", async () => {
    seedFixtureIssues("virus-hunter");
    const res = await request(app).get(
      "/api/games/virus-hunter/spec-tree/node/MEC-001",
    );
    expect(res.status).toBe(200);
    expect(() => specNodeDetailSchema.parse(res.body)).not.toThrow();
    expect(res.body.spec.path).toBe("specs/mechanics/revive.mec.md");
    expect(res.body.spec.body).toMatch(/Hold E for 3 seconds/);
    expect(res.body.issues.length).toBeGreaterThan(0);
    expect(res.body.trace.upward.map((r: { specId: string }) => r.specId)).toEqual([
      "AES-001",
      "DYN-001",
    ]);
  });

  it("404s for an unknown spec id", async () => {
    const res = await request(app).get(
      "/api/games/virus-hunter/spec-tree/node/MEC-999",
    );
    expect(res.status).toBe(404);
  });

  it("404s for an unknown game", async () => {
    const res = await request(app).get("/api/games/nope/spec-tree/node/MEC-001");
    expect(res.status).toBe(404);
  });

  it("decorates the tree node with active-issue data after seeding", async () => {
    seedFixtureIssues("virus-hunter");
    const tree = await request(app).get("/api/games/virus-hunter/spec-tree");
    const mec1 = tree.body.nodes.find(
      (n: { specId: string }) => n.specId === "MEC-001",
    );
    expect(mec1.activeIssueStatus).toBe("in_progress");
    expect(mec1.assigneeAgentHandle).toBe("@mech-1");
    expect(mec1.runStatus).toBe("running");
  });

  it("decorates the tree node with own + subtree MTD costs after seeding", async () => {
    seedFixtureIssues("virus-hunter");
    const tree = await request(app).get("/api/games/virus-hunter/spec-tree");
    const mec1 = tree.body.nodes.find(
      (n: { specId: string }) => n.specId === "MEC-001",
    );
    expect(mec1.costMtdCents).toBe(1160); // 920 + 240
    expect(mec1.costMtdSubtreeCents).toBeGreaterThanOrEqual(1160);

    // AES-001 rolls up DYN-001 + DYN-002 (which carries MEC-003) + own + MEC-001 subtree.
    const aes1 = tree.body.nodes.find(
      (n: { specId: string }) => n.specId === "AES-001",
    );
    expect(aes1.costMtdSubtreeCents).toBeGreaterThan(aes1.costMtdCents);

    // Last-month event must not appear.
    expect(mec1.costMtdCents).toBeLessThan(99_999);
  });

  it("decorates the tree node with warningCount after seeding", async () => {
    seedFixtureIssues("virus-hunter");
    const tree = await request(app).get("/api/games/virus-hunter/spec-tree");
    const ast = tree.body.nodes.find(
      (n: { specId: string }) => n.specId === "AST-007",
    );
    expect(ast.warningCount).toBe(1);
    const mec2 = tree.body.nodes.find(
      (n: { specId: string }) => n.specId === "MEC-002",
    );
    expect(mec2.warningCount).toBe(1);
    const mec1 = tree.body.nodes.find(
      (n: { specId: string }) => n.specId === "MEC-001",
    );
    expect(mec1.warningCount).toBe(0);
  });
});

describe("POST /api/games/:gameId/spec-tree/refresh", () => {
  it("rebuilds the cache and returns a fresh timestamp", async () => {
    const a = await request(app).get("/api/games/virus-hunter/spec-tree");
    const refresh = await request(app).post(
      "/api/games/virus-hunter/spec-tree/refresh",
    );
    expect(refresh.status).toBe(200);
    expect(refresh.body.gameId).toBe("virus-hunter");
    expect(refresh.body.specCount).toBeGreaterThan(0);
    const b = await request(app).get("/api/games/virus-hunter/spec-tree");
    expect(b.body.generatedAt).not.toBe(a.body.generatedAt);
  });

  it("returns 404 for an unknown game", async () => {
    const res = await request(app).post(
      "/api/games/nope/spec-tree/refresh",
    );
    expect(res.status).toBe(404);
  });
});
