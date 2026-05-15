import { describe, expect, it } from "vitest";
import {
  APPROVAL_KINDS,
  APPROVAL_STATUSES,
  approvalListResponseSchema,
  approvalResolveInputSchema,
  approvalSummarySchema,
  isApprovalTerminal,
} from "./approvals";

const validApproval = {
  id: "APV-001",
  studioId: "default",
  gameId: "virus-hunter",
  specId: "MEC-001",
  kind: "mechanic-impl" as const,
  title: "Promote MEC-001 from draft to impl",
  body: "Revive interaction is wired and passing validate. Approve to flip status.",
  requestedByHandle: "@mech-1",
  status: "pending" as const,
  createdAt: "2026-05-13T12:00:00Z",
  updatedAt: "2026-05-13T12:00:00Z",
  resolution: null,
};

describe("approval schemas", () => {
  it("accepts a fully populated pending approval", () => {
    expect(approvalSummarySchema.parse(validApproval)).toEqual(validApproval);
  });

  it("accepts a resolved approval with resolution metadata", () => {
    const resolved = {
      ...validApproval,
      status: "approved" as const,
      updatedAt: "2026-05-13T13:00:00Z",
      resolution: {
        approverHandle: "@director",
        resolvedAt: "2026-05-13T13:00:00Z",
        comment: null,
      },
    };
    expect(approvalSummarySchema.parse(resolved).resolution?.approverHandle).toBe(
      "@director",
    );
  });

  it("rejects invalid status values", () => {
    expect(() =>
      approvalSummarySchema.parse({ ...validApproval, status: "maybe" }),
    ).toThrow();
  });

  it("validates the list response shape", () => {
    const parsed = approvalListResponseSchema.parse({
      studioId: "default",
      pendingCount: 1,
      approvals: [validApproval],
    });
    expect(parsed.approvals).toHaveLength(1);
  });

  it("validates the resolve input shape", () => {
    expect(
      approvalResolveInputSchema.parse({
        status: "approved",
        approverHandle: "@director",
      }).comment,
    ).toBeUndefined();
    expect(() =>
      approvalResolveInputSchema.parse({
        status: "pending",
        approverHandle: "@director",
      }),
    ).toThrow();
  });

  it("isApprovalTerminal reports terminal states correctly", () => {
    expect(isApprovalTerminal("pending")).toBe(false);
    expect(isApprovalTerminal("approved")).toBe(true);
    expect(isApprovalTerminal("rejected")).toBe(true);
  });

  it("exports stable enums", () => {
    expect(APPROVAL_STATUSES).toContain("pending");
    expect(APPROVAL_KINDS).toContain("mechanic-impl");
  });
});
