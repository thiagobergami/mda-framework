import { resolve } from "node:path";
import { select } from "@inquirer/prompts";
import chalk from "chalk";

import type { MilestoneRef, MilestoneStatus, ToolProfile } from "../types.js";
import { findLatestPlan, readPlan, writePlan, appendIterationLog } from "./plan-parser.js";
import type { ParsedPlan, ParsedMilestone } from "./plan-parser.js";
import { loadToolProfile } from "./profile.js";
import { McpClient, type McpServerHandle } from "./mcp-client.js";
import { transitionMilestone, transitionPlan, derivePlanStatus } from "./state.js";

export interface ExecOptions {
  resume?: boolean;
}

export interface ExecResult {
  planPath: string;
  walked: number;
  accepted: number;
  rejected: number;
  skippedMcp: number;
  finalStatus: string;
}

type Verdict = "accept" | "reject-and-revise" | "reject-and-stop";

/**
 * Walk the latest plan's pending milestones, dispatching MCP calls when
 * available and persisting verdicts back to the plan file.
 */
export async function executePlan(
  root: string,
  assetId: string,
  options: ExecOptions = {},
): Promise<ExecResult> {
  const latest = await findLatestPlan(root, assetId);
  if (!latest) {
    throw new Error(
      `No plan found for ${assetId}. Run \`mda asset-plan generate ${assetId}\` first.`,
    );
  }

  const plan = await readPlan(latest.path);

  if (plan.file.status === "imported") {
    console.log(chalk.dim(`Plan ${plan.file.id} already imported. Nothing to do.`));
    return summary(plan, 0, 0, 0, 0);
  }

  const profile = await loadToolProfile(root, plan.file.tool);

  // The MCP client may or may not have a usable config — degrade gracefully.
  const mcp = new McpClient(root);
  await mcp.load();
  const mcpAvailable = profile.mcpRequired !== "none" && mcp.isConfigured(profile.mcpRequired);
  let server: McpServerHandle | null = null;
  if (mcpAvailable) {
    try {
      server = await mcp.connect(profile.mcpRequired);
      console.log(chalk.green(`Connected to MCP server "${profile.mcpRequired}".`));
    } catch (err) {
      console.log(
        chalk.yellow(
          `MCP server "${profile.mcpRequired}" failed to connect (${(err as Error).message}). ` +
            `Falling back to manual mode.`,
        ),
      );
    }
  } else if (profile.mcpRequired !== "none") {
    console.log(
      chalk.yellow(
        `MCP server "${profile.mcpRequired}" not configured. Running in manual mode — ` +
          `MCP call blocks will be printed as instructions.`,
      ),
    );
  }

  let walked = 0;
  let accepted = 0;
  let rejected = 0;
  let skippedMcp = 0;

  try {
    for (const ref of plan.file.milestones) {
      if (options.resume && (ref.status === "executed" || ref.status === "skipped-mcp")) {
        continue;
      }
      if (ref.status === "rejected") {
        // user has presumably edited the plan — flip back to pending so we re-run
        ref.status = transitionMilestone(ref.status, "pending");
      }
      if (ref.status !== "pending") continue;

      const milestoneBody = plan.milestones[ref.id];
      if (!milestoneBody) {
        console.log(chalk.yellow(`Milestone ${ref.id} has no body in plan markdown — skipping.`));
        continue;
      }

      walked++;
      const verdict = await runMilestone(plan, ref, milestoneBody, profile, server);

      switch (verdict) {
        case "accepted":
          accepted++;
          ref.status = transitionMilestone(ref.status, "executed");
          break;
        case "skipped-mcp":
          skippedMcp++;
          ref.status = transitionMilestone(ref.status, "skipped-mcp");
          break;
        case "reject-and-revise":
        case "reject-and-stop":
          rejected++;
          ref.status = transitionMilestone(ref.status, "rejected");
          break;
      }

      // Persist after every milestone so resume works even on crash
      const today = new Date().toISOString().slice(0, 16).replace("T", " ");
      appendIterationLog(plan, {
        when: today,
        milestone: ref.id,
        verdict: verdictLabel(verdict),
      });
      await writePlan(plan);

      if (verdict === "reject-and-stop" || verdict === "reject-and-revise") {
        console.log(
          chalk.dim(
            verdict === "reject-and-revise"
              ? `Milestone ${ref.id} rejected. Edit the plan, then re-run with --resume.`
              : `Milestone ${ref.id} rejected. Stopping.`,
          ),
        );
        break;
      }
    }

    // Update plan-level status from milestones
    const newStatus = derivePlanStatus(plan.file.status, plan.file.milestones);
    if (newStatus !== plan.file.status) {
      plan.file.status = transitionPlan(plan.file.status, newStatus);
      await writePlan(plan);
    }
  } finally {
    await mcp.closeAll();
  }

  const result = summary(plan, walked, accepted, rejected, skippedMcp);
  printSummary(result);
  return result;
}

