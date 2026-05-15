import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GameCardGrid } from "./GameCardGrid";
import { fixtureGameCards } from "../fixtures/virus-hunter";

describe("GameCardGrid", () => {
  it("renders one button per card", () => {
    render(<GameCardGrid cards={fixtureGameCards} onOpen={() => {}} />);
    expect(screen.getByText("Virus Hunter")).toBeInTheDocument();
    expect(
      screen.getByText(/Co-op lab survival; revive each other/),
    ).toBeInTheDocument();
  });

  it("opens the game when a card is clicked", async () => {
    const onOpen = vi.fn();
    render(<GameCardGrid cards={fixtureGameCards} onOpen={onOpen} />);
    await userEvent.setup().click(screen.getByText("Virus Hunter"));
    expect(onOpen).toHaveBeenCalledWith("virus-hunter");
  });
});
