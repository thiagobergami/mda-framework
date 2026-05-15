import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CostEventInput, StudioEvent } from "@mda-studio/shared";
import {
  clearCostEventsStore,
  listCostEventsForGame,
  recordCostEvent,
} from "./cost-events-store";
import {
  clearStudioEventListeners,
  subscribeStudioEvents,
} from "./studio-events";

beforeEach(() => {
  clearCostEventsStore();
  clearStudioEventListeners();
});
afterEach(() => {
  clearCostEventsStore();
  clearStudioEventListeners();
});

function event(overrides: Partial<CostEventInput> = {}): CostEventInput {
  return {
    studioId: "studio-1",
    gameId: "virus-hunter",
    agentId: null,
    issueId: null,
    provider: "anthropic",
    model: "claude-opus-4-7",
    inputTokens: 1000,
    outputTokens: 50,
    costCents: 100,
    occurredAt: new Date().toISOString(),
    billingCode: "MEC-001",
    ...overrides,
  };
}

describe("recordCostEvent", () => {
  it("accepts a valid spec-id billingCode", () => {
    const r = recordCostEvent(event());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event.id).toBe("COST-001");
    expect(r.event.billingCode).toBe("MEC-001");
  });

  it("accepts a null billingCode (orphan cost)", () => {
    const r = recordCostEvent(event({ billingCode: null }));
    expect(r.ok).toBe(true);
  });

  it("publishes a cost-event when a record is accepted", () => {
    const events: StudioEvent[] = [];
    subscribeStudioEvents((e) => events.push(e));
    recordCostEvent(event({ billingCode: "MEC-001" }));
    expect(events).toEqual([
      { type: "cost-event", gameId: "virus-hunter", specId: "MEC-001" },
    ]);
  });

  it("publishes a cost-event with specId=null for orphan costs", () => {
    const events: StudioEvent[] = [];
    subscribeStudioEvents((e) => events.push(e));
    recordCostEvent(event({ billingCode: null }));
    expect(events).toEqual([
      { type: "cost-event", gameId: "virus-hunter", specId: null },
    ]);
  });

  it("does not publish a cost-event for a rejected record", () => {
    const events: StudioEvent[] = [];
    subscribeStudioEvents((e) => events.push(e));
    recordCostEvent(event({ billingCode: "FOO-001" }));
    expect(events).toEqual([]);
  });

  it("rejects an unrecognized billingCode prefix", () => {
    const r = recordCostEvent(event({ billingCode: "FOO-001" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("invalid_billing_code");
  });
});

describe("listCostEventsForGame", () => {
  it("filters by gameId", () => {
    recordCostEvent(event({ gameId: "virus-hunter" }));
    recordCostEvent(event({ gameId: "other-game" }));
    expect(listCostEventsForGame("virus-hunter").length).toBe(1);
  });

  it("filters out events outside the current month when mtdOnly", () => {
    const lastMonth = new Date();
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
    recordCostEvent(event({ occurredAt: new Date().toISOString() }));
    recordCostEvent(event({ occurredAt: lastMonth.toISOString() }));
    expect(listCostEventsForGame("virus-hunter").length).toBe(2);
    expect(listCostEventsForGame("virus-hunter", { mtdOnly: true }).length).toBe(
      1,
    );
  });
});
