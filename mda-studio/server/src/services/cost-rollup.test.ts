import { describe, expect, it } from "vitest";
import type { CostEvent } from "@mda-studio/shared";
import { computeCostRollup } from "./cost-rollup";
import type { ParsedSpec } from "./spec-parser";

function spec(
  specId: string,
  canonical: string | null,
  layer: ParsedSpec["layer"] = "M",
): ParsedSpec {
  return {
    specId,
    layer,
    title: specId,
    status: "draft",
    canonicalParentSpecId: canonical,
    secondaryParentSpecIds: [],
    outgoingRefSpecIds: [],
    sourcePath: `specs/x/${specId}.md`,
  };
}

function event(billingCode: string | null, costCents: number): CostEvent {
  return {
    id: `COST-${costCents}`,
    studioId: "s",
    gameId: "g",
    agentId: null,
    issueId: null,
    provider: "anthropic",
    model: "claude-opus-4-7",
    inputTokens: 0,
    outputTokens: 0,
    costCents,
    occurredAt: new Date().toISOString(),
    billingCode,
    createdAt: new Date().toISOString(),
  };
}

describe("computeCostRollup", () => {
  it("computes own + subtree across a 3-level chain", () => {
    const specs = [
      spec("AES-001", null, "A"),
      spec("DYN-001", "AES-001", "D"),
      spec("MEC-001", "DYN-001", "M"),
    ];
    const events = [
      event("MEC-001", 100),
      event("DYN-001", 40),
      event("AES-001", 10),
    ];
    const r = computeCostRollup({ specs, events });
    expect(r.ownCents.get("MEC-001")).toBe(100);
    expect(r.subtreeCents.get("MEC-001")).toBe(100);
    expect(r.subtreeCents.get("DYN-001")).toBe(140);
    expect(r.subtreeCents.get("AES-001")).toBe(150);
  });

  it("does not double-count a multi-parent spec under its secondary parents", () => {
    const specs = [
      spec("AES-001", null, "A"),
      spec("AES-002", null, "A"),
      spec("DYN-001", "AES-001", "D"),
      spec("DYN-002", "AES-001", "D"),
      // MEC-003 is canonical under DYN-002 but ALSO serves DYN-001 + AES-002.
      {
        ...spec("MEC-003", "DYN-002"),
        secondaryParentSpecIds: ["DYN-001", "AES-002"],
      },
    ];
    const events = [event("MEC-003", 200)];
    const r = computeCostRollup({ specs, events });
    expect(r.subtreeCents.get("DYN-002")).toBe(200);
    expect(r.subtreeCents.get("AES-001")).toBe(200);
    // Secondary parents see zero — that's the contract.
    expect(r.subtreeCents.get("DYN-001")).toBe(0);
    expect(r.subtreeCents.get("AES-002")).toBe(0);
  });

  it("counts a null-billingCode event as orphan, not on any spec", () => {
    const specs = [spec("AES-001", null, "A")];
    const events = [event(null, 50)];
    const r = computeCostRollup({ specs, events });
    expect(r.orphanCents).toBe(50);
    expect(r.subtreeCents.get("AES-001")).toBe(0);
  });

  it("ignores prior-month events when mtdOnly is true", () => {
    const specs = [spec("MEC-001", null, "M")];
    const lastMonth = new Date();
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
    const ev: CostEvent = { ...event("MEC-001", 99), occurredAt: lastMonth.toISOString() };
    const r = computeCostRollup({ specs, events: [ev], mtdOnly: true });
    expect(r.ownCents.get("MEC-001")).toBeUndefined();
  });

  it("includes prior-month events when mtdOnly is false", () => {
    const specs = [spec("MEC-001", null, "M")];
    const lastMonth = new Date();
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
    const ev: CostEvent = { ...event("MEC-001", 99), occurredAt: lastMonth.toISOString() };
    const r = computeCostRollup({ specs, events: [ev], mtdOnly: false });
    expect(r.ownCents.get("MEC-001")).toBe(99);
  });

  it("byBillingCodeForSpec is keyed by spec id and sorted desc", () => {
    const specs = [spec("MEC-001", null, "M")];
    const events = [
      event("MEC-001", 10),
      event("MEC-001", 99),
    ];
    const r = computeCostRollup({ specs, events });
    const arr = r.byBillingCodeForSpec.get("MEC-001") ?? [];
    expect(arr.map((x) => x.cents)).toEqual([109]); // both attribute to MEC-001 → merged
  });
});
