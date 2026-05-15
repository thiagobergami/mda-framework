import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SpecNodeDetail } from "@mda-studio/shared";
import { NodeDrawer } from "./NodeDrawer";
import { virusHunterTree } from "../fixtures/virus-hunter";

function detail(specId: string): SpecNodeDetail {
  const node = virusHunterTree.nodes.find((n) => n.specId === specId)!;
  const upward = (() => {
    const trail: typeof node[] = [];
    let cursor: typeof node | undefined = node;
    while (cursor?.canonicalParentSpecId) {
      const parent = virusHunterTree.nodes.find(
        (n) => n.specId === cursor!.canonicalParentSpecId,
      );
      if (!parent) break;
      trail.unshift(parent);
      cursor = parent;
    }
    return trail.map((n) => ({
      specId: n.specId,
      layer: n.layer,
      title: n.title,
    }));
  })();
  return {
    node,
    spec: {
      path: `specs/${specId}.md`,
      frontmatter: {},
      body: `# ${specId} — ${node.title}\n\nBody text for ${specId}.`,
    },
    issues: [],
    recentComments: [],
    workProducts: [],
    costsMtd: { own: 0, subtree: 0, byBillingCode: [] },
    warnings: [],
    trace: {
      upward,
      secondaryParents: node.secondaryParentSpecIds.map((id) => {
        const n = virusHunterTree.nodes.find((nn) => nn.specId === id)!;
        return { specId: n.specId, layer: n.layer, title: n.title };
      }),
      outgoingRefs: [],
    },
  };
}

describe("NodeDrawer", () => {
  it("renders the spec id and title in the heading", () => {
    render(
      <NodeDrawer
        detail={detail("MEC-001")}
        onClose={() => {}}
        onSelect={() => {}}
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /MEC-001 — Revive interaction/,
      }),
    ).toBeInTheDocument();
  });

  it("renders the spec body as markdown (h1 element present)", () => {
    render(
      <NodeDrawer
        detail={detail("MEC-001")}
        onClose={() => {}}
        onSelect={() => {}}
      />,
    );
    // h1 from markdown rendering
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /MEC-001 — Revive interaction/,
      }),
    ).toBeInTheDocument();
  });

  it("switches to the Trace tab and shows the canonical path", async () => {
    render(
      <NodeDrawer
        detail={detail("MEC-001")}
        onClose={() => {}}
        onSelect={() => {}}
      />,
    );
    await userEvent.setup().click(screen.getByRole("tab", { name: "Trace" }));
    expect(
      screen.getByText("Canonical path from the studio root:"),
    ).toBeInTheDocument();
  });

  it("invokes onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    render(
      <NodeDrawer
        detail={detail("AES-001")}
        onClose={onClose}
        onSelect={() => {}}
      />,
    );
    await userEvent.setup().click(screen.getByLabelText("Close detail drawer"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the multi-parent 'Also serves' list on the Trace tab for MEC-003", async () => {
    render(
      <NodeDrawer
        detail={detail("MEC-003")}
        onClose={() => {}}
        onSelect={() => {}}
      />,
    );
    await userEvent.setup().click(screen.getByRole("tab", { name: "Trace" }));
    expect(screen.getByText("Also serves:")).toBeInTheDocument();
    expect(screen.getByText(/DYN-001 — Co-op revive loop/)).toBeInTheDocument();
  });

  it("Comments tab shows an empty state when there are no comments", async () => {
    render(
      <NodeDrawer
        detail={detail("MEC-001")}
        onClose={() => {}}
        onSelect={() => {}}
      />,
    );
    await userEvent
      .setup()
      .click(screen.getByRole("tab", { name: "Comments" }));
    expect(screen.getByText("No recent comments.")).toBeInTheDocument();
  });

  it("Comments tab renders a comment when present", async () => {
    const base = detail("MEC-001");
    const withComment = {
      ...base,
      recentComments: [
        {
          id: "CMT-001",
          issueId: "ISS-001",
          authorHandle: "@mech-1",
          body: "starting on hold-progress",
          createdAt: "2026-05-12T01:00:00.000Z",
        },
      ],
    };
    render(
      <NodeDrawer
        detail={withComment}
        onClose={() => {}}
        onSelect={() => {}}
      />,
    );
    await userEvent
      .setup()
      .click(screen.getByRole("tab", { name: "Comments" }));
    expect(screen.getByText("starting on hold-progress")).toBeInTheDocument();
  });

  it("Work products tab handles both empty and populated cases", async () => {
    const base = detail("MEC-001");
    const withWp = {
      ...base,
      workProducts: [
        {
          id: "WP-001",
          issueId: "ISS-001",
          kind: "report" as const,
          label: "mda validate — passing",
          href: null,
          createdAt: "2026-05-12T01:00:00.000Z",
        },
      ],
    };
    const user = userEvent.setup();
    const { rerender } = render(
      <NodeDrawer
        detail={base}
        onClose={() => {}}
        onSelect={() => {}}
      />,
    );
    await user.click(screen.getByRole("tab", { name: "Work products" }));
    expect(screen.getByText("No work products yet.")).toBeInTheDocument();

    rerender(
      <NodeDrawer
        detail={withWp}
        onClose={() => {}}
        onSelect={() => {}}
      />,
    );
    expect(
      screen.getByText("mda validate — passing"),
    ).toBeInTheDocument();
  });

  it("Costs tab shows own/subtree and byBillingCode breakdown", async () => {
    const base = detail("MEC-001");
    const withCosts = {
      ...base,
      costsMtd: {
        own: 1160,
        subtree: 1480,
        byBillingCode: [{ billingCode: "MEC-001", cents: 1160 }],
      },
    };
    render(
      <NodeDrawer
        detail={withCosts}
        onClose={() => {}}
        onSelect={() => {}}
      />,
    );
    await userEvent.setup().click(screen.getByRole("tab", { name: "Costs" }));
    expect(screen.getByText(/Own MTD:/)).toHaveTextContent("$11.60");
    expect(screen.getByText(/Subtree MTD:/)).toHaveTextContent("$14.80");
    expect(screen.getByText(/By billing code:/)).toBeInTheDocument();
    expect(screen.getByText(/MEC-001 — \$11.60/)).toBeInTheDocument();
  });
});
