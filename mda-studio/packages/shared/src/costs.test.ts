import { describe, expect, it } from "vitest";
import {
  costEventInputSchema,
  isInCurrentMonth,
  validatorRunInputSchema,
} from "./costs";

describe("costEventInputSchema", () => {
  const ok = {
    studioId: "studio-1",
    gameId: "virus-hunter",
    agentId: "agent-3",
    issueId: "ISS-001",
    provider: "anthropic",
    model: "claude-opus-4-7",
    inputTokens: 12345,
    outputTokens: 678,
    costCents: 142,
    occurredAt: "2026-05-11T20:00:00.000Z",
    billingCode: "MEC-001",
  } as const;

  it("accepts a complete event", () => {
    expect(() => costEventInputSchema.parse(ok)).not.toThrow();
  });

  it("accepts a null billingCode (orphan cost)", () => {
    expect(() =>
      costEventInputSchema.parse({ ...ok, billingCode: null }),
    ).not.toThrow();
  });

  it("rejects a negative costCents", () => {
    expect(() =>
      costEventInputSchema.parse({ ...ok, costCents: -1 }),
    ).toThrow();
  });

  it("rejects an empty billingCode string (must be null or non-empty)", () => {
    expect(() =>
      costEventInputSchema.parse({ ...ok, billingCode: "" }),
    ).toThrow();
  });
});

describe("validatorRunInputSchema", () => {
  it("accepts an empty warning list", () => {
    expect(() => validatorRunInputSchema.parse({ warnings: [] })).not.toThrow();
  });

  it("accepts warnings tied to spec ids", () => {
    expect(() =>
      validatorRunInputSchema.parse({
        warnings: [
          { specId: "MEC-002", rule: "missing-trace", message: "no trace_to" },
        ],
      }),
    ).not.toThrow();
  });
});

describe("isInCurrentMonth", () => {
  it("returns true for today", () => {
    expect(isInCurrentMonth(new Date().toISOString())).toBe(true);
  });

  it("returns false for last month", () => {
    const now = new Date(Date.UTC(2026, 4, 15)); // May 2026
    const lastMonth = new Date(Date.UTC(2026, 3, 15)).toISOString(); // April 2026
    expect(isInCurrentMonth(lastMonth, now)).toBe(false);
  });

  it("returns false for a garbage string", () => {
    expect(isInCurrentMonth("not a date")).toBe(false);
  });
});
