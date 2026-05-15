import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ActivityListResponse } from "@mda-studio/shared";
import { ActivitySlideout } from "./ActivitySlideout";

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
      id: "ACT-0002",
      studioId: "default",
      gameId: "virus-hunter",
      specId: "MEC-001",
      kind: "issue-status-changed",
      summary: "@mech-1 moved ISS-001 from todo to in_progress",
      actor: "@mech-1",
      createdAt: new Date(Date.now() - 60_000).toISOString(),
    },
    {
      id: "ACT-0001",
      studioId: "default",
      gameId: "virus-hunter",
      specId: null,
      kind: "validator-run-completed",
      summary: "Validator run VR-001 completed — 2 warnings",
      actor: null,
      createdAt: new Date(Date.now() - 120_000).toISOString(),
    },
  ],
};

describe("ActivitySlideout", () => {
  it("renders the activity entries newest-first", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse(validBody))),
    );
    render(
      <ActivitySlideout
        studioId="default"
        open
        onClose={() => {}}
      />,
    );
    await waitFor(() =>
      expect(
        screen.getByText(/@mech-1 moved ISS-001/),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/Validator run VR-001 completed/),
    ).toBeInTheDocument();
  });

  it("returns null when closed", () => {
    const { container } = render(
      <ActivitySlideout
        studioId="default"
        open={false}
        onClose={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onClose when the × button is clicked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse(validBody))),
    );
    const onClose = vi.fn();
    render(
      <ActivitySlideout
        studioId="default"
        open
        onClose={onClose}
      />,
    );
    await userEvent
      .setup()
      .click(screen.getByLabelText("Close activity panel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("invokes onPickSpec when the spec chip is clicked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse(validBody))),
    );
    const onPickSpec = vi.fn();
    render(
      <ActivitySlideout
        studioId="default"
        open
        onClose={() => {}}
        onPickSpec={onPickSpec}
      />,
    );
    const chip = await screen.findByRole("button", {
      name: /Open MEC-001 in tree/,
    });
    await userEvent.setup().click(chip);
    expect(onPickSpec).toHaveBeenCalledWith("MEC-001");
  });

  it("shows an empty-state when the log is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({ studioId: "default", entries: [] }),
        ),
      ),
    );
    render(
      <ActivitySlideout
        studioId="default"
        open
        onClose={() => {}}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText(/No activity yet/)).toBeInTheDocument(),
    );
  });
});
