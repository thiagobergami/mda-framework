import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LayerGlyph } from "./LayerGlyph";

describe("LayerGlyph", () => {
  it("renders the M glyph with the Mechanic label", () => {
    render(<LayerGlyph layer="M" />);
    const el = screen.getByLabelText("Mechanic");
    expect(el).toHaveTextContent("M");
    expect(el).toHaveAttribute("title", "Mechanic");
  });

  it("uses the layer's color token as background", () => {
    render(<LayerGlyph layer="AST" />);
    const el = screen.getByLabelText("Asset");
    expect(el.getAttribute("style") ?? "").toMatch(/--mda-layer-ast/);
  });
});
