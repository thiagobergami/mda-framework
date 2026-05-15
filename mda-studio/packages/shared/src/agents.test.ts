import { describe, expect, it } from "vitest";
import {
  agentRosterResponseSchema,
  type AgentRosterResponse,
} from "./agents";

const sample: AgentRosterResponse = {
  gameId: "virus-hunter",
  generatedAt: "2026-05-14T12:00:00.000Z",
  agents: [
    {
      agentId: "agent-mech-1",
      handle: "@mech-1",
      primaryLayer: "M",
      activeIssueCount: 2,
      completedIssueCount: 3,
      totalIssueCount: 5,
    },
    {
      agentId: "agent-dir",
      handle: "@director",
      primaryLayer: null,
      activeIssueCount: 0,
      completedIssueCount: 0,
      totalIssueCount: 0,
    },
  ],
};

describe("agentRosterResponseSchema", () => {
  it("accepts a complete payload", () => {
    expect(() => agentRosterResponseSchema.parse(sample)).not.toThrow();
  });

  it("rejects a negative active issue count", () => {
    expect(() =>
      agentRosterResponseSchema.parse({
        ...sample,
        agents: [{ ...sample.agents[0]!, activeIssueCount: -1 }],
      }),
    ).toThrow();
  });

  it("rejects an empty handle string", () => {
    expect(() =>
      agentRosterResponseSchema.parse({
        ...sample,
        agents: [{ ...sample.agents[0]!, handle: "" }],
      }),
    ).toThrow();
  });
});
