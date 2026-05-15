import { Router, type Request, type Response } from "express";
import {
  approvalResolveInputSchema,
  type ApprovalListResponse,
  type ApprovalStatus,
  APPROVAL_STATUSES,
} from "@mda-studio/shared";
import {
  countPendingApprovalsForStudio,
  getApproval,
  listApprovalsForStudio,
  resolveApproval,
} from "../services/approvals-store.js";

/**
 * Approvals API (plan §6 ApprovalSheet, §14 acceptance criterion 6).
 *
 *   GET   /api/studios/:studioId/approvals[?status=...]
 *   GET   /api/approvals/:id
 *   PATCH /api/approvals/:id    body { status, approverHandle, comment? }
 *
 * V1 keeps approvals studio-scoped (not game-scoped) so the chrome badge
 * has a single source of truth. The pending count is included alongside
 * the list so the badge can avoid a second request.
 */
export function approvalsRouter(): Router {
  const router = Router();

  router.get(
    "/api/studios/:studioId/approvals",
    (req: Request, res: Response) => {
      const { studioId } = req.params;
      if (!studioId) {
        res.status(400).json({ error: "missing studioId" });
        return;
      }
      const statusRaw = typeof req.query["status"] === "string"
        ? req.query["status"]
        : undefined;
      let status: ApprovalStatus | undefined;
      if (statusRaw !== undefined) {
        if (!(APPROVAL_STATUSES as readonly string[]).includes(statusRaw)) {
          res.status(422).json({
            error: `status must be one of ${APPROVAL_STATUSES.join("|")}`,
          });
          return;
        }
        status = statusRaw as ApprovalStatus;
      }
      const body: ApprovalListResponse = {
        studioId,
        pendingCount: countPendingApprovalsForStudio(studioId),
        approvals: listApprovalsForStudio(studioId, { status }),
      };
      res.status(200).json(body);
    },
  );

  router.get("/api/approvals/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing id" });
      return;
    }
    const approval = getApproval(id);
    if (!approval) {
      res.status(404).json({ error: `unknown approval: ${id}` });
      return;
    }
    res.status(200).json(approval);
  });

  router.patch("/api/approvals/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing id" });
      return;
    }
    const parse = approvalResolveInputSchema.safeParse(req.body);
    if (!parse.success) {
      res
        .status(422)
        .json({ error: "invalid approval patch", issues: parse.error.issues });
      return;
    }
    const result = resolveApproval(id, {
      status: parse.data.status,
      approverHandle: parse.data.approverHandle,
      comment: parse.data.comment ?? null,
    });
    if (!result.ok) {
      if (result.code === "not_found") {
        res.status(404).json({ error: result.message });
        return;
      }
      res.status(409).json({ error: result.message });
      return;
    }
    res.status(200).json(result.approval);
  });

  return router;
}
