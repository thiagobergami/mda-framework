import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CostChip } from "./CostChip";

describe("CostChip", () => {
  it("renders subtree total and tooltip with own cost", () => {
    render(<CostChip cents={4_120} ownCents={812} />);
    const el = screen.getByText("$41.20");
    expect(el).toHaveAttribute(
      "title",
      "MTD subtree $41.20 — own $8.12",
    );
  });

  it("falls back to a single MTD tooltip when own is omitted", () => {
    render(<CostChip cents={1_234_500} />);
    const el = screen.getByText("$12.3k");
    expect(el).toHaveAttribute("title", "MTD $12.3k");
  });
});
