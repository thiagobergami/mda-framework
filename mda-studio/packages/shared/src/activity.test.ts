import { describe, expect, it } from "vitest";
import {
  ACTIVITY_KINDS,
  activityEntrySchema,
  activityListResponseSchema,
} from "./activity";

const validEntry = {
  id: "ACT-001",
  studioId: "default",
  gameId: "virus-hunter",
  specId: "MEC-001",
  kind: "issue-status-changed" as const,
  summary: "@mech-1 moved MEC-001 from todo to in_progress",
  actor: "@mech-1",
  createdAt: "2026-05-13T12:00:00Z",
};

describe("activity schemas", () => {
  it("accepts a fully populated entry", () => {
    expect(activityEntrySchema.parse(validEntry)).toEqual(validEntry);
  });

  it("allows null gameId / specId / actor", () => {
    const trimmed = {
      ...validEntry,
      gameId: null,
      specId: null,
      actor: null,
      kind: "validator-run-completed" as const,
      summary: "Validator run completed with 2 warnings",
    };
    expect(activityEntrySchema.parse(trimmed).actor).toBeNull();
  });

  it("rejects an unknown kind", () => {
    expect(() =>
      activityEntrySchema.parse({ ...validEntry, kind: "spec-renamed" }),
    ).toThrow();
  });

  it("validates the list response shape", () => {
    const parsed = activityListResponseSchema.parse({
      studioId: "default",
      entries: [validEntry],
    });
    expect(parsed.entries).toHaveLength(1);
  });

  it("exports the stable kind enum", () => {
    expect(ACTIVITY_KINDS).toContain("approval-approved");
    expect(ACTIVITY_KINDS).toContain("cost-event");
  });
});
