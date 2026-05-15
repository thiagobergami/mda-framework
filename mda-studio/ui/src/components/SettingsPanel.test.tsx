import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPanel } from "./SettingsPanel";

describe("SettingsPanel", () => {
  it("renders the secrets tab by default", () => {
    render(<SettingsPanel />);
    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Secrets" }),
    ).toBeInTheDocument();
  });

  it("switches to the plugins tab when its tab button is clicked", async () => {
    render(<SettingsPanel />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Plugins" }));
    expect(
      screen.getByRole("heading", { name: "Plugins" }),
    ).toBeInTheDocument();
  });

  it("switches to the routines tab when its tab button is clicked", async () => {
    render(<SettingsPanel />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Routines" }));
    expect(
      screen.getByRole("heading", { name: "Routines" }),
    ).toBeInTheDocument();
  });
});
