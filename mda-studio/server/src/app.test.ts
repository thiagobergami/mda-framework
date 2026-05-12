import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "./app";

describe("createApp — /api/health (Phase 1.1 exit check)", () => {
  it("returns 200 with {status:'ok'} JSON", async () => {
    const app = createApp();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("includes a JSON content-type", async () => {
    const app = createApp();
    const res = await request(app).get("/api/health");
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  it("sets an X-Request-Id header on every response", async () => {
    const app = createApp();
    const res = await request(app).get("/api/health");
    expect(res.headers["x-request-id"]).toBeTruthy();
    expect(res.headers["x-request-id"]?.length).toBeGreaterThan(0);
  });

  it("propagates an incoming X-Request-Id header back to the response", async () => {
    const app = createApp();
    const res = await request(app)
      .get("/api/health")
      .set("X-Request-Id", "test-corr-123");
    expect(res.headers["x-request-id"]).toBe("test-corr-123");
  });

  it("returns 404 with a structured error for unknown routes", async () => {
    const app = createApp();
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });
});
