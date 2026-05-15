import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import {
  clearApprovalsStore,
  createApproval,
} from "../services/approvals-store";

const app = createApp();

beforeEach(() => clearApprovalsStore());
afterEach(() => clearApprovalsStore());

function seed() {
  return createApproval({
    studioId: "default",
    gameId: "virus-hunter",
    specId: "MEC-001",
    kind: "mechanic-impl",
    title: "Promote MEC-001",
    body: "ready",
    requestedByHandle: "@mech-1",
  });
}

describe("GET /api/studios/:studioId/approvals", () => {
  it("returns approvals + pending count", async () => {
    const a = seed();
    const b = seed();
    const res = await request(app).get("/api/studios/default/approvals");
    expect(res.status).toBe(200);
    expect(res.body.studioId).toBe("default");
    expect(res.body.pendingCount).toBe(2);
    expect(res.body.approvals.map((x: { id: string }) => x.id)).toEqual([
      b.id,
      a.id,
    ]);
  });

  it("filters by status query param", async () => {
    seed();
    const res = await request(app).get(
      "/api/studios/default/approvals?status=approved",
    );
    expect(res.status).toBe(200);
    expect(res.body.approvals).toHaveLength(0);
    expect(res.body.pendingCount).toBe(1);
  });

  it("422s on bad status query", async () => {
    const res = await request(app).get(
      "/api/studios/default/approvals?status=maybe",
    );
    expect(res.status).toBe(422);
  });
});

describe("GET /api/approvals/:id", () => {
  it("returns the approval when it exists", async () => {
    const a = seed();
    const res = await request(app).get(`/api/approvals/${a.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(a.id);
  });

  it("404s for unknown id", async () => {
    const res = await request(app).get("/api/approvals/APV-999");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/approvals/:id", () => {
  it("approves a pending approval", async () => {
    const a = seed();
    const res = await request(app)
      .patch(`/api/approvals/${a.id}`)
      .send({ status: "approved", approverHandle: "@director", comment: "yes" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("approved");
    expect(res.body.resolution.comment).toBe("yes");
  });

  it("rejects an already-resolved approval with 409", async () => {
    const a = seed();
    await request(app)
      .patch(`/api/approvals/${a.id}`)
      .send({ status: "approved", approverHandle: "@d" });
    const res = await request(app)
      .patch(`/api/approvals/${a.id}`)
      .send({ status: "rejected", approverHandle: "@d" });
    expect(res.status).toBe(409);
  });

  it("422s on invalid body", async () => {
    const a = seed();
    const res = await request(app)
      .patch(`/api/approvals/${a.id}`)
      .send({ status: "pending" });
    expect(res.status).toBe(422);
  });

  it("404s for unknown id", async () => {
    const res = await request(app)
      .patch("/api/approvals/APV-999")
      .send({ status: "approved", approverHandle: "@d" });
    expect(res.status).toBe(404);
  });
});
