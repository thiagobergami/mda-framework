import chalk from "chalk";

import { parseAll } from "../parser.js";
import type { SpecContent } from "../types.js";
import { findLatestPlan, readPlan } from "./plan-parser.js";

interface Row {
  assetId: string;
  name: string;
  type: string;
  planVersion: string;
  planStatus: string;
  milestoneProgress: string;
}

/**
 * Walk every asset spec and report its current plan state.
 * Output is a fixed-width table; printed by the CLI action.
 */
export async function listAssetPlans(root: string): Promise<Row[]> {
  const allScopes = await parseAll(root);
  const specs = allScopes.get("specs") ?? [];
  const assets = specs
    .filter((s): s is SpecContent => s.layer === "AST")
    .sort((a, b) => a.id.localeCompare(b.id));

  const rows: Row[] = [];
  for (const asset of assets) {
    const latest = await findLatestPlan(root, asset.id);
    const name = stringField(asset.frontmatter["name"]) ?? stringField(asset.frontmatter["title"]) ?? "";
    const type = stringField(asset.frontmatter["type"]) ?? "";

    if (!latest) {
      rows.push({
        assetId: asset.id,
        name,
        type,
        planVersion: "—",
        planStatus: chalk.dim("no plan"),
        milestoneProgress: "—",
      });
      continue;
    }

    try {
      const plan = await readPlan(latest.path);
      const total = plan.file.milestones.length;
      const done = plan.file.milestones.filter((m) => m.status === "executed").length;
      rows.push({
        assetId: asset.id,
        name,
        type,
        planVersion: `v${latest.version}`,
        planStatus: colorStatus(plan.file.status),
        milestoneProgress: total > 0 ? `${done}/${total}` : "—",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      rows.push({
        assetId: asset.id,
        name,
        type,
        planVersion: `v${latest.version}`,
        planStatus: chalk.red(`unreadable: ${message.slice(0, 40)}`),
        milestoneProgress: "—",
      });
    }
  }

  return rows;
}

export function formatRows(rows: Row[]): string {
  if (rows.length === 0) {
    return chalk.dim("No asset specs found in specs/assets/.");
  }

  const headers = ["Asset", "Name", "Type", "Plan", "Status", "Milestones"];
  const data = rows.map((r) => [r.assetId, r.name, r.type, r.planVersion, r.planStatus, r.milestoneProgress]);
  const widths = headers.map((h, i) =>
    Math.max(visibleLength(h), ...data.map((row) => visibleLength(row[i] ?? ""))),
  );

  const pad = (cell: string, width: number) =>
    cell + " ".repeat(Math.max(0, width - visibleLength(cell)));

  const lines: string[] = [];
  lines.push(headers.map((h, i) => chalk.bold(pad(h, widths[i]))).join("  "));
  lines.push(widths.map((w) => "─".repeat(w)).join("  "));
  for (const row of data) {
    lines.push(row.map((cell, i) => pad(cell, widths[i])).join("  "));
  }
  return lines.join("\n");
}

function colorStatus(status: string): string {
  switch (status) {
    case "draft":
      return chalk.yellow(status);
    case "approved":
      return chalk.cyan(status);
    case "executed":
      return chalk.blue(status);
    case "imported":
      return chalk.green(status);
    default:
      return status;
  }
}

function stringField(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

// Strip ANSI color escapes so we can compute padding against visible characters.
function visibleLength(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}
