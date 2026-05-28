import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createApp } from "../app.js";
import { clearGames } from "../services/games-registry.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "games-route-"));
  mkdirSync(join(root, "specs/concept"), { recursive: true });
  clearGames();
});

afterEach(() => {
  clearGames();
  rmSync(root, { recursive: true, force: true });
});

const app = createApp();

describe("POST /api/games", () => {
  it("returns 422 when no concept spec is present", async () => {
    const res = await request(app)
      .post("/api/games")
      .send({ workspaceRoot: root });
    expect(res.status).toBe(422);
    expect(res.body.error).toContain("No concept spec found");
  });

  it("registers a game when one concept spec is present", async () => {
    writeFileSync(
      join(root, "specs/concept/cozy.concept.md"),
      "---\nid: GAME-001\nname: Cozy\nprimary_aesthetic: Fellowship\n---\n# Cozy\n",
    );

    const res = await request(app)
      .post("/api/games")
      .send({ workspaceRoot: root });
    expect(res.status).toBe(201);
    expect(res.body.gameId).toBe("GAME-001");
    expect(res.body.specsRoot).toBe(root);
    expect(res.body.primaryAesthetic).toBe("Fellowship");

    const list = await request(app).get("/api/games");
    expect(list.status).toBe(200);
    expect(list.body.games).toHaveLength(1);
  });

  it("returns 300 when multiple concepts are present and no conceptId picked", async () => {
    writeFileSync(
      join(root, "specs/concept/a.concept.md"),
      "---\nid: GAME-A\nname: A\n---\n# A\n",
    );
    writeFileSync(
      join(root, "specs/concept/b.concept.md"),
      "---\nid: GAME-B\nname: B\n---\n# B\n",
    );

    const res = await request(app)
      .post("/api/games")
      .send({ workspaceRoot: root });
    expect(res.status).toBe(300);
    expect(res.body.candidates).toHaveLength(2);

    const picked = await request(app)
      .post("/api/games")
      .send({ workspaceRoot: root, conceptId: "GAME-B" });
    expect(picked.status).toBe(201);
    expect(picked.body.gameId).toBe("GAME-B");
  });

  it("422s when workspaceRoot is missing or unreadable", async () => {
    const missing = await request(app)
      .post("/api/games")
      .send({});
    expect(missing.status).toBe(400);

    const bogus = await request(app)
      .post("/api/games")
      .send({ workspaceRoot: "/definitely/not/a/real/path/here" });
    expect(bogus.status).toBe(422);
  });
});

describe("DELETE /api/games/:gameId", () => {
  it("unregisters a game and returns 204", async () => {
    writeFileSync(
      join(root, "specs/concept/cozy.concept.md"),
      "---\nid: GAME-001\nname: Cozy\n---\n# Cozy\n",
    );
    await request(app).post("/api/games").send({ workspaceRoot: root });

    const del = await request(app).delete("/api/games/GAME-001");
    expect(del.status).toBe(204);

    const list = await request(app).get("/api/games");
    expect(list.body.games).toHaveLength(0);
  });
});
