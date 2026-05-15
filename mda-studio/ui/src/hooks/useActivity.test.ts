import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ActivityListResponse } from "@mda-studio/shared";
import { useActivity } from "./useActivity";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const validBody: ActivityListResponse = {
  studioId: "default",
  entries: [
    {
      id: "ACT-0001",
      studioId: "default",
      gameId: "virus-hunter",
      specId: "MEC-001",
      kind: "issue-created",
      summary: "@mech-1 created ISS-001",
      actor: "@mech-1",
      createdAt: "2026-05-13T12:00:00Z",
    },
  ],
};

describe("useActivity", () => {
  it("returns the parsed entries on 2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse(validBody))),
    );
    const { result } = renderHook(() =>
      useActivity({ studioId: "default" }),
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.data?.entries).toHaveLength(1);
  });

  it("surfaces an error state on a non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({ error: "x" }, 500))),
    );
    const { result } = renderHook(() =>
      useActivity({ studioId: "default" }),
    );
    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("does not fetch when disabled", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { result } = renderHook(() =>
      useActivity({ studioId: "default", enabled: false }),
    );
    expect(result.current.status).toBe("idle");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("threads gameId and limit through the query string", async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve(jsonResponse(validBody)),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const { result } = renderHook(() =>
      useActivity({ studioId: "default", gameId: "virus-hunter", limit: 10 }),
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));
    const url = String(fetchSpy.mock.calls[0]?.[0] ?? "");
    expect(url).toContain("gameId=virus-hunter");
    expect(url).toContain("limit=10");
  });
});
