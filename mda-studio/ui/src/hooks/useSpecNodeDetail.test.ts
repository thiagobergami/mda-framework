import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { SpecNodeDetail } from "@mda-studio/shared";
import { useSpecNodeDetail } from "./useSpecNodeDetail";
import { virusHunterTree } from "../fixtures/virus-hunter";

function detailFor(specId: string): SpecNodeDetail {
  const node = virusHunterTree.nodes.find((n) => n.specId === specId)!;
  return {
    node,
    spec: { path: "x", frontmatter: {}, body: `# ${specId} body` },
    issues: [],
    recentComments: [],
    workProducts: [],
    costsMtd: { own: 0, subtree: 0, byBillingCode: [] },
    warnings: [],
    trace: { upward: [], secondaryParents: [], outgoingRefs: [] },
  };
}

describe("useSpecNodeDetail", () => {
  it("returns api-sourced detail on a 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify(detailFor("MEC-001")), { status: 200 }),
        ),
      ),
    );
    const { result } = renderHook(() =>
      useSpecNodeDetail("virus-hunter", "MEC-001", virusHunterTree.nodes),
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.source).toBe("api");
    expect(result.current.data?.spec.body).toMatch(/MEC-001 body/);
  });

  it("falls back to fixture body when api 404s", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("", { status: 404 }))),
    );
    const { result } = renderHook(() =>
      useSpecNodeDetail("virus-hunter", "MEC-001", virusHunterTree.nodes),
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.source).toBe("fixture");
    expect(result.current.data?.spec.body).toMatch(/Revive\.startInteraction/);
  });

  it("returns ready with null data when specId is null", async () => {
    const { result } = renderHook(() =>
      useSpecNodeDetail("virus-hunter", null, virusHunterTree.nodes),
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.data).toBeNull();
  });

  it("errors out when no fixture node matches the spec id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("net"))),
    );
    const { result } = renderHook(() =>
      useSpecNodeDetail("virus-hunter", "MEC-999", virusHunterTree.nodes),
    );
    await waitFor(() => expect(result.current.status).toBe("error"));
  });
});
