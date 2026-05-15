import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WarnBadge } from "./WarnBadge";

describe("WarnBadge", () => {
  it("renders nothing for a zero count", () => {
    const { container } = render(<WarnBadge count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the count with a pluralized label", () => {
    render(<WarnBadge count={3} />);
    expect(screen.getByText("⚠ 3")).toBeInTheDocument();
    expect(screen.getByLabelText("3 validator warnings")).toBeInTheDocument();
  });

  it("uses singular label for count of 1", () => {
    render(<WarnBadge count={1} />);
    expect(screen.getByLabelText("1 validator warning")).toBeInTheDocument();
  });
});
