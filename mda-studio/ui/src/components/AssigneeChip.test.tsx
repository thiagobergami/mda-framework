import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssigneeChip } from "./AssigneeChip";

describe("AssigneeChip", () => {
  it("shows handle with a running run-status dot", () => {
    render(<AssigneeChip handle="@mech-1" runStatus="running" />);
    expect(screen.getByText("@mech-1")).toBeInTheDocument();
    expect(screen.getByTestId("run-dot")).toHaveAttribute(
      "data-run-status",
      "running",
    );
  });

  it("includes a label describing the run state", () => {
    render(<AssigneeChip handle="@dyn-1" runStatus="paused" />);
    expect(screen.getByLabelText("@dyn-1 — Paused")).toBeInTheDocument();
  });

  it("omits the dot entirely when runStatus is null", () => {
    render(<AssigneeChip handle="@asset" runStatus={null} />);
    expect(screen.queryByTestId("run-dot")).toBeNull();
  });
});
