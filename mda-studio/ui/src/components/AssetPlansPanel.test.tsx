import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { AssetPlanListResponse } from "@mda-studio/shared";
import { AssetPlansPanel } from "./AssetPlansPanel";

function mockGet(body: AssetPlanListResponse): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    ),
  );
}

describe("AssetPlansPanel", () => {
  it("renders an empty-state message when there are no asset plans", async () => {
    mockGet({
      gameId: "virus-hunter",
      generatedAt: "2026-05-14T12:00:00.000Z",
      rootPath: "design/asset-plans",
      entries: [],
    });
    render(<AssetPlansPanel gameId="virus-hunter" />);
    await waitFor(() =>
      expect(
        screen.getByText(/No asset plans found under/),
      ).toBeInTheDocument(),
    );
  });

  it("renders a row per asset plan with state and counts", async () => {
    mockGet({
      gameId: "virus-hunter",
      generatedAt: "2026-05-14T12:00:00.000Z",
      rootPath: "design/asset-plans",
      entries: [
        {
          assetId: "revive-vfx",
          latestPlanVersion: 2,
          latestPlanFile:
            "design/asset-plans/revive-vfx/revive-vfx.v2.plan.md",
          state: "in-progress",
          artifactCount: 1,
          refsCount: 3,
        },
        {
          assetId: "menu-bg",
          latestPlanVersion: 1,
          latestPlanFile:
            "design/asset-plans/menu-bg/menu-bg.v1.plan.md",
          state: "planned",
          artifactCount: 0,
          refsCount: 0,
        },
      ],
    });
    render(<AssetPlansPanel gameId="virus-hunter" />);
    await waitFor(() =>
      expect(screen.getByText("revive-vfx")).toBeInTheDocument(),
    );
    expect(screen.getByText("in progress")).toBeInTheDocument();
    expect(screen.getByText("planned")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByText(/3 refs/)).toBeInTheDocument();
  });
});