// ---------------------------------------------------------------------------
// Per-milestone runner
// ---------------------------------------------------------------------------

type MilestoneOutcome = "accepted" | "skipped-mcp" | "reject-and-revise" | "reject-and-stop";

async function runMilestone(
  _plan: ParsedPlan,
  ref: MilestoneRef,
  body: ParsedMilestone,
  profile: ToolProfile,
  server: McpServerHandle | null,
): Promise<MilestoneOutcome> {
  console.log("\n" + chalk.bold(`▶ ${ref.id} — ${body.description}`));

  if (!body.mcpCalls.trim()) {
    console.log(chalk.dim("  (no MCP calls declared for this milestone)"));
  } else if (server) {
    const calls = parseMcpCalls(body.mcpCalls);
    for (const call of calls) {
      console.log(
        chalk.cyan(`  → ${call.tool}.${call.callName}`) +
          chalk.dim(` ${formatArgs(call.args)}`),
      );
      const result = await server.callTool(call.callName, call.args);
      if (result.ok) {
        console.log(chalk.green("    ok"));
      } else {
        console.log(chalk.red(`    error: ${result.error}`));
        // bail out of this milestone — user decides what to do
        const v = await promptVerdictAfterError();
        return v;
      }
    }
  } else {
    console.log(
      chalk.yellow("  MCP unavailable. Perform these steps manually before continuing:"),
    );
    console.log(indent(body.mcpCalls, "    "));
  }

  return await promptVerdict(server !== null && body.mcpCalls.trim().length > 0);
}

async function promptVerdict(mcpRan: boolean): Promise<MilestoneOutcome> {
  const message = mcpRan
    ? "Verdict on this milestone?"
    : "Did you complete this milestone manually?";
  const choices = mcpRan
    ? [
        { name: "Accept — record as executed", value: "accept" as const },
        { name: "Reject and revise — I'll edit the plan, then resume", value: "reject-and-revise" as const },
        { name: "Reject and stop — abort here", value: "reject-and-stop" as const },
      ]
    : [
        { name: "Yes — completed manually (mark skipped-mcp)", value: "skipped-mcp-yes" as const },
        { name: "Reject and revise — I'll edit the plan, then resume", value: "reject-and-revise" as const },
        { name: "Reject and stop — abort here", value: "reject-and-stop" as const },
      ];

  const choice = await select({ message, choices });
  if (choice === "accept") return "accepted";
  if (choice === "skipped-mcp-yes") return "skipped-mcp";
  return choice;
}

async function promptVerdictAfterError(): Promise<MilestoneOutcome> {
  const choice = await select({
    message: "An MCP call failed. What now?",
    choices: [
      { name: "Reject and revise — fix the plan, then resume", value: "reject-and-revise" as const },
      { name: "Reject and stop", value: "reject-and-stop" as const },
    ],
  });
  return choice;
}

// ---------------------------------------------------------------------------
// MCP call block parser
// ---------------------------------------------------------------------------

interface ParsedCall {
  tool: string;
  callName: string;
  args: Record<string, unknown>;
}

/**
 * Parse one or more `tool: / call: / args:` blocks separated by blank lines.
 * Args are parsed leniently as JSON5-ish — single object literal expected.
 */
