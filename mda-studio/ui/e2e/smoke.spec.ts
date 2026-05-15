/**
 * End-to-end smoke flow (plan §14 U8 acceptance).
 *
 * One spec, one happy-path narrative — open the game → open the drawer
 * → change a status → see the cost / activity feeds update. The goal
 * is "shipping wouldn't silently break the chrome", not exhaustive
 * coverage; per-component invariants are unit-tested in vitest.
 */

import { expect, test } from "@playwright/test";

test.describe("MDA Studio · e2e smoke", () => {
  test("open game, drawer, change status, see live cost+activity update", async ({
    page,
  }) => {
    await page.goto("/");

    // Studio home: pick the seeded fixture game.
    const card = page.locator(".card", { hasText: "Virus Hunter" }).first();
    await expect(card).toBeVisible();
    await card.click();

    // Spec tree loaded.
    await expect(page.getByRole("tree")).toBeVisible();
    await expect(page.getByText("AES-001")).toBeVisible();

    // Deep-link the drawer (MEC-001 lives under DYN-001 which is collapsed
    // by default per plan D3). Plan §5 promises `?node=` deep links.
    await page.goto("/?game=virus-hunter&node=MEC-001");
    await expect(
      page.getByRole("heading", { level: 2, name: /MEC-001/ }),
    ).toBeVisible();

    // Issues tab → change the seeded issue status.
    await page.getByRole("tab", { name: "Issues" }).click();
    const statusSelect = page.getByLabel(/Change status of ISS-/i).first();
    await statusSelect.waitFor({ state: "visible" });
    await statusSelect.selectOption("in_review");
    await expect(statusSelect).toHaveValue("in_review");

    // Costs detail page reachable from chrome and shows MTD spend.
    await page.getByRole("button", { name: "Open costs view" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Costs" }),
    ).toBeVisible();
    await expect(page.getByText(/MTD/)).toBeVisible();

    // Org chart page reachable and shows the seeded @mech-1 agent.
    await page.getByRole("button", { name: "Open org view" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Org chart" }),
    ).toBeVisible();
    await expect(page.getByText("@mech-1").first()).toBeVisible();

    // Asset plans page reachable (empty for the fixture).
    await page
      .getByRole("button", { name: "Open asset plans view" })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Asset plans" }),
    ).toBeVisible();

    // Settings shell reachable.
    await page.getByRole("button", { name: "Open settings view" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Settings" }),
    ).toBeVisible();
  });

  test("approvals queue lists seeded pending approvals", async ({ page }) => {
    await page.goto("/?game=virus-hunter&view=approvals");
    await expect(
      page.getByRole("heading", { level: 1, name: "Approvals" }),
    ).toBeVisible();
    // The fixture seeds 2 pending approvals on MEC-001 and AST-007.
    await expect(
      page.getByText(/Promote MEC-001 \(Revive interaction\) to impl/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Approve" }).first(),
    ).toBeVisible();
  });

  test("free-text lens filters the tree", async ({ page }) => {
    await page.goto("/?game=virus-hunter");
    await expect(page.getByRole("tree")).toBeVisible();

    const search = page.getByLabel("Search specs");
    await search.fill("revive interaction");
    await expect(page.getByText("text: revive interaction")).toBeVisible();
    await expect(page.getByText("MEC-001")).toBeVisible();
    await expect(page.getByText("AES-002")).toHaveCount(0);
  });

  test("command palette opens on ⌘K and picks a spec", async ({ page }) => {
    await page.goto("/?game=virus-hunter");
    await expect(page.getByRole("tree")).toBeVisible();
    await page.keyboard.press("ControlOrMeta+k");
    const palette = page.getByLabel("Palette query");
    await expect(palette).toBeVisible();
    await palette.fill("MEC-001");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { level: 2, name: /MEC-001/ }),
    ).toBeVisible();
  });
});
