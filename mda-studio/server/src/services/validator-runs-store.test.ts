import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { StudioEvent } from "@mda-studio/shared";
import {
  clearValidatorRunsStore,
  latestValidatorRun,
  listValidatorWarnings,
  recordValidatorRun,
} from "./validator-runs-store";
import {
  clearStudioEventListeners,
  subscribeStudioEvents,
} from "./studio-events";

beforeEach(() => {
  clearValidatorRunsStore();
  clearStudioEventListeners();
});
afterEach(() => {
  clearValidatorRunsStore();
  clearStudioEventListeners();
});

describe("validator-runs store", () => {
  it("records a run and returns it as the latest for that game", () => {
    const run = recordValidatorRun("virus-hunter", [
      { specId: "MEC-002", rule: "missing-trace", message: "x" },
    ]);
    expect(latestValidatorRun("virus-hunter")?.id).toBe(run.id);
  });

  it("the latest run replaces any previous one", () => {
    recordValidatorRun("virus-hunter", []);
    const newer = recordValidatorRun("virus-hunter", [
      { specId: "AST-007", rule: "no-status", message: "x" },
    ]);
    const latest = latestValidatorRun("virus-hunter");
    expect(latest?.id).toBe(newer.id);
    expect(latest?.warnings).toEqual(newer.warnings);
  });

  it("listValidatorWarnings returns an empty array for an unknown game", () => {
    expect(listValidatorWarnings("nope")).toEqual([]);
  });

  it("publishes validator-run-completed when a run is recorded", () => {
    const events: StudioEvent[] = [];
    subscribeStudioEvents((e) => events.push(e));
    recordValidatorRun("virus-hunter", []);
    expect(events).toEqual([
      { type: "validator-run-completed", gameId: "virus-hunter" },
    ]);
  });
});
