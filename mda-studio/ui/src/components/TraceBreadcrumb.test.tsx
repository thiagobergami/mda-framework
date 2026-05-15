import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TraceBreadcrumb } from "./TraceBreadcrumb";
import { virusHunterTree } from "../fixtures/virus-hunter";
import { upwardTrace } from "./spec-tree-utils";

describe("TraceBreadcrumb", () => {
  it("renders the studio / ancestors / current chain", () => {
    const trail = upwardTrace(virusHunterTree.nodes, "MEC-001");
    const current = virusHunterTree.nodes.find((n) => n.specId === "MEC-001")!;
    render(
      <TraceBreadcrumb trail={trail} current={current} onSelect={() => {}} />,
    );
    expect(screen.getByText("studio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AES-001" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "DYN-001" })).toBeInTheDocument();
    expect(
      screen
        .getAllByText("MEC-001")
        .some((el) => el.className.includes("--current")),
    ).toBe(true);
  });

  it("clicking an ancestor calls onSelect with that specId", async () => {
    const trail = upwardTrace(virusHunterTree.nodes, "MEC-001");
    const current = virusHunterTree.nodes.find((n) => n.specId === "MEC-001")!;
    const onSelect = vi.fn();
    render(
      <TraceBreadcrumb trail={trail} current={current} onSelect={onSelect} />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "DYN-001" }));
    expect(onSelect).toHaveBeenCalledWith("DYN-001");
  });
});
