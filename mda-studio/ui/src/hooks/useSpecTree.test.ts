import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSpecTree } from "./useSpecTree";
import { virusHunterTree } from "../fixtures/virus-hunter";

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

function mockFetchStatus(status: number): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: "x" }), { status }),
      ),
    ),
  );
}

describe("useSpecTree", () => {
  it("returns api-sourced data on a 200 response", async () => {
    mockFetchOk(virusHunterTree);
    const { result } = renderHook(() => useSpecTree("virus-hunter"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.source).toBe("api");
    expect(result.current.data?.gameId).toBe("virus-hunter");
  });

  it("falls back to local fixture on 404 (known game)", async () => {
    mockFetchStatus(404);
    const { result } = renderHook(() => useSpecTree("virus-hunter"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.source).toBe("fixture");
    expect(result.current.data?.nodes.length).toBeGreaterThan(0);
  });

  it("falls back to local fixture when fetch throws (known game)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network down"))),
    );
    const { result } = renderHook(() => useSpecTree("virus-hunter"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.source).toBe("fixture");
  });

  it("returns an error state when no fallback exists for the game", async () => {
    mockFetchStatus(404);
    const { result } = renderHook(() => useSpecTree("not-a-real-game"));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toMatch(/404/);
  });

  it("rejects an invalid payload via zod and falls back", async () => {
    mockFetchOk({ gameId: "x", concept: {}, nodes: "no" });
    const { result } = renderHook(() => useSpecTree("virus-hunter"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.source).toBe("fixture");
  });
});
