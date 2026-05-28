import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createApp } from "../app.js";
import { clearGames, registerGame } from "../services/games-registry.js";

// Point the runner at the framework's local mda shim so the spawn doesn't
// hit npm-registry resolution when run from a tmp workspaceRoot.
process.env.MDA_BIN = resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "node_modules",
  ".bin",
  "mda",
);

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "specs-route-"));
  for (const dir of [
    "specs/aesthetics",
    "specs/dynamics",
    "specs/mechanics",
    "specs/assets",
    "specs/tuning",
    "specs/concept",
    "design/levels",
  ]) {
    mkdirSync(join(root, dir), { recursive: true });
  }
  writeFileSync(
    join(root, "specs/traceability.md"),
    "# Traceability\n\n## Matrix\n\n## Levels\n\n## Reading Guide\n",
  );
  clearGames();
  registerGame({
    gameId: "GAME-001",
    name: "Cozy",
    specsRoot: root,
    conceptPath: "specs/concept/cozy.concept.md",
    primaryAesthetic: "Fellowship",
    conceptTitle: "Cozy",
  });
});

afterEach(() => {
  clearGames();
  rmSync(root, { recursive: true, force: true });
});

const app = createApp();

describe("POST /api/games/:gameId/specs", () => {
  it("400s on missing fields", async () => {
    const res = await request(app)
      .post("/api/games/GAME-001/specs")
      .send({});
    expect(res.status).toBe(400);
  });

  it("404s when the game is not registered", async () => {
    const res = await request(app)
      .post("/api/games/UNKNOWN/specs")
      .send({ layer: "aesthetic", name: "Foo" });
    expect(res.status).toBe(404);
  });

  it("creates a spec file via the mda-runner", async () => {
    const res = await request(app)
      .post("/api/games/GAME-001/specs")
      .send({ layer: "aesthetic", name: "Tense" });
    expect(res.status).toBe(201);
    expect(res.body.layer).toBe("aesthetic");
    expect(res.body.file).toBe("specs/aesthetics/tense.aes.md");
    expect(res.body.id).toMatch(/^AES-/);
  }, 30000);
});
