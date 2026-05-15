import { describe, expect, it } from "vitest";
import type { IssueSummary } from "@mda-studio/shared";
import { buildAgentRoster } from "./agent-roster";

function issue(
  id: string,
  specId: string,
  status: IssueSummary["status"],
  agentId: string | null,
  handle: string | null,
): IssueSummary {
  return {
    id,
    gameId: "virus-hunter",
    specId,
    title: `Issue ${id}`,
    status,
    priority: "medium",
    assigneeAgentId: agentId,
    assigneeAgentHandle: handle,
    createdAt: "2026-05-14T10:00:00.000Z",
    updatedAt: "2026-05-14T10:00:00.000Z",
  };
}

describe("buildAgentRoster", () => {
  it("aggregates issues per agent and infers a primary layer", () => {
    const issues = [
      issue("ISS-001", "MEC-001", "in_progress", "agent-mech-1", "@mech-1"),
      issue("ISS-002", "MEC-002", "todo", "agent-mech-1", "@mech-1"),
      issue("ISS-003", "AES-001", "done", "agent-mech-1", "@mech-1"),
      issue("ISS-004", "DYN-001", "in_progress", "agent-dyn-1", "@dyn-1"),
    ];
    const roster = buildAgentRoster(issues);
    expect(roster).toHaveLength(2);
    const mech = roster.find((r) => r.agentId === "agent-mech-1")!;
    expect(mech.handle).toBe("@mech-1");
    expect(mech.primaryLayer).toBe("M");
    expect(mech.activeIssueCount).toBe(2);
    expect(mech.completedIssueCount).toBe(1);
    expect(mech.totalIssueCount).toBe(3);
  });

  it("orders agents by layer (MDA order) then by total issue count desc", () => {
    const issues = [
      issue("ISS-001", "AES-001", "todo", "a-aes", "@aes-1"),
      issue("ISS-002", "MEC-001", "todo", "a-mech", "@mech-1"),
      issue("ISS-003", "MEC-002", "todo", "a-mech", "@mech-1"),
      issue("ISS-004", "DYN-001", "todo", "a-dyn", "@dyn-1"),
    ];
    const roster = buildAgentRoster(issues);
    expect(roster.map((r) => r.agentId)).toEqual([
      "a-aes",
      "a-dyn",
      "a-mech",
    ]);
  });

  it("skips issues whose assignee is null", () => {
    const issues = [
      issue("ISS-001", "MEC-001", "todo", null, null),
      issue("ISS-002", "MEC-001", "todo", "agent-1", "@a-1"),
    ];
    const roster = buildAgentRoster(issues);
    expect(roster).toHaveLength(1);
    expect(roster[0]?.agentId).toBe("agent-1");
  });
});
