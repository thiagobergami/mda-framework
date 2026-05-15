import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

const HOME_URL = window.location.href;

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  window.history.replaceState(null, "", HOME_URL);
});

describe("App", () => {
  it("starts on the studio home with game cards", () => {
    render(<App />);
    expect(screen.getByLabelText("Change game")).toHaveTextContent("Pick a game");
    expect(screen.getByText("Virus Hunter")).toBeInTheDocument();
  });

  it("opens the spec tree when a game card is clicked", async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Virus Hunter"));
    await waitFor(() => expect(screen.getByRole("tree")).toBeInTheDocument());
    expect(screen.getByText("AES-001")).toBeInTheDocument();
  });

  it("shows the source badge indicating fixture fallback in tests", async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Virus Hunter"));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Tree source: local fixture"),
      ).toBeInTheDocument(),
    );
  });

  it("opens the NodeDrawer when a spec row is clicked", async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Virus Hunter"));
    await waitFor(() => expect(screen.getByRole("tree")).toBeInTheDocument());
    await user.click(screen.getByText("AES-001"));
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /AES-001 — Fellowship under pressure/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Spec" })).toBeInTheDocument();
  });

  it("closes the drawer when × is pressed", async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Virus Hunter"));
    await waitFor(() => expect(screen.getByRole("tree")).toBeInTheDocument());
    await user.click(screen.getByText("AES-001"));
    await user.click(screen.getByLabelText("Close detail drawer"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("typing in chrome search applies the q lens and filters the tree", async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Virus Hunter"));
    await waitFor(() => expect(screen.getByRole("tree")).toBeInTheDocument());

    const search = screen.getByLabelText("Search specs");
    await user.type(search, "revive interaction");
    // LensBar appears with a `text: …` chip.
    await waitFor(() =>
      expect(
        screen.getByText("text: revive interaction"),
      ).toBeInTheDocument(),
    );
    // MEC-001 is the only match; AES-002 should no longer be visible.
    await waitFor(() => expect(screen.queryByText("AES-002")).toBeNull());
    expect(screen.getByText("MEC-001")).toBeInTheDocument();
  });

  it("clicking a lens chip × removes the lens", async () => {
    window.history.replaceState(null, "", "/?game=virus-hunter&q=revive");
    render(<App />);
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("tree")).toBeInTheDocument());
    await user.click(screen.getByLabelText("Remove lens text: revive"));
    await waitFor(() =>
      expect(screen.queryByText(/of \d+ match/)).toBeNull(),
    );
  });

  it("⌘K opens the command palette", async () => {
    window.history.replaceState(null, "", "/?game=virus-hunter");
    render(<App />);
    await waitFor(() => expect(screen.getByRole("tree")).toBeInTheDocument());
    const user = userEvent.setup();
    await user.keyboard("{Meta>}k{/Meta}");
    expect(screen.getByLabelText("Palette query")).toBeInTheDocument();
  });

  it("? toggles the keymap help overlay", async () => {
    window.history.replaceState(null, "", "/?game=virus-hunter");
    render(<App />);
    await waitFor(() => expect(screen.getByRole("tree")).toBeInTheDocument());
    await userEvent.setup().keyboard("?");
    expect(
      screen.getByRole("dialog", { name: "Keyboard shortcuts" }),
    ).toBeInTheDocument();
  });
});
