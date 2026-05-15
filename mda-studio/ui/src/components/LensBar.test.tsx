import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EMPTY_LENSES } from "../lib/lenses";
import { LensBar } from "./LensBar";

describe("LensBar", () => {
  it("renders nothing when no lens is active", () => {
    const { container } = render(
      <LensBar
        lenses={EMPTY_LENSES}
        matchCount={10}
        totalCount={10}
        onClear={() => {}}
        onClearAll={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders one chip per active lens with match count", () => {
    render(
      <LensBar
        lenses={{
          agent: "mech-1",
          status: "draft",
          layer: "M",
          warnings: true,
          q: "revive",
        }}
        matchCount={3}
        totalCount={10}
        onClear={() => {}}
        onClearAll={() => {}}
      />,
    );
    expect(screen.getByText("3 of 10 match")).toBeInTheDocument();
    expect(screen.getByText("text: revive")).toBeInTheDocument();
    expect(screen.getByText("agent: @mech-1")).toBeInTheDocument();
    expect(screen.getByText("layer: M")).toBeInTheDocument();
    expect(screen.getByText("status: draft")).toBeInTheDocument();
    expect(screen.getByText("warnings only")).toBeInTheDocument();
  });

  it("invokes onClear with the lens key when its chip is clicked", async () => {
    const onClear = vi.fn();
    render(
      <LensBar
        lenses={{ ...EMPTY_LENSES, q: "revive" }}
        matchCount={1}
        totalCount={9}
        onClear={onClear}
        onClearAll={() => {}}
      />,
    );
    await userEvent
      .setup()
      .click(screen.getByLabelText("Remove lens text: revive"));
    expect(onClear).toHaveBeenCalledWith("q");
  });

  it("invokes onClearAll for the clear-all button", async () => {
    const onClearAll = vi.fn();
    render(
      <LensBar
        lenses={{ ...EMPTY_LENSES, layer: "A" }}
        matchCount={2}
        totalCount={9}
        onClear={() => {}}
        onClearAll={onClearAll}
      />,
    );
    await userEvent.setup().click(screen.getByText("clear all"));
    expect(onClearAll).toHaveBeenCalled();
  });
});
