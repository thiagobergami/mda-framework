import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  activityCount,
  clearActivityLog,
  listActivityForStudio,
  recordActivity,
} from "./activity-log-store";

beforeEach(() => clearActivityLog());
afterEach(() => clearActivityLog());

describe("activity-log store", () => {
  it("appends an entry with monotonic id and a created timestamp", () => {
    const a = recordActivity({
      studioId: "default",
      gameId: "virus-hunter",
      specId: "MEC-001",
      kind: "issue-created",
      summary: "Created ISS-001 on MEC-001",
      actor: "@mech-1",
    });
    expect(a.id).toBe("ACT-0001");
    expect(a.createdAt).toMatch(/T/);
  });

  it("lists newest-first by default", () => {
    const a = recordActivity({
      studioId: "default",
      kind: "issue-created",
      summary: "A",
    });
    const b = recordActivity({
      studioId: "default",
      kind: "issue-created",
      summary: "B",
    });
    const list = listActivityForStudio("default");
    expect(list.map((e) => e.id)).toEqual([b.id, a.id]);
  });

  it("filters by gameId", () => {
    recordActivity({
      studioId: "default",
      gameId: "game-1",
      kind: "cost-event",
      summary: "X",
    });
    recordActivity({
      studioId: "default",
      gameId: "game-2",
      kind: "cost-event",
      summary: "Y",
    });
    const list = listActivityForStudio("default", { gameId: "game-1" });
    expect(list).toHaveLength(1);
    expect(list[0]?.gameId).toBe("game-1");
  });

  it("respects the since filter (entries strictly newer)", () => {
    const before = new Date(Date.now() - 60_000).toISOString();
    const future = new Date(Date.now() + 60_000).toISOString();
    recordActivity({
      studioId: "default",
      kind: "approval-requested",
      summary: "first",
    });
    recordActivity({
      studioId: "default",
      kind: "approval-approved",
      summary: "second",
    });
    expect(listActivityForStudio("default", { since: before })).toHaveLength(2);
    expect(listActivityForStudio("default", { since: future })).toHaveLength(0);
  });

  it("honors the limit option", () => {
    for (let i = 0; i < 5; i += 1) {
      recordActivity({
        studioId: "default",
        kind: "cost-event",
        summary: `entry ${i}`,
      });
    }
    expect(listActivityForStudio("default", { limit: 2 })).toHaveLength(2);
  });

  it("does not return entries for other studios", () => {
    recordActivity({
      studioId: "other",
      kind: "issue-created",
      summary: "x",
    });
    expect(listActivityForStudio("default")).toHaveLength(0);
  });

  it("trims to the in-memory cap when overflowing", () => {
    for (let i = 0; i < 510; i += 1) {
      recordActivity({
        studioId: "default",
        kind: "cost-event",
        summary: `event ${i}`,
      });
    }
    expect(activityCount()).toBe(500);
  });
});
