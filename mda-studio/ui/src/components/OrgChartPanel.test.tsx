import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { AgentRosterResponse } from "@mda-studio/shared";
import { OrgChartPanel } from "./OrgChartPanel";

function mockGet(body: AgentRosterResponse): void {
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

const roster: AgentRosterResponse = {
  gameId: "virus-hunter",
  generatedAt: "2026-05-14T12:00:00.000Z",
  agents: [
    {
      agentId: "a-aes",
      handle: "@aes-1",
      primaryLayer: "A",
      activeIssueCount: 1,
      completedIssueCount: 0,
      totalIssueCount: 1,
    },
    {
      agentId: "a-mech",
      handle: "@mech-1",
      primaryLayer: "M",
      activeIssueCount: 2,
      completedIssueCount: 1,
      totalIssueCount: 3,
    },
    {
      agentId: "a-dir",
      handle: "@director",
      primaryLayer: null,
      activeIssueCount: 0,
      completedIssueCount: 0,
      totalIssueCount: 0,
    },
  ],
};

describe("OrgChartPanel", () => {
  it("groups agents under their primary layer", async () => {
    mockGet(roster);
    render(<OrgChartPanel gameId="virus-hunter" />);
    await waitFor(() =>
      expect(screen.getByText("Aesthetic")).toBeInTheDocument(),
    );
    expect(screen.getByText("Mechanic")).toBeInTheDocument();
    expect(screen.getByText("@mech-1")).toBeInTheDocument();
    expect(screen.getByText("@aes-1")).toBeInTheDocument();
  });

  it("renders an uncategorized group for agents with no observed layer", async () => {
    mockGet(roster);
    render(<OrgChartPanel gameId="virus-hunter" />);
    await waitFor(() =>
      expect(screen.getByText("Uncategorized")).toBeInTheDocument(),
    );
    expect(screen.getByText("@director")).toBeInTheDocument();
  });

  it("renders an empty-state message when the roster is empty", async () => {
    mockGet({ ...roster, agents: [] });
    render(<OrgChartPanel gameId="virus-hunter" />);
    await waitFor(() =>
      expect(
        screen.getByText(/No agents have been assigned issues yet/),
      ).toBeInTheDocument(),
    );
  });

  it("renders an error state on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(new Response("{}", { status: 500 })),
      ),
    );
    render(<OrgChartPanel gameId="virus-hunter" />);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );
  });
});
