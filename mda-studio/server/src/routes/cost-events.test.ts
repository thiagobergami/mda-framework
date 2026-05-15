import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import {
  clearCostEventsStore,
  listCostEventsForGame,
} from "../services/cost-events-store";

const app = createApp();

beforeEach(() => clearCostEventsStore());
afterEach(() => clearCostEventsStore());

function payload(overrides: Record<string, unknown> = {}) {
  return {
    gameId: "virus-hunter",
    provider: "anthropic",
    model: "claude-opus-4-7",
    inputTokens: 1000,
    outputTokens: 50,
    costCents: 142,
    occurredAt: new Date().toISOString(),
    billingCode: "MEC-001",
    ...overrides,
  };
}

describe("POST /api/studios/:studioId/cost-events", () => {
  it("persists a valid event and returns 201 with id + createdAt", async () => {
    const res = await request(app)
      .post("/api/studios/studio-1/cost-events")
      .send(payload());
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^COST-/);
    expect(res.body.createdAt).toMatch(/T/);
    expect(listCostEventsForGame("virus-hunter").length).toBe(1);
  });

  it("accepts a null billingCode (orphan)", async () => {
    const res = await request(app)
      .post("/api/studios/studio-1/cost-events")
      .send(payload({ billingCode: null }));
    expect(res.status).toBe(201);
  });

  it("422s on an unrecognized billingCode prefix", async () => {
    const res = await request(app)
      .post("/api/studios/studio-1/cost-events")
      .send(payload({ billingCode: "FOO-001" }));
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/not a known spec id prefix/);
  });

  it("422s on a missing required field", async () => {
    const res = await request(app)
      .post("/api/studios/studio-1/cost-events")
      .send(payload({ costCents: -5 }));
    expect(res.status).toBe(422);
  });
});
