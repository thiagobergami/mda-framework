import { Router, type Request, type Response } from "express";
import { ISSUE_STATUSES, type IssueStatus } from "@mda-studio/shared";
import { getIssue, updateIssue } from "../services/issues-store.js";

/**
 * Issue mutation routes (V1):
 *
 *   GET   /api/issues/:id           current state, mostly for debugging
 *   PATCH /api/issues/:id           body { status }, state-machine guarded
 */
export function issuesRouter(): Router {
  const router = Router();

  router.get("/api/issues/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing id" });
      return;
    }
    const issue = getIssue(id);
    if (!issue) {
      res.status(404).json({ error: `unknown issue: ${id}` });
      return;
    }
    res.status(200).json(issue);
  });

  router.patch("/api/issues/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "missing id" });
      return;
    }
    const status = req.body?.status as unknown;
    if (!isValidStatus(status)) {
      res
        .status(422)
        .json({ error: `body.status must be one of ${ISSUE_STATUSES.join("|")}` });
      return;
    }
    const result = updateIssue(id, { status });
    if (!result.ok) {
      if (result.code === "not_found") {
        res.status(404).json({ error: result.message });
        return;
      }
      res.status(409).json({ error: result.message });
      return;
    }
    res.status(200).json(result.issue);
  });

  return router;
}

function isValidStatus(s: unknown): s is IssueStatus {
  return (
    typeof s === "string" &&
    (ISSUE_STATUSES as readonly string[]).includes(s)
  );
}
