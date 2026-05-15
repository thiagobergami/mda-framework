import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { IssueSummary } from "@mda-studio/shared";
import { IssueMiniList } from "./IssueMiniList";

function issue(overrides: Partial<IssueSummary> = {}): IssueSummary {
  return {
    id: "ISS-001",
    gameId: "g",
    specId: "MEC-001",
    title: "Implement revive interaction",
    status: "todo",
    priority: "high",
    assigneeAgentId: "a-3",
    assigneeAgentHandle: "@mech-1",
    createdAt: "2026-05-12T00:00:00.000Z",
    updatedAt: "2026-05-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("IssueMiniList", () => {
  it("renders an empty message when no issues are passed", () => {
    render(<IssueMiniList issues={[]} />);
    expect(
      screen.getByText("No issues linked to this spec yet."),
    ).toBeInTheDocument();
  });

  it("renders issue id, title, and assignee", () => {
    render(<IssueMiniList issues={[issue()]} />);
    expect(screen.getByText("ISS-001")).toBeInTheDocument();
    expect(
      screen.getByText("Implement revive interaction"),
    ).toBeInTheDocument();
    expect(screen.getByText("@mech-1")).toBeInTheDocument();
  });

  it("only enables legal next statuses in the dropdown", () => {
    render(<IssueMiniList issues={[issue({ status: "todo" })]} />);
    const select = screen.getByRole("combobox", {
      name: "Change status of ISS-001",
    });
    const options = Array.from(select.querySelectorAll("option"));
    const enabled = options
      .filter((o) => !(o as HTMLOptionElement).disabled)
      .map((o) => (o as HTMLOptionElement).value);
    expect(enabled.sort()).toEqual(
      ["blocked", "cancelled", "in_progress", "todo"].sort(),
    );
  });

  it("PATCHes /api/issues/:id and calls onStatusChanged on success", async () => {
    const onStatusChanged = vi.fn();
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <IssueMiniList
        issues={[issue({ status: "todo" })]}
        onStatusChanged={onStatusChanged}
      />,
    );
    const select = screen.getByRole("combobox", {
      name: "Change status of ISS-001",
    });
    await userEvent.setup().selectOptions(select, "in_progress");
    await waitFor(() => expect(onStatusChanged).toHaveBeenCalledWith("ISS-001"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/issues/ISS-001",
      expect.objectContaining({
        method: "PATCH",
      }),
    );
  });

  it("reverts and surfaces an error when PATCH fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ error: "illegal_transition" }),
            { status: 409 },
          ),
        ),
      ),
    );
    render(<IssueMiniList issues={[issue({ status: "todo" })]} />);
    const select = screen.getByRole("combobox", {
      name: "Change status of ISS-001",
    }) as HTMLSelectElement;
    await userEvent.setup().selectOptions(select, "in_progress");
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "illegal_transition",
      ),
    );
    expect(select.value).toBe("todo");
  });

  it("disables the dropdown for terminal statuses", () => {
    render(<IssueMiniList issues={[issue({ status: "done" })]} />);
    const select = screen.getByRole("combobox", {
      name: "Change status of ISS-001",
    }) as HTMLSelectElement;
    expect(select.disabled).toBe(true);
  });
});
