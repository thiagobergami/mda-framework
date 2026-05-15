import { describe, expect, it } from "vitest";
import {
  costsDetailResponseSchema,
  type CostsDetailResponse,
} from "./costs-detail";

const sample: CostsDetailResponse = {
  gameId: "virus-hunter",
  generatedAt: "2026-05-14T12:00:00.000Z",
  scopeSpecId: null,
  totalMtdCents: 1234,
  orphanCents: 56,
  byLayer: [
    { layer: "M", cents: 800, specCount: 2 },
    { layer: "AST", cents: 434, specCount: 1 },
  ],
  bySpec: [
    {
      specId: "MEC-001",
      layer: "M",
      title: "Revive interaction",
      ownCents: 500,
      subtreeCents: 800,
    },
  ],
  recentEvents: [
    {
      id: "COST-001",
      provider: "anthropic",
      model: "claude-opus-4-7",
      costCents: 142,
      occurredAt: "2026-05-14T11:00:00.000Z",
      billingCode: "MEC-001",
      agentId: "agent-3",
      issueId: "ISS-001",
    },
  ],
};

describe("costsDetailResponseSchema", () => {
  it("accepts a complete payload", () => {
    expect(() => costsDetailResponseSchema.parse(sample)).not.toThrow();
  });

  it("accepts a subtree-scoped payload", () => {
    expect(() =>
      costsDetailResponseSchema.parse({ ...sample, scopeSpecId: "MEC-001" }),
    ).not.toThrow();
  });

  it("rejects a negative orphanCents", () => {
    expect(() =>
      costsDetailResponseSchema.parse({ ...sample, orphanCents: -1 }),
    ).toThrow();
  });

  it("rejects an empty billing code string on an event", () => {
    expect(() =>
      costsDetailResponseSchema.parse({
        ...sample,
        recentEvents: [{ ...sample.recentEvents[0]!, billingCode: "" }],
      }),
    ).toThrow();
  });
});
