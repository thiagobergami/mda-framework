import { describe, expect, it } from "vitest";
import {
  assetPlanListResponseSchema,
  type AssetPlanListResponse,
} from "./asset-plans";

const sample: AssetPlanListResponse = {
  gameId: "virus-hunter",
  generatedAt: "2026-05-14T12:00:00.000Z",
  rootPath: "design/asset-plans",
  entries: [
    {
      assetId: "revive-vfx",
      latestPlanVersion: 2,
      latestPlanFile: "design/asset-plans/revive-vfx/revive-vfx.v2.plan.md",
      state: "in-progress",
      artifactCount: 1,
      refsCount: 3,
    },
    {
      assetId: "downed-overlay",
      latestPlanVersion: null,
      latestPlanFile: null,
      state: "no-plan",
      artifactCount: 0,
      refsCount: 0,
    },
  ],
};

describe("assetPlanListResponseSchema", () => {
  it("accepts a complete payload", () => {
    expect(() => assetPlanListResponseSchema.parse(sample)).not.toThrow();
  });

  it("rejects an unknown state", () => {
    expect(() =>
      assetPlanListResponseSchema.parse({
        ...sample,
        entries: [{ ...sample.entries[0]!, state: "draft" }],
      }),
    ).toThrow();
  });

  it("rejects a zero or negative plan version", () => {
    expect(() =>
      assetPlanListResponseSchema.parse({
        ...sample,
        entries: [{ ...sample.entries[0]!, latestPlanVersion: 0 }],
      }),
    ).toThrow();
  });
});
