import type { MilestoneStatus, PlanStatus } from "../types.js";

/**
 * Plan-level transitions.
 *
 *   draft → approved      manual user gate before execution
 *   draft → executed      auto, when last milestone executes (skipping approval)
 *   approved → executed   auto, when last milestone executes after approval
 *   executed → imported   auto, after engine-import succeeds
 *
 * Anything else is a bug — refuse it loudly.
 */
const PLAN_TRANSITIONS: Record<PlanStatus, PlanStatus[]> = {
  draft: ["approved", "executed"],
  approved: ["executed"],
  executed: ["imported"],
  imported: [],
};

/**
 * Milestone-level transitions.
 *
 *   pending → executed     accepted by user
 *   pending → rejected     reject-and-stop
 *   pending → skipped-mcp  MCP unavailable; user marked completed manually
 *   rejected → pending     after user edits the plan and resumes
 *   executed → pending     after user explicitly forces a re-run
 *   skipped-mcp → executed when user finally connects the MCP and re-runs
 */
const MILESTONE_TRANSITIONS: Record<MilestoneStatus, MilestoneStatus[]> = {
  pending: ["executed", "rejected", "skipped-mcp"],
  rejected: ["pending"],
  executed: ["pending"],
  "skipped-mcp": ["executed", "pending"],
};

/** Throw if the requested plan-status transition is illegal. */
export function transitionPlan(from: PlanStatus, to: PlanStatus): PlanStatus {
  if (from === to) return to;
  const allowed = PLAN_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Illegal plan transition: ${from} → ${to}.`);
  }
  return to;
}

/** Throw if the requested milestone-status transition is illegal. */
export function transitionMilestone(from: MilestoneStatus, to: MilestoneStatus): MilestoneStatus {
  if (from === to) return to;
  const allowed = MILESTONE_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Illegal milestone transition: ${from} → ${to}.`);
  }
  return to;
}

/**
 * After an executor pass, derive what the plan-level status should be from
 * the per-milestone statuses. Returns the *target* status; the caller calls
 * transitionPlan to commit it.
 */
export function derivePlanStatus(
  current: PlanStatus,
  milestones: { status: MilestoneStatus }[],
): PlanStatus {
  // If imported, leave alone — engine-import is the only thing that flips it.
  if (current === "imported") return "imported";

  const allDone = milestones.length > 0 && milestones.every((m) => m.status === "executed");
  if (allDone) return current === "draft" || current === "approved" ? "executed" : current;
  // If any milestone is "rejected" or "skipped-mcp", stay in current state.
  return current;
}