export function parseMcpCalls(block: string): ParsedCall[] {
  const out: ParsedCall[] = [];
  const groups = block.split(/\n\s*\n/);
  for (const group of groups) {
    const trimmed = group.trim();
    if (!trimmed) continue;
    const tool = matchKey(trimmed, "tool");
    const callName = matchKey(trimmed, "call");
    if (!tool || !callName) continue;
    const argsBlock = matchArgs(trimmed);
    let args: Record<string, unknown> = {};
    if (argsBlock !== null) {
      try {
        args = parseLooseObject(argsBlock);
      } catch {
        args = { _raw: argsBlock };
      }
    }
    out.push({ tool, callName, args });
  }
  return out;
}

function matchKey(block: string, key: string): string | null {
  const re = new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

function matchArgs(block: string): string | null {
  // args: { ... } possibly multi-line up to the closing brace
  const idx = block.search(/^args:\s*/m);
  if (idx < 0) return null;
  const after = block.slice(idx).replace(/^args:\s*/, "");
  const open = after.indexOf("{");
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < after.length; i++) {
    if (after[i] === "{") depth++;
    else if (after[i] === "}") {
      depth--;
      if (depth === 0) return after.slice(open, i + 1);
    }
  }
  return null;
}

/**
 * Lenient object parser — accepts both strict JSON and the loose templated
 * form used in plan files (unquoted keys, single-quoted strings, trailing
 * commas, "{var}" placeholders).
 */
function parseLooseObject(text: string): Record<string, unknown> {
  // Try strict JSON first
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  // Convert single quotes to double, quote bare keys, drop trailing commas
  let normalized = text
    .replace(/([{,]\s*)([A-Za-z_][\w-]*)\s*:/g, '$1"$2":')
    .replace(/'/g, '"')
    .replace(/,(\s*[}\]])/g, "$1");
  // Quote any bare values that look like {placeholders}
  normalized = normalized.replace(/:\s*(\{[^{}]+\})/g, ': "$1"');
  // Quote bare identifiers used as values (e.g. meters, true is fine, idents like cube)
  normalized = normalized.replace(/:\s*([A-Za-z_][\w-]*)\s*([,}])/g, (_m, ident, tail) => {
    if (ident === "true" || ident === "false" || ident === "null") return `: ${ident}${tail}`;
    return `: "${ident}"${tail}`;
  });
  return JSON.parse(normalized) as Record<string, unknown>;
}

function formatArgs(args: Record<string, unknown>): string {
  const keys = Object.keys(args);
  if (keys.length === 0) return "";
  const summary = keys.slice(0, 3).map((k) => `${k}=${stringify(args[k])}`).join(", ");
  return `{ ${summary}${keys.length > 3 ? ", …" : ""} }`;
}

function stringify(v: unknown): string {
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

function indent(text: string, prefix: string): string {
  return text.split("\n").map((l) => prefix + l).join("\n");
}

function verdictLabel(v: MilestoneOutcome): string {
  switch (v) {
    case "accepted":
      return "accepted";
    case "skipped-mcp":
      return "skipped-mcp";
    case "reject-and-revise":
      return "rejected (revise)";
    case "reject-and-stop":
      return "rejected (stop)";
  }
}

function summary(
  plan: ParsedPlan,
  walked: number,
  accepted: number,
  rejected: number,
  skippedMcp: number,
): ExecResult {
  return {
    planPath: plan.path,
    walked,
    accepted,
    rejected,
    skippedMcp,
    finalStatus: plan.file.status,
  };
}

function printSummary(r: ExecResult): void {
  console.log("\n" + chalk.bold("Run summary"));
  console.log(`  walked:        ${r.walked}`);
  console.log(`  accepted:      ${chalk.green(String(r.accepted))}`);
  console.log(`  skipped-mcp:   ${chalk.yellow(String(r.skippedMcp))}`);
  console.log(`  rejected:      ${chalk.red(String(r.rejected))}`);
  console.log(`  plan status:   ${chalk.cyan(r.finalStatus)}`);
}
