import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { AgentRosterResponse } from "@mda-studio/shared";
import { useAgentRoster } from "./useAgentRoster";

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

const valid: AgentRosterResponse = {
  gameId: "virus-hunter",
  generatedAt: "2026-05-14T12:00:00.000Z",
  agents: [
    {
      agentId: "a-mech",
      handle: "@mech-1",
      primaryLayer: "M",
      activeIssueCount: 2,
      completedIssueCount: 1,
      totalIssueCount: 3,
    },
  ],
};

describe("useAgentRoster", () => {
  it("returns the parsed roster", async () => {
    mockFetchOk(valid);
    const { result } = renderHook(() =>
      useAgentRoster({ gameId: "virus-hunter" }),
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.data?.agents).toHaveLength(1);
  });

  it("surfaces an error state on a malformed payload", async () => {
    mockFetchOk({ ...valid, agents: "no" });
    const { result } = renderHook(() =>
      useAgentRoster({ gameId: "virus-hunter" }),
    );
    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("stays idle when disabled", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { result } = renderHook(() =>
      useAgentRoster({ gameId: "virus-hunter", enabled: false }),
    );
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
