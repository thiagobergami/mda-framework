import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import {
  clearActivityLog,
  recordActivity,
} from "../services/activity-log-store";

const app = createApp();

beforeEach(() => clearActivityLog());
afterEach(() => clearActivityLog());

function seed(): void {
  recordActivity({
    studioId: "default",
    gameId: "virus-hunter",
    specId: "MEC-001",
    kind: "issue-created",
    summary: "@mech-1 created ISS-001 on MEC-001",
    actor: "@mech-1",
  });
  recordActivity({
    studioId: "default",
    gameId: "virus-hunter",
    specId: "MEC-001",
    kind: "issue-status-changed",
    summary: "@mech-1 moved ISS-001 from todo to in_progress",
    actor: "@mech-1",
  });
}

describe("GET /api/studios/:studioId/activity", () => {
  it("returns entries newest-first", async () => {
    seed();
    const res = await request(app).get("/api/studios/default/activity");
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(2);
    expect(res.body.entries[0].kind).toBe("issue-status-changed");
  });

  it("filters by gameId", async () => {
    seed();
    recordActivity({
      studioId: "default",
      gameId: "other-game",
      kind: "cost-event",
      summary: "noise",
    });
    const res = await request(app).get(
      "/api/studios/default/activity?gameId=virus-hunter",
    );
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(2);
  });

  it("respects the limit", async () => {
    seed();
    const res = await request(app).get(
      "/api/studios/default/activity?limit=1",
    );
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(1);
  });

  it("422s on a bad limit", async () => {
    const res = await request(app).get(
      "/api/studios/default/activity?limit=foo",
    );
    expect(res.status).toBe(422);
  });

  it("returns an empty list for studios with no activity", async () => {
    const res = await request(app).get("/api/studios/empty/activity");
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(0);
  });
});
