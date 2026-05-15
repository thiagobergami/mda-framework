import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "./CommandPalette";
import { virusHunterTree } from "../fixtures/virus-hunter";

describe("CommandPalette", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <CommandPalette
        open={false}
        nodes={virusHunterTree.nodes}
        onClose={() => {}}
        onPickSpec={() => {}}
        onPickAgent={() => {}}
        onPickIssue={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("filters results by substring", async () => {
    render(
      <CommandPalette
        open={true}
        nodes={virusHunterTree.nodes}
        onClose={() => {}}
        onPickSpec={() => {}}
        onPickAgent={() => {}}
        onPickIssue={() => {}}
      />,
    );
    const input = screen.getByLabelText("Palette query");
    await userEvent.setup().type(input, "revive");
    // MEC-001 appears in both the spec row and the linked issue row.
    expect(screen.getAllByText("MEC-001").length).toBeGreaterThan(0);
  });

  it("Enter activates the highlighted spec", async () => {
    const onPickSpec = vi.fn();
    const onClose = vi.fn();
    render(
      <CommandPalette
        open={true}
        nodes={virusHunterTree.nodes}
        onClose={onClose}
        onPickSpec={onPickSpec}
        onPickAgent={() => {}}
        onPickIssue={() => {}}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Palette query"), "AES-001");
    await user.keyboard("{Enter}");
    expect(onPickSpec).toHaveBeenCalledWith("AES-001");
    expect(onClose).toHaveBeenCalled();
  });

  it("Escape closes without picking", async () => {
    const onClose = vi.fn();
    const onPickSpec = vi.fn();
    render(
      <CommandPalette
        open={true}
        nodes={virusHunterTree.nodes}
        onClose={onClose}
        onPickSpec={onPickSpec}
        onPickAgent={() => {}}
        onPickIssue={() => {}}
      />,
    );
    await userEvent.setup().keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
    expect(onPickSpec).not.toHaveBeenCalled();
  });

  it("Picks an agent when an agent row is activated", async () => {
    const onPickAgent = vi.fn();
    render(
      <CommandPalette
        open={true}
        nodes={virusHunterTree.nodes}
        onClose={() => {}}
        onPickSpec={() => {}}
        onPickAgent={onPickAgent}
        onPickIssue={() => {}}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Palette query"), "mech-1");
    await user.keyboard("{Enter}");
    expect(onPickAgent).toHaveBeenCalledWith("mech-1");
  });

  it("ArrowDown moves the highlight", async () => {
    render(
      <CommandPalette
        open={true}
        nodes={virusHunterTree.nodes}
        onClose={() => {}}
        onPickSpec={() => {}}
        onPickAgent={() => {}}
        onPickIssue={() => {}}
      />,
    );
    const user = userEvent.setup();
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}");
    const after = screen.getAllByRole("option");
    expect(after[1]).toHaveAttribute("aria-selected", "true");
  });
});
