import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusGlyph } from "./StatusGlyph";

describe("StatusGlyph", () => {
  it("renders the frozen glyph with the Frozen label", () => {
    render(<StatusGlyph status="frozen" />);
    const el = screen.getByLabelText("Frozen");
    expect(el).toHaveTextContent("●");
  });

  it("renders the blockout glyph with its color token", () => {
    render(<StatusGlyph status="blockout" />);
    const el = screen.getByLabelText("Blockout");
    expect(el).toHaveTextContent("▣");
    expect(el.getAttribute("style") ?? "").toMatch(/--mda-status-blockout/);
  });
});
