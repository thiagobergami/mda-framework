import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyTreeCta } from "./EmptyTreeCta";

describe("EmptyTreeCta", () => {
  it("names the concept and shows the mda new aes command", () => {
    render(<EmptyTreeCta conceptTitle="Virus Hunter" />);
    expect(
      screen.getByText(/No specs yet for Virus Hunter/),
    ).toBeInTheDocument();
    expect(screen.getByText(/mda new aes/)).toBeInTheDocument();
  });

  it("has an accessible status role for screen readers", () => {
    render(<EmptyTreeCta conceptTitle="X" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
