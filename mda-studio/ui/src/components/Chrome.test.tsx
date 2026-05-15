import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Chrome } from "./Chrome";

describe("Chrome", () => {
  it("renders the studio and game selectors", () => {
    render(
      <Chrome
        studioName="Roblox Framework"
        gameName="Virus Hunter"
        pendingApprovals={0}
        onChangeGame={() => {}}
      />,
    );
    expect(screen.getByText(/Roblox Framework/)).toBeInTheDocument();
    expect(screen.getByText(/Virus Hunter/)).toBeInTheDocument();
  });

  it("calls onChangeGame when the game selector is clicked", async () => {
    const onChangeGame = vi.fn();
    render(
      <Chrome
        studioName="S"
        gameName="G"
        pendingApprovals={0}
        onChangeGame={onChangeGame}
      />,
    );
    await userEvent.setup().click(screen.getByLabelText("Change game"));
    expect(onChangeGame).toHaveBeenCalled();
  });

  it("pulses the approval badge when count > 0", () => {
    render(
      <Chrome
        studioName="S"
        gameName="G"
        pendingApprovals={3}
        onChangeGame={() => {}}
      />,
    );
    expect(screen.getByLabelText("3 pending approvals")).toHaveClass(
      "chrome__badge--pulse",
    );
  });

  it("calls onOpenApprovals when the badge is clicked", async () => {
    const onOpenApprovals = vi.fn();
    render(
      <Chrome
        studioName="S"
        gameName="G"
        pendingApprovals={2}
        onChangeGame={() => {}}
        onOpenApprovals={onOpenApprovals}
      />,
    );
    await userEvent.setup().click(screen.getByLabelText("2 pending approvals"));
    expect(onOpenApprovals).toHaveBeenCalled();
  });

  it("disables the badge button when onOpenApprovals is not provided", () => {
    render(
      <Chrome
        studioName="S"
        gameName="G"
        pendingApprovals={0}
        onChangeGame={() => {}}
      />,
    );
    expect(screen.getByLabelText("0 pending approvals")).toBeDisabled();
  });

  it("renders the Activity trigger when onOpenActivity is provided", async () => {
    const onOpenActivity = vi.fn();
    render(
      <Chrome
        studioName="S"
        gameName="G"
        pendingApprovals={0}
        onChangeGame={() => {}}
        onOpenActivity={onOpenActivity}
      />,
    );
    await userEvent.setup().click(screen.getByLabelText("Open activity log"));
    expect(onOpenActivity).toHaveBeenCalled();
  });

  it("omits the Activity trigger when no onOpenActivity is provided", () => {
    render(
      <Chrome
        studioName="S"
        gameName="G"
        pendingApprovals={0}
        onChangeGame={() => {}}
      />,
    );
    expect(screen.queryByLabelText("Open activity log")).toBeNull();
  });

  it("renders the secondary-surface nav buttons when their callbacks are set", async () => {
    const onOpenCosts = vi.fn();
    const onOpenOrg = vi.fn();
    const onOpenAssetPlans = vi.fn();
    const onOpenSettings = vi.fn();
    render(
      <Chrome
        studioName="S"
        gameName="G"
        pendingApprovals={0}
        onChangeGame={() => {}}
        onOpenCosts={onOpenCosts}
        onOpenOrg={onOpenOrg}
        onOpenAssetPlans={onOpenAssetPlans}
        onOpenSettings={onOpenSettings}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Open costs view"));
    await user.click(screen.getByLabelText("Open org view"));
    await user.click(screen.getByLabelText("Open asset plans view"));
    await user.click(screen.getByLabelText("Open settings view"));
    expect(onOpenCosts).toHaveBeenCalled();
    expect(onOpenOrg).toHaveBeenCalled();
    expect(onOpenAssetPlans).toHaveBeenCalled();
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it("marks the active view's nav button as pressed", () => {
    render(
      <Chrome
        studioName="S"
        gameName="G"
        pendingApprovals={0}
        onChangeGame={() => {}}
        onOpenCosts={() => {}}
        onOpenOrg={() => {}}
        activeView="costs"
      />,
    );
    expect(
      screen.getByLabelText("Open costs view"),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByLabelText("Open org view"),
    ).toHaveAttribute("aria-pressed", "false");
  });
});
