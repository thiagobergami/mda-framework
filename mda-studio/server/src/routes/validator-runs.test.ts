import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { join } from "node:path";
import request from "supertest";
import { createApp } from "../app";
import {
  clearGames,
  registerGame,
} from "../services/games-registry";
import { clearValidatorRunsStore } from "../services/validator-runs-store";

const FIXTURE_ROOT = join(
  __dirname,
  "../services/__fixtures__/specs-virus-hunter",
);

const app = createApp();

beforeEach(() => {
  clearGames();
  clearValidatorRunsStore();
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
  clearValidatorRunsStore();
});

describe("POST /api/games/:gameId/validator/runs", () => {
  it("records a run and surfaces it on GET warnings", async () => {
    const res = await request(app)
      .post("/api/games/virus-hunter/validator/runs")
      .send({
        warnings: [
          { specId: "MEC-002", rule: "no-status", message: "missing status" },
          { specId: "AST-007", rule: "concept-aged", message: "concept > 30d" },
        ],
      });
    expect(res.status).toBe(201);

    const get = await request(app).get(
      "/api/games/virus-hunter/validator/warnings",
    );
    expect(get.status).toBe(200);
    expect(get.body.warnings.length).toBe(2);
  });

  it("404s for an unknown game", async () => {
    const res = await request(app)
      .post("/api/games/nope/validator/runs")
      .send({ warnings: [] });
    expect(res.status).toBe(404);
  });

  it("422s on an invalid payload", async () => {
    const res = await request(app)
      .post("/api/games/virus-hunter/validator/runs")
      .send({ warnings: [{ rule: "x", message: "y" }] }); // missing specId
    expect(res.status).toBe(422);
  });
});

describe("GET /api/games/:gameId/validator/warnings", () => {
  it("returns empty warnings when no run has been recorded", async () => {
    const res = await request(app).get(
      "/api/games/virus-hunter/validator/warnings",
    );
    expect(res.status).toBe(200);
    expect(res.body.warnings).toEqual([]);
    expect(res.body.ranAt).toBe(null);
  });
});
