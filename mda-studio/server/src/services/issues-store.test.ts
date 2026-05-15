import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudioEvent } from "@mda-studio/shared";
import {
  clearIssuesStore,
  createComment,
  createIssue,
  createWorkProduct,
  findActiveIssueForSpec,
  getIssue,
  listCommentsForIssues,
  listIssuesForGame,
  listIssuesForSpec,
  listWorkProductsForIssues,
  updateIssue,
} from "./issues-store";
import {
  clearStudioEventListeners,
  subscribeStudioEvents,
} from "./studio-events";
import { clearActivityLog } from "./activity-log-store";

beforeEach(() => {
  clearIssuesStore();
  clearStudioEventListeners();
  clearActivityLog();
});
afterEach(() => {
  clearIssuesStore();
  clearStudioEventListeners();
  clearActivityLog();
});

describe("issues store", () => {
  it("createIssue assigns monotonic IDs", () => {
    const a = createIssue({ gameId: "g", specId: "MEC-001", title: "a" });
    const b = createIssue({ gameId: "g", specId: "MEC-001", title: "b" });
    expect(a.id).toBe("ISS-001");
    expect(b.id).toBe("ISS-002");
  });

  it("updateIssue enforces the state-machine", () => {
    const a = createIssue({
      gameId: "g",
      specId: "MEC-001",
      title: "x",
      status: "todo",
    });
    // todo → done is illegal; you must pass through in_progress first.
    const illegal = updateIssue(a.id, { status: "done" });
    expect(illegal.ok).toBe(false);
    if (illegal.ok) return;
    expect(illegal.code).toBe("illegal_transition");

    const ok = updateIssue(a.id, { status: "in_progress" });
    expect(ok.ok).toBe(true);
    const ok2 = updateIssue(a.id, { status: "done" });
    expect(ok2.ok).toBe(true);
  });

  it("updateIssue updates updatedAt", async () => {
    const a = createIssue({
      gameId: "g",
      specId: "MEC-001",
      title: "x",
      status: "todo",
    });
    await new Promise((r) => setTimeout(r, 5));
    const result = updateIssue(a.id, { status: "in_progress" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.issue.updatedAt > a.updatedAt).toBe(true);
  });

  it("updateIssue returns not_found for an unknown id", () => {
    const result = updateIssue("ISS-999", { status: "done" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("not_found");
  });

  it("listIssuesForSpec returns only matching (game, spec) issues, newest first", async () => {
    const older = createIssue({
      gameId: "g",
      specId: "MEC-001",
      title: "old",
    });
    await new Promise((r) => setTimeout(r, 5));
    const newer = createIssue({
      gameId: "g",
      specId: "MEC-001",
      title: "new",
    });
    createIssue({ gameId: "g", specId: "MEC-002", title: "other" });
    createIssue({ gameId: "other-g", specId: "MEC-001", title: "other game" });
    const list = listIssuesForSpec("g", "MEC-001");
    expect(list.map((i) => i.id)).toEqual([newer.id, older.id]);
  });

  it("findActiveIssueForSpec skips done/cancelled issues", () => {
    const done = createIssue({
      gameId: "g",
      specId: "MEC-001",
      title: "x",
      status: "todo",
    });
    updateIssue(done.id, { status: "in_progress" });
    updateIssue(done.id, { status: "done" });
    const open = createIssue({
      gameId: "g",
      specId: "MEC-001",
      title: "y",
      status: "todo",
    });
    expect(findActiveIssueForSpec("g", "MEC-001")?.id).toBe(open.id);
  });

  it("listIssuesForGame returns all issues for the game", () => {
    createIssue({ gameId: "g", specId: "MEC-001", title: "a" });
    createIssue({ gameId: "g", specId: "MEC-002", title: "b" });
    expect(listIssuesForGame("g").length).toBe(2);
    expect(listIssuesForGame("other").length).toBe(0);
  });

  it("getIssue retrieves by id", () => {
    const a = createIssue({ gameId: "g", specId: "MEC-001", title: "a" });
    expect(getIssue(a.id)?.title).toBe("a");
    expect(getIssue("nope")).toBeUndefined();
  });

  it("publishes node-changed when creating an issue", () => {
    const events: StudioEvent[] = [];
    subscribeStudioEvents((e) => events.push(e));
    createIssue({ gameId: "g", specId: "MEC-001", title: "a" });
    expect(events).toContainEqual({
      type: "node-changed",
      gameId: "g",
      specId: "MEC-001",
    });
  });

  it("publishes issue-status-changed + node-changed only on real status changes", () => {
    const a = createIssue({
      gameId: "g",
      specId: "MEC-001",
      title: "x",
      status: "todo",
    });
    const events: StudioEvent[] = [];
    subscribeStudioEvents((e) => events.push(e));
    const noop = updateIssue(a.id, { status: "todo" });
    expect(noop.ok).toBe(true);
    expect(events).toHaveLength(0);
    updateIssue(a.id, { status: "in_progress" });
    expect(events).toEqual([
      {
        type: "issue-status-changed",
        gameId: "g",
        specId: "MEC-001",
        issueId: a.id,
      },
      { type: "node-changed", gameId: "g", specId: "MEC-001" },
    ]);
  });

  it("comments and work products list by issue id, newest first, capped by limit", () => {
    const a = createIssue({ gameId: "g", specId: "MEC-001", title: "a" });
    createComment({
      issueId: a.id,
      authorHandle: "@x",
      body: "first",
    });
    createComment({
      issueId: a.id,
      authorHandle: "@x",
      body: "second",
    });
    const list = listCommentsForIssues([a.id]);
    expect(list.map((c) => c.body)).toEqual(["second", "first"]);

    createWorkProduct({
      issueId: a.id,
      kind: "report",
      label: "validate",
      href: null,
    });
    const wps = listWorkProductsForIssues([a.id]);
    expect(wps[0]?.label).toBe("validate");
  });
});
