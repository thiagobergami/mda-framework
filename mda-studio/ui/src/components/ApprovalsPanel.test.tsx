import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApprovalListResponse } from "@mda-studio/shared";
import { ApprovalsPanel } from "./ApprovalsPanel";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function mockGet(body: ApprovalListResponse): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(jsonResponse(body))),
  );
}

const pendingApproval = {
  id: "APV-001",
  studioId: "default",
  gameId: "virus-hunter",
  specId: "MEC-001",
  kind: "mechanic-impl" as const,
  title: "Promote MEC-001 to impl",
  body: "Hold + cancel are wired.",
  requestedByHandle: "@mech-1",
  status: "pending" as const,
  createdAt: "2026-05-13T12:00:00Z",
  updatedAt: "2026-05-13T12:00:00Z",
  resolution: null,
};

describe("ApprovalsPanel", () => {
  it("renders an empty-state message when there are no approvals", async () => {
    mockGet({ studioId: "default", pendingCount: 0, approvals: [] });
    render(<ApprovalsPanel studioId="default" />);
    await waitFor(() =>
      expect(screen.getByText(/Nothing waiting on you/)).toBeInTheDocument(),
    );
  });

  it("renders pending approvals and shows the pending count", async () => {
    mockGet({
      studioId: "default",
      pendingCount: 1,
      approvals: [pendingApproval],
    });
    render(<ApprovalsPanel studioId="default" />);
    await waitFor(() =>
      expect(screen.getByText("Promote MEC-001 to impl")).toBeInTheDocument(),
    );
    expect(screen.getByText(/1 pending/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();
  });

  it("PATCHes on approve and calls onResolved", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetchSpy = vi.fn((url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (init?.method === "PATCH") {
        return Promise.resolve(jsonResponse({ ok: true }, 200));
      }
      return Promise.resolve(
        jsonResponse({
          studioId: "default",
          pendingCount: 1,
          approvals: [pendingApproval],
        }),
      );
    });
    vi.stubGlobal("fetch", fetchSpy);

    const onResolved = vi.fn();
    render(
      <ApprovalsPanel
        studioId="default"
        approverHandle="@director"
        onResolved={onResolved}
      />,
    );
    await screen.findByText("Promote MEC-001 to impl");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(onResolved).toHaveBeenCalled());
    const patch = calls.find((c) => c.init?.method === "PATCH");
    expect(patch?.url).toContain("/api/approvals/APV-001");
    const body = JSON.parse(String(patch?.init?.body ?? "{}")) as {
      status: string;
      approverHandle: string;
    };
    expect(body.status).toBe("approved");
    expect(body.approverHandle).toBe("@director");
  });

  it("surfaces a server error on a failed PATCH", async () => {
    const fetchSpy = vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve(
          jsonResponse({ error: "already resolved" }, 409),
        );
      }
      return Promise.resolve(
        jsonResponse({
          studioId: "default",
          pendingCount: 1,
          approvals: [pendingApproval],
        }),
      );
    });
    vi.stubGlobal("fetch", fetchSpy);

    render(<ApprovalsPanel studioId="default" />);
    await screen.findByText("Promote MEC-001 to impl");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Reject" }));
    await waitFor(() =>
      expect(screen.getByText(/already resolved/)).toBeInTheDocument(),
    );
  });

  it("invokes onPickSpec when the spec chip is clicked", async () => {
    mockGet({
      studioId: "default",
      pendingCount: 1,
      approvals: [pendingApproval],
    });
    const onPickSpec = vi.fn();
    render(<ApprovalsPanel studioId="default" onPickSpec={onPickSpec} />);
    const chip = await screen.findByRole("button", {
      name: /Open MEC-001 in tree/,
    });
    const user = userEvent.setup();
    await user.click(chip);
    expect(onPickSpec).toHaveBeenCalledWith("MEC-001");
  });

  it("shows a loading state before resolving the request", async () => {
    let resolveFn: (() => void) | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFn = () =>
              resolve(
                jsonResponse({
                  studioId: "default",
                  pendingCount: 0,
                  approvals: [],
                }),
              );
          }),
      ),
    );
    render(<ApprovalsPanel studioId="default" />);
    expect(screen.getByText(/Loading approvals/)).toBeInTheDocument();
    resolveFn?.();
    await waitFor(() =>
      expect(screen.queryByText(/Loading approvals/)).not.toBeInTheDocument(),
    );
  });
});
