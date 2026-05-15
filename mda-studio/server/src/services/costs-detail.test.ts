import { describe, expect, it } from "vitest";
import type { CostEvent } from "@mda-studio/shared";
import { buildCostsDetail } from "./costs-detail";
import { computeCostRollup } from "./cost-rollup";
import type { ParsedSpec } from "./spec-parser";

function spec(
  specId: string,
  canonical: string | null,
  layer: ParsedSpec["layer"] = "M",
  title = specId,
): ParsedSpec {
  return {
    specId,
    layer,
    title,
    status: "draft",
    canonicalParentSpecId: canonical,
    secondaryParentSpecIds: [],
    outgoingRefSpecIds: [],
    sourcePath: `specs/x/${specId}.md`,
  };
}

function event(
  id: string,
  billingCode: string | null,
  costCents: number,
  occurredAt = new Date().toISOString(),
): CostEvent {
  return {
    id,
    studioId: "s",
    gameId: "virus-hunter",
    agentId: null,
    issueId: null,
    provider: "anthropic",
    model: "claude-opus-4-7",
    inputTokens: 0,
    outputTokens: 0,
    costCents,
    occurredAt,
    billingCode,
    createdAt: occurredAt,
  };
}

describe("buildCostsDetail", () => {
  const specs = [
    spec("AES-001", null, "A", "Fellowship"),
    spec("DYN-001", "AES-001", "D", "Revive loop"),
    spec("MEC-001", "DYN-001", "M", "Revive"),
    spec("MEC-002", "DYN-001", "M", "Downed state"),
    spec("AST-007", "MEC-001", "AST", "Revive VFX"),
  ];

  const generatedAt = "2026-05-14T12:00:00.000Z";

  it("aggregates own cents per layer and surfaces top spenders", () => {
    const events = [
      event("COST-001", "MEC-001", 500),
      event("COST-002", "MEC-002", 300),
      event("COST-003", "AST-007", 200),
      event("COST-004", "AES-001", 50),
    ];
    const rollup = computeCostRollup({ specs, events });
    const detail = buildCostsDetail({
      gameId: "virus-hunter",
      generatedAt,
      specs,
      events,
      rollup,
    });
    expect(detail.totalMtdCents).toBe(1050);
    expect(detail.orphanCents).toBe(0);
    const byLayer = Object.fromEntries(
      detail.byLayer.map((b) => [b.layer, b.cents]),
    );
    expect(byLayer).toEqual({ M: 800, AST: 200, A: 50 });
    expect(detail.bySpec[0]?.specId).toBe("MEC-001");
    expect(detail.bySpec[0]?.subtreeCents).toBe(700);
  });

  it("surfaces null-billingCode events as orphanCents (and excludes them from bySpec)", () => {
    const events = [
      event("COST-001", "MEC-001", 100),
      event("COST-002", null, 999),
    ];
    const rollup = computeCostRollup({ specs, events });
    const detail = buildCostsDetail({
      gameId: "virus-hunter",
      generatedAt,
      specs,
      events,
      rollup,
    });
    expect(detail.orphanCents).toBe(999);
    expect(detail.totalMtdCents).toBe(100);
    expect(detail.bySpec.map((r) => r.specId)).not.toContain(null);
  });

  it("scopes everything to a subtree when scopeSpecId is set", () => {
    const events = [
      event("COST-001", "MEC-001", 500),
      event("COST-002", "MEC-002", 300),
      event("COST-003", "AST-007", 200),
      event("COST-004", "AES-001", 50),
      event("COST-005", null, 999),
    ];
    const rollup = computeCostRollup({ specs, events });
    const detail = buildCostsDetail({
      gameId: "virus-hunter",
      generatedAt,
      specs,
      events,
      rollup,
      scopeSpecId: "MEC-001",
    });
    expect(detail.scopeSpecId).toBe("MEC-001");
    expect(detail.totalMtdCents).toBe(700); // MEC-001 + AST-007
    expect(detail.orphanCents).toBe(0); // orphans excluded under a scope
    expect(detail.bySpec.map((r) => r.specId).sort()).toEqual([
      "AST-007",
      "MEC-001",
    ]);
    expect(detail.recentEvents.map((e) => e.id).sort()).toEqual([
      "COST-001",
      "COST-003",
    ]);
  });

  it("recentEvents is sorted newest-first and capped", () => {
    const events: CostEvent[] = [];
    for (let i = 0; i < 40; i += 1) {
      const t = new Date(Date.UTC(2026, 4, 14, 12, i)).toISOString();
      events.push(event(`COST-${String(i + 1).padStart(3, "0")}`, "MEC-001", 1, t));
    }
    const rollup = computeCostRollup({ specs, events });
    const detail = buildCostsDetail({
      gameId: "virus-hunter",
      generatedAt,
      specs,
      events,
      rollup,
    });
    expect(detail.recentEvents).toHaveLength(30);
    expect(detail.recentEvents[0]?.id).toBe("COST-040");
    expect(detail.recentEvents.at(-1)?.id).toBe("COST-011");
  });
});
