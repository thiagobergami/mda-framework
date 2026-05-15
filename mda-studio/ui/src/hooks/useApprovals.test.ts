import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ApprovalListResponse } from "@mda-studio/shared";
import { resolveApprovalRequest, useApprovals } from "./useApprovals";

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

function mockFetchStatus(status: number, body: unknown = { error: "x" }): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(body), { status })),
    ),
  );
}

const validResponse: ApprovalListResponse = {
  studioId: "default",
  pendingCount: 1,
  approvals: [
    {
      id: "APV-001",
      studioId: "default",
      gameId: "virus-hunter",
      specId: "MEC-001",
      kind: "mechanic-impl",
      title: "Promote MEC-001",
      body: "ready",
      requestedByHandle: "@mech-1",
      status: "pending",
      createdAt: "2026-05-13T12:00:00Z",
      updatedAt: "2026-05-13T12:00:00Z",
      resolution: null,
    },
  ],
};

describe("useApprovals", () => {
  it("returns the parsed list when the API responds 200", async () => {
    mockFetchOk(validResponse);
    const { result } = renderHook(() =>
      useApprovals({ studioId: "default" }),
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.data?.pendingCount).toBe(1);
  });

  it("surfaces an error state when the API returns non-2xx", async () => {
    mockFetchStatus(500);
    const { result } = renderHook(() =>
      useApprovals({ studioId: "default" }),
    );
    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("surfaces an error state on a malformed payload", async () => {
    mockFetchOk({ studioId: "default", pendingCount: "no", approvals: [] });
    const { result } = renderHook(() =>
      useApprovals({ studioId: "default" }),
    );
    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("passes the status filter through the query string", async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(validResponse), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const { result } = renderHook(() =>
      useApprovals({ studioId: "default", status: "approved" }),
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));
    const url = (fetchSpy.mock.calls[0]?.[0] ?? "") as string;
    expect(url).toContain("status=approved");
  });
});

describe("resolveApprovalRequest", () => {
  it("returns ok:true on 2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("{}", { status: 200 }))),
    );
    const r = await resolveApprovalRequest("APV-001", {
      status: "approved",
      approverHandle: "@d",
    });
    expect(r.ok).toBe(true);
  });

  it("returns ok:false with the server error string on a non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "already resolved" }), {
            status: 409,
            headers: { "content-type": "application/json" },
          }),
        ),
      ),
    );
    const r = await resolveApprovalRequest("APV-001", {
      status: "approved",
      approverHandle: "@d",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("already resolved");
  });
});
