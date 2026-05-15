import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpecTree } from "./SpecTree";
import { virusHunterTree } from "../fixtures/virus-hunter";

describe("SpecTree", () => {
  it("renders an ARIA tree with the AES roots visible", () => {
    render(
      <SpecTree
        nodes={virusHunterTree.nodes}
        selectedSpecId={null}
        onSelect={() => {}}
      />,
    );
    const tree = screen.getByRole("tree");
    expect(within(tree).getByText("AES-001")).toBeInTheDocument();
    expect(within(tree).getByText("AES-002")).toBeInTheDocument();
    expect(within(tree).getByText("tutorial-lab")).toBeInTheDocument();
  });

  it("invokes onSelect when a row is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <SpecTree
        nodes={virusHunterTree.nodes}
        selectedSpecId={null}
        onSelect={onSelect}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByText("AES-001"));
    expect(onSelect).toHaveBeenCalledWith("AES-001");
  });

  it("expands the AES-001 subtree by default (DYN-001 visible)", () => {
    render(
      <SpecTree
        nodes={virusHunterTree.nodes}
        selectedSpecId={null}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText("DYN-001")).toBeInTheDocument();
  });

  it("collapses and re-expands a row on disclosure click", async () => {
    render(
      <SpecTree
        nodes={virusHunterTree.nodes}
        selectedSpecId={null}
        onSelect={() => {}}
      />,
    );
    const user = userEvent.setup();
    // DYN-001 starts collapsed (layer D not in DEFAULT_EXPANDED_LAYERS),
    // so MEC-001 is not visible yet.
    expect(screen.queryByText("MEC-001")).toBeNull();

    // Find DYN-001's disclosure triangle and click it.
    const dyn001 = screen.getByText("DYN-001").closest(".tree-row");
    expect(dyn001).not.toBeNull();
    const triangle = dyn001!.querySelector(".tree-row__disclosure");
    expect(triangle).not.toBeNull();
    await user.click(triangle as Element);

    expect(screen.getByText("MEC-001")).toBeInTheDocument();
  });

  it("shows an 'also serves' chip on multi-parent nodes (MEC-003)", async () => {
    render(
      <SpecTree
        nodes={virusHunterTree.nodes}
        selectedSpecId={null}
        onSelect={() => {}}
      />,
    );
    // DYN-002 is collapsed by default; expand it to reveal MEC-003.
    const dyn002 = screen.getByText("DYN-002").closest(".tree-row");
    expect(dyn002).not.toBeNull();
    const triangle = dyn002!.querySelector(".tree-row__disclosure");
    expect(triangle).not.toBeNull();
    const user = userEvent.setup();
    await user.click(triangle as Element);
    expect(screen.getByText("also serves 2")).toBeInTheDocument();
  });
});
