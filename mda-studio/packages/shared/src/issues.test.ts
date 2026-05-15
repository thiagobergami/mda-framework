import { describe, expect, it } from "vitest";
import {
  ISSUE_STATUS_TRANSITIONS,
  isLegalIssueTransition,
  nextLegalIssueStatuses,
  issueSummarySchema,
} from "./issues";

describe("issue status transitions", () => {
  it("done and cancelled are terminal", () => {
    expect(ISSUE_STATUS_TRANSITIONS.done).toEqual([]);
    expect(ISSUE_STATUS_TRANSITIONS.cancelled).toEqual([]);
  });

  it("allows the canonical in_progress → in_review → done path", () => {
    expect(isLegalIssueTransition("in_progress", "in_review")).toBe(true);
    expect(isLegalIssueTransition("in_review", "done")).toBe(true);
  });

  it("rejects backward jumps like done → in_progress", () => {
    expect(isLegalIssueTransition("done", "in_progress")).toBe(false);
    expect(isLegalIssueTransition("cancelled", "todo")).toBe(false);
  });

  it("nextLegalIssueStatuses returns the documented outgoing edges", () => {
    expect(nextLegalIssueStatuses("backlog")).toEqual(["todo", "cancelled"]);
    expect(nextLegalIssueStatuses("blocked")).toEqual([
      "todo",
      "in_progress",
      "cancelled",
    ]);
  });
});

describe("issueSummarySchema", () => {
  const ok = {
    id: "ISS-001",
    gameId: "virus-hunter",
    specId: "MEC-001",
    title: "Implement revive interaction",
    status: "in_progress",
    priority: "high",
    assigneeAgentId: "agent-3",
    assigneeAgentHandle: "@mech-1",
    createdAt: "2026-05-10T00:00:00.000Z",
    updatedAt: "2026-05-12T00:00:00.000Z",
  } as const;

  it("accepts a complete issue", () => {
    expect(() => issueSummarySchema.parse(ok)).not.toThrow();
  });

  it("rejects an unknown status", () => {
    expect(() =>
      issueSummarySchema.parse({ ...ok, status: "in-flight" }),
    ).toThrow();
  });

  it("rejects an unknown priority", () => {
    expect(() =>
      issueSummarySchema.parse({ ...ok, priority: "urgent" }),
    ).toThrow();
  });
});
