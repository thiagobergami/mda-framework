import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { StudioEvent } from "@mda-studio/shared";
import {
  clearApprovalsStore,
  countPendingApprovalsForStudio,
  createApproval,
  getApproval,
  listApprovalsForStudio,
  resolveApproval,
} from "./approvals-store";
import {
  clearStudioEventListeners,
  subscribeStudioEvents,
} from "./studio-events";

beforeEach(() => {
  clearApprovalsStore();
  clearStudioEventListeners();
});
afterEach(() => {
  clearApprovalsStore();
  clearStudioEventListeners();
});

function newPendingApproval() {
  return createApproval({
    studioId: "default",
    gameId: "virus-hunter",
    specId: "MEC-001",
    kind: "mechanic-impl",
    title: "Promote MEC-001",
    body: "Ready for sign-off",
    requestedByHandle: "@mech-1",
  });
}

describe("approvals store", () => {
  it("createApproval assigns monotonic IDs and starts pending", () => {
    const a = newPendingApproval();
    const b = newPendingApproval();
    expect(a.id).toBe("APV-001");
    expect(b.id).toBe("APV-002");
    expect(a.status).toBe("pending");
    expect(a.resolution).toBeNull();
  });

  it("createApproval publishes approval-changed", () => {
    const seen: StudioEvent[] = [];
    subscribeStudioEvents((e) => seen.push(e));
    const a = newPendingApproval();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({
      type: "approval-changed",
      studioId: "default",
      approvalId: a.id,
    });
  });

  it("resolveApproval flips status, fills resolution, publishes event", () => {
    const seen: StudioEvent[] = [];
    subscribeStudioEvents((e) => seen.push(e));
    const a = newPendingApproval();
    const r = resolveApproval(a.id, {
      status: "approved",
      approverHandle: "@director",
      comment: "lgtm",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.approval.status).toBe("approved");
      expect(r.approval.resolution?.approverHandle).toBe("@director");
      expect(r.approval.resolution?.comment).toBe("lgtm");
    }
    // create + resolve events
    expect(seen.filter((e) => e.type === "approval-changed")).toHaveLength(2);
  });

  it("resolveApproval rejects unknown ids", () => {
    const r = resolveApproval("APV-999", {
      status: "approved",
      approverHandle: "@x",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("not_found");
  });

  it("resolveApproval rejects double-resolution", () => {
    const a = newPendingApproval();
    resolveApproval(a.id, { status: "approved", approverHandle: "@d" });
    const second = resolveApproval(a.id, {
      status: "rejected",
      approverHandle: "@d",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe("already_resolved");
  });

  it("getApproval returns the stored record", () => {
    const a = newPendingApproval();
    expect(getApproval(a.id)?.title).toBe("Promote MEC-001");
    expect(getApproval("APV-404")).toBeUndefined();
  });

  it("listApprovalsForStudio filters and orders newest-first", () => {
    const a = newPendingApproval();
    const b = newPendingApproval();
    const list = listApprovalsForStudio("default");
    expect(list.map((x) => x.id)).toEqual([b.id, a.id]);
    expect(listApprovalsForStudio("other")).toHaveLength(0);
  });

  it("listApprovalsForStudio filters by status when requested", () => {
    const a = newPendingApproval();
    const b = newPendingApproval();
    resolveApproval(a.id, { status: "approved", approverHandle: "@d" });
    expect(listApprovalsForStudio("default", { status: "pending" })).toEqual([b]);
    expect(
      listApprovalsForStudio("default", { status: "approved" })[0]?.id,
    ).toBe(a.id);
  });

  it("countPendingApprovalsForStudio reflects only pending", () => {
    expect(countPendingApprovalsForStudio("default")).toBe(0);
    const a = newPendingApproval();
    newPendingApproval();
    expect(countPendingApprovalsForStudio("default")).toBe(2);
    resolveApproval(a.id, { status: "rejected", approverHandle: "@d" });
    expect(countPendingApprovalsForStudio("default")).toBe(1);
  });
});
