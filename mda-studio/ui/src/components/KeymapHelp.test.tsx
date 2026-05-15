import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KeymapHelp } from "./KeymapHelp";

describe("KeymapHelp", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<KeymapHelp open={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a row for each shortcut when open", () => {
    render(<KeymapHelp open={true} onClose={() => {}} />);
    expect(screen.getByText("⌘K / Ctrl+K")).toBeInTheDocument();
    expect(screen.getByText("Open command palette")).toBeInTheDocument();
    expect(screen.getByText("Focus search")).toBeInTheDocument();
  });

  it("invokes onClose when the close button is pressed", async () => {
    const onClose = vi.fn();
    render(<KeymapHelp open={true} onClose={onClose} />);
    await userEvent.setup().click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalled();
  });
});
