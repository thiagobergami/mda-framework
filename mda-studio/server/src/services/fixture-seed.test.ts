import { afterEach, describe, expect, it } from "vitest";
import {
  clearApprovalsStore,
  countPendingApprovalsForStudio,
  listApprovalsForStudio,
} from "./approvals-store";
import {
  clearCostEventsStore,
  listCostEventsForGame,
} from "./cost-events-store";
import {
  clearIssuesStore,
  findActiveIssueForSpec,
  listIssuesForGame,
} from "./issues-store";
import {
  clearValidatorRunsStore,
  listValidatorWarnings,
} from "./validator-runs-store";
import { seedFixtureIssues } from "./fixture-seed";

afterEach(() => {
  clearIssuesStore();
  clearCostEventsStore();
  clearValidatorRunsStore();
  clearApprovalsStore();
});

describe("seedFixtureIssues", () => {
  it("seeds issues for the documented demo spec ids", () => {
    seedFixtureIssues("virus-hunter");
    const ids = new Set(
      listIssuesForGame("virus-hunter").map((i) => i.specId),
    );
    expect(ids.has("MEC-001")).toBe(true);
    expect(ids.has("DYN-001")).toBe(true);
    expect(ids.has("AES-002")).toBe(true);
    expect(ids.has("AST-007")).toBe(true);
    expect(ids.has("LVL-001")).toBe(true);
  });

  it("MEC-001's active issue is in_progress with the @mech-1 assignee", () => {
    seedFixtureIssues("virus-hunter");
    const active = findActiveIssueForSpec("virus-hunter", "MEC-001");
    expect(active?.status).toBe("in_progress");
    expect(active?.assigneeAgentHandle).toBe("@mech-1");
  });

  it("is idempotent — calling twice replaces the previous seed", () => {
    seedFixtureIssues("virus-hunter");
    const first = listIssuesForGame("virus-hunter").length;
    seedFixtureIssues("virus-hunter");
    const second = listIssuesForGame("virus-hunter").length;
    expect(first).toBe(second);
  });

  it("also seeds cost events across the demo spec ids", () => {
    seedFixtureIssues("virus-hunter");
    const events = listCostEventsForGame("virus-hunter", { mtdOnly: true });
    const codes = new Set(events.map((e) => e.billingCode));
    expect(codes.has("MEC-001")).toBe(true);
    expect(codes.has("AES-001")).toBe(true);
    expect(codes.has("LVL-001")).toBe(true);
  });

  it("includes a prior-month event that MTD filtering must drop", () => {
    seedFixtureIssues("virus-hunter");
    const all = listCostEventsForGame("virus-hunter");
    const mtd = listCostEventsForGame("virus-hunter", { mtdOnly: true });
    expect(all.length).toBeGreaterThan(mtd.length);
  });

  it("seeds a validator run with at least two warnings", () => {
    seedFixtureIssues("virus-hunter");
    const warnings = listValidatorWarnings("virus-hunter");
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });

  it("seeds approvals including at least one pending entry", () => {
    seedFixtureIssues("virus-hunter");
    const approvals = listApprovalsForStudio("default");
    expect(approvals.length).toBeGreaterThanOrEqual(2);
    expect(countPendingApprovalsForStudio("default")).toBeGreaterThanOrEqual(1);
  });
});
