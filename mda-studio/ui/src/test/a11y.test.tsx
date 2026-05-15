/**
 * Accessibility smoke tests (plan §13, §15, §14 acceptance criterion 7).
 *
 * For each surface, we render with realistic fixture data and run
 * axe-core against the rendered DOM. Violations fail the test — the
 * goal is to catch role/label/contrast regressions before they ship.
 *
 * Axe is intentionally noisy. We allow-list a tiny set of "we know"
 * checks (e.g. the focusable list-items inside `role="tree"`) via the
 * `rules` option, but keep the default WCAG 2.1 AA ruleset otherwise.
 */

import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe, type RunOptions } from "vitest-axe";
import type {
  AgentRosterResponse,
  ApprovalListResponse,
  AssetPlanListResponse,
  CostsDetailResponse,
} from "@mda-studio/shared";
import { ApprovalsPanel } from "../components/ApprovalsPanel";
import { AssetPlansPanel } from "../components/AssetPlansPanel";
import { Chrome } from "../components/Chrome";
import { CostsDetailPanel } from "../components/CostsDetailPanel";
import { KeymapHelp } from "../components/KeymapHelp";
import { OrgChartPanel } from "../components/OrgChartPanel";
import { SettingsPanel } from "../components/SettingsPanel";
import { SpecTree } from "../components/SpecTree";
import { virusHunterTree } from "../fixtures/virus-hunter";

/**
 * vitest-axe's typings declare `toHaveNoViolations()` on its own matcher
 * type, not on the Vitest `Assertion<T>` interface that gets inferred at
 * call sites. We extend `expect` in `test/setup.ts`, so the assertion
 * exists at runtime; cast through `unknown` to keep callers terse.
 */
function expectNoA11yViolations(results: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (expect(results) as any).toHaveNoViolations();
}

/**
 * Component-test-friendly axe options:
 *   - `region` is a best-practice rule that wants every node inside a
 *     landmark (`<main>`, `<nav>`, etc.). We render panels in isolation
 *     so they cannot satisfy it; the App composition test would, but
 *     that's outside the scope here.
 *   - `color-contrast` needs real layout / computed styles which jsdom
 *     can't provide, so it false-positives on every chip.
 */
const AXE_OPTIONS: RunOptions = {
  rules: {
    region: { enabled: false },
    "color-contrast": { enabled: false },
  },
};

function mockGet(body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    ),
  );
}

describe("a11y · static components", () => {
  it("Chrome renders without violations", async () => {
    const { container } = render(
      <Chrome
        studioName="Roblox Framework"
        gameName="Virus Hunter"
        pendingApprovals={2}
        onChangeGame={() => {}}
        onOpenApprovals={() => {}}
        onOpenActivity={() => {}}
        onOpenCosts={() => {}}
        onOpenOrg={() => {}}
        onOpenAssetPlans={() => {}}
        onOpenSettings={() => {}}
      />,
    );
    expectNoA11yViolations(await axe(container, AXE_OPTIONS));
  });

  it("SpecTree renders without violations", async () => {
    const { container } = render(
      <SpecTree
        nodes={virusHunterTree.nodes}
        selectedSpecId="MEC-001"
        onSelect={() => {}}
      />,
    );
    expectNoA11yViolations(await axe(container, AXE_OPTIONS));
  });

  it("KeymapHelp renders without violations", async () => {
    const { container } = render(
      <KeymapHelp open onClose={() => {}} />,
    );
    expectNoA11yViolations(await axe(container, AXE_OPTIONS));
  });

  it("SettingsPanel renders without violations", async () => {
    const { container } = render(<SettingsPanel />);
    expectNoA11yViolations(await axe(container, AXE_OPTIONS));
  });
});

describe("a11y · data-driven panels", () => {
  it("ApprovalsPanel renders without violations", async () => {
    const body: ApprovalListResponse = {
      studioId: "default",
      pendingCount: 1,
      approvals: [
        {
          id: "APV-001",
          studioId: "default",
          gameId: "virus-hunter",
          specId: "MEC-001",
          kind: "mechanic-impl",
          title: "Promote MEC-001",
          body: "Hold + cancel wired.",
          requestedByHandle: "@mech-1",
          status: "pending",
          createdAt: "2026-05-13T12:00:00Z",
          updatedAt: "2026-05-13T12:00:00Z",
          resolution: null,
        },
      ],
    };
    mockGet(body);
    const { container, findByText } = render(
      <ApprovalsPanel studioId="default" />,
    );
    await findByText("Promote MEC-001");
    expectNoA11yViolations(await axe(container, AXE_OPTIONS));
  });

  it("CostsDetailPanel renders without violations", async () => {
    const body: CostsDetailResponse = {
      gameId: "virus-hunter",
      generatedAt: "2026-05-14T12:00:00.000Z",
      scopeSpecId: null,
      totalMtdCents: 1234,
      orphanCents: 56,
      byLayer: [{ layer: "M", cents: 1234, specCount: 1 }],
      bySpec: [
        {
          specId: "MEC-001",
          layer: "M",
          title: "Revive interaction",
          ownCents: 1234,
          subtreeCents: 1234,
        },
      ],
      recentEvents: [
        {
          id: "COST-001",
          provider: "anthropic",
          model: "claude-opus-4-7",
          costCents: 142,
          occurredAt: "2026-05-14T11:00:00.000Z",
          billingCode: "MEC-001",
          agentId: null,
          issueId: null,
        },
      ],
    };
    mockGet(body);
    const { container, findByText } = render(
      <CostsDetailPanel gameId="virus-hunter" onPickSpec={() => {}} />,
    );
    await findByText("Revive interaction");
    expectNoA11yViolations(await axe(container, AXE_OPTIONS));
  });

  it("OrgChartPanel renders without violations", async () => {
    const body: AgentRosterResponse = {
      gameId: "virus-hunter",
      generatedAt: "2026-05-14T12:00:00.000Z",
      agents: [
        {
          agentId: "a-mech",
          handle: "@mech-1",
          primaryLayer: "M",
          activeIssueCount: 2,
          completedIssueCount: 1,
          totalIssueCount: 3,
        },
      ],
    };
    mockGet(body);
    const { container, findByText } = render(
      <OrgChartPanel gameId="virus-hunter" />,
    );
    await findByText("@mech-1");
    expectNoA11yViolations(await axe(container, AXE_OPTIONS));
  });

  it("AssetPlansPanel renders without violations", async () => {
    const body: AssetPlanListResponse = {
      gameId: "virus-hunter",
      generatedAt: "2026-05-14T12:00:00.000Z",
      rootPath: "design/asset-plans",
      entries: [
        {
          assetId: "revive-vfx",
          latestPlanVersion: 1,
          latestPlanFile: "design/asset-plans/revive-vfx/revive-vfx.v1.plan.md",
          state: "planned",
          artifactCount: 0,
          refsCount: 1,
        },
      ],
    };
    mockGet(body);
    const { container, findByText } = render(
      <AssetPlansPanel gameId="virus-hunter" />,
    );
    await findByText("revive-vfx");
    expectNoA11yViolations(await axe(container, AXE_OPTIONS));
  });
});
