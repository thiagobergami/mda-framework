import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { CostsDetailResponse } from "@mda-studio/shared";
import { useCostsDetail } from "./useCostsDetail";

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

const valid: CostsDetailResponse = {
  gameId: "virus-hunter",
  generatedAt: "2026-05-14T12:00:00.000Z",
  scopeSpecId: null,
  totalMtdCents: 100,
  orphanCents: 0,
  byLayer: [{ layer: "M", cents: 100, specCount: 1 }],
  bySpec: [
    {
      specId: "MEC-001",
      layer: "M",
      title: "Revive",
      ownCents: 100,
      subtreeCents: 100,
    },
  ],
  recentEvents: [],
};

describe("useCostsDetail", () => {
  it("returns the parsed payload when the API responds 200", async () => {
    mockFetchOk(valid);
    const { result } = renderHook(() =>
      useCostsDetail({ gameId: "virus-hunter" }),
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.data?.totalMtdCents).toBe(100);
  });

  it("passes the subtree filter through the query string", async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ...valid, scopeSpecId: "MEC-001" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const { result } = renderHook(() =>
      useCostsDetail({ gameId: "virus-hunter", scopeSpecId: "MEC-001" }),
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));
    const url = (fetchSpy.mock.calls[0]?.[0] ?? "") as string;
    expect(url).toContain("subtree=MEC-001");
  });

  it("stays idle when disabled", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { result } = renderHook(() =>
      useCostsDetail({ gameId: "virus-hunter", enabled: false }),
    );
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
