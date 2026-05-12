import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { requestId } from "./request-id";

function fakeReqRes() {
  const headers: Record<string, string> = {};
  const req = { headers: {} as Record<string, string | undefined> } as unknown as Request;
  const res = {
    setHeader: vi.fn((key: string, value: string) => {
      headers[key] = value;
    }),
  } as unknown as Response;
  return { req, res, headers };
}

describe("requestId middleware", () => {
  it("assigns a fresh id when no header is present", () => {
    const { req, res, headers } = fakeReqRes();
    const next = vi.fn() as unknown as NextFunction;

    requestId()(req, res, next);

    const id = (req as unknown as { id: string }).id;
    expect(id).toMatch(/^[0-9a-f-]{8,}$/i);
    expect(headers["X-Request-Id"]).toBe(id);
    expect(next).toHaveBeenCalledOnce();
  });

  it("reuses an incoming X-Request-Id header verbatim", () => {
    const { req, res, headers } = fakeReqRes();
    (req as unknown as { headers: Record<string, string> }).headers["x-request-id"] =
      "client-supplied-abc";
    const next = vi.fn() as unknown as NextFunction;

    requestId()(req, res, next);

    expect((req as unknown as { id: string }).id).toBe("client-supplied-abc");
    expect(headers["X-Request-Id"]).toBe("client-supplied-abc");
    expect(next).toHaveBeenCalledOnce();
  });

  it("ignores empty incoming header and mints a new id", () => {
    const { req, res } = fakeReqRes();
    (req as unknown as { headers: Record<string, string> }).headers["x-request-id"] = "";
    const next = vi.fn() as unknown as NextFunction;

    requestId()(req, res, next);

    const id = (req as unknown as { id: string }).id;
    expect(id).not.toBe("");
    expect(id.length).toBeGreaterThan(0);
    expect(next).toHaveBeenCalledOnce();
  });
});
