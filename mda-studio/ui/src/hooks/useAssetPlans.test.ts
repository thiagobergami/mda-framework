import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { AssetPlanListResponse } from "@mda-studio/shared";
import { useAssetPlans } from "./useAssetPlans";

function mockFetchOk(body: unknown): void {
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

const valid: AssetPlanListResponse = {
  gameId: "virus-hunter",
  generatedAt: "2026-05-14T12:00:00.000Z",
  rootPath: "design/asset-plans",
  entries: [],
};

describe("useAssetPlans", () => {
  it("returns the parsed list (empty allowed)", async () => {
    mockFetchOk(valid);
    const { result } = renderHook(() =>
      useAssetPlans({ gameId: "virus-hunter" }),
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.data?.entries).toEqual([]);
  });

  it("surfaces a non-2xx error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "boom" }), { status: 500 }),
        ),
      ),
    );
    const { result } = renderHook(() =>
      useAssetPlans({ gameId: "virus-hunter" }),
    );
    await waitFor(() => expect(result.current.status).toBe("error"));
  });
});
