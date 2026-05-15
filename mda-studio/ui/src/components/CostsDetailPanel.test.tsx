import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CostsDetailResponse } from "@mda-studio/shared";
import { CostsDetailPanel } from "./CostsDetailPanel";

function mockGet(body: CostsDetailResponse): void {
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

const payload: CostsDetailResponse = {
  gameId: "virus-hunter",
  generatedAt: "2026-05-14T12:00:00.000Z",
  scopeSpecId: null,
  totalMtdCents: 1500,
  orphanCents: 200,
  byLayer: [{ layer: "M", cents: 1500, specCount: 2 }],
  bySpec: [
    {
      specId: "MEC-001",
      layer: "M",
      title: "Revive interaction",
      ownCents: 1000,
      subtreeCents: 1200,
    },
    {
      specId: "MEC-002",
      layer: "M",
      title: "Downed state",
      ownCents: 500,
      subtreeCents: 500,
    },
  ],
  recentEvents: [
    {
      id: "COST-001",
      provider: "anthropic",
      model: "claude-opus-4-7",
      costCents: 142,
      occurredAt: "2026-05-14T11:00:00.000Z",
      billingCode: "MEC-001",
      agentId: null,
      issueId: null,
    },
  ],
};

describe("CostsDetailPanel", () => {
  it("renders header totals and layer rollup rows", async () => {
    mockGet(payload);
    render(<CostsDetailPanel gameId="virus-hunter" />);
    await waitFor(() =>
      expect(screen.getByText(/\$15\.00 MTD/)).toBeInTheDocument(),
    );
    expect(screen.getByText(/\$2\.00 unattributed/)).toBeInTheDocument();
    expect(screen.getByText("Mechanic")).toBeInTheDocument();
  });

  it("renders the top specs table with own and subtree columns", async () => {
    mockGet(payload);
    render(<CostsDetailPanel gameId="virus-hunter" onPickSpec={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText("Revive interaction")).toBeInTheDocument(),
    );
    expect(screen.getByText("Downed state")).toBeInTheDocument();
    // Two chips with the same label — one in top specs, one in recent events.
    expect(
      screen.getAllByRole("button", { name: /Open MEC-001 in tree/ }),
    ).toHaveLength(2);
  });

  it("invokes onPickSpec when the top-specs row chip is clicked", async () => {
    mockGet(payload);
    const onPickSpec = vi.fn();
    render(
      <CostsDetailPanel gameId="virus-hunter" onPickSpec={onPickSpec} />,
    );
    await waitFor(() =>
      expect(screen.getByText("Revive interaction")).toBeInTheDocument(),
    );
    const section = screen.getByLabelText("Top spec spend");
    const user = userEvent.setup();
    await user.click(
      within(section).getByRole("button", {
        name: /Open MEC-001 in tree/,
      }),
    );
    expect(onPickSpec).toHaveBeenCalledWith("MEC-001");
  });

  it("shows the scope chip when scopeSpecId is set", async () => {
    mockGet({ ...payload, scopeSpecId: "MEC-001" });
    const onClearScope = vi.fn();
    render(
      <CostsDetailPanel
        gameId="virus-hunter"
        scopeSpecId="MEC-001"
        onClearScope={onClearScope}
      />,
    );
    await screen.findByText(/Scope · MEC-001/);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /Clear cost scope/ }),
    );
    expect(onClearScope).toHaveBeenCalled();
  });

  it("renders an error state on a server failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(new Response("{}", { status: 500 })),
      ),
    );
    render(<CostsDetailPanel gameId="virus-hunter" />);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );
  });
});
