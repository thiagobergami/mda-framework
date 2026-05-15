import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import {
  clearIssuesStore,
  createIssue,
  getIssue,
} from "../services/issues-store";

const app = createApp();

beforeEach(() => clearIssuesStore());
afterEach(() => clearIssuesStore());

describe("GET /api/issues/:id", () => {
  it("returns the issue when it exists", async () => {
    const a = createIssue({ gameId: "g", specId: "MEC-001", title: "x" });
    const res = await request(app).get(`/api/issues/${a.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(a.id);
  });

  it("404s for an unknown id", async () => {
    const res = await request(app).get("/api/issues/ISS-999");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/issues/:id", () => {
  it("applies a legal transition and returns the updated issue", async () => {
    const a = createIssue({
      gameId: "g",
      specId: "MEC-001",
      title: "x",
      status: "todo",
    });
    const res = await request(app)
      .patch(`/api/issues/${a.id}`)
      .send({ status: "in_progress" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("in_progress");
    expect(getIssue(a.id)?.status).toBe("in_progress");
  });

  it("409s on an illegal transition", async () => {
    const a = createIssue({
      gameId: "g",
      specId: "MEC-001",
      title: "x",
      status: "todo",
    });
    const res = await request(app)
      .patch(`/api/issues/${a.id}`)
      .send({ status: "done" });
    expect(res.status).toBe(409);
  });

  it("422s on an unknown status value", async () => {
    const a = createIssue({ gameId: "g", specId: "MEC-001", title: "x" });
    const res = await request(app)
      .patch(`/api/issues/${a.id}`)
      .send({ status: "shipping" });
    expect(res.status).toBe(422);
  });

  it("404s for an unknown id", async () => {
    const res = await request(app)
      .patch("/api/issues/ISS-999")
      .send({ status: "done" });
    expect(res.status).toBe(404);
  });
});
