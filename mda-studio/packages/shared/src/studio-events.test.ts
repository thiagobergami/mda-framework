import { describe, expect, it } from "vitest";
import {
  formatStudioEventSse,
  studioEventSchema,
  type StudioEvent,
} from "./studio-events";

describe("studioEventSchema", () => {
  it("accepts each discriminated variant", () => {
    const samples: StudioEvent[] = [
      { type: "node-changed", gameId: "g", specId: "MEC-001" },
      {
        type: "issue-status-changed",
        gameId: "g",
        specId: "MEC-001",
        issueId: "ISS-001",
      },
      { type: "cost-event", gameId: "g", specId: "MEC-001" },
      { type: "cost-event", gameId: "g", specId: null },
      { type: "validator-run-completed", gameId: "g" },
      { type: "approval-changed", studioId: "s", approvalId: "APR-1" },
    ];
    for (const s of samples) {
      expect(() => studioEventSchema.parse(s)).not.toThrow();
    }
  });

  it("rejects unknown variants", () => {
    expect(() =>
      studioEventSchema.parse({ type: "bogus", gameId: "g" }),
    ).toThrow();
  });

  it("requires gameId on game-scoped events", () => {
    expect(() =>
      studioEventSchema.parse({ type: "node-changed", specId: "MEC-001" }),
    ).toThrow();
  });
});

describe("formatStudioEventSse", () => {
  it("emits the canonical event:/data: pair with a trailing blank line", () => {
    const out = formatStudioEventSse({
      type: "node-changed",
      gameId: "g",
      specId: "MEC-001",
    });
    expect(out).toBe(
      'event: node-changed\ndata: {"type":"node-changed","gameId":"g","specId":"MEC-001"}\n\n',
    );
  });
});
