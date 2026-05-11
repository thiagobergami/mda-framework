import matter from "gray-matter";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  PlanFile,
  PlanStatus,
  MilestoneRef,
  MilestoneStatus,
} from "../types.js";
import { ASSET_PLAN_ROOT } from "./profile.js";

const VALID_PLAN_STATUSES: PlanStatus[] = ["draft", "approved", "executed", "imported"];
const VALID_MILESTONE_STATUSES: MilestoneStatus[] = [
  "pending",
  "executed",
  "rejected",
  "skipped-mcp",
];

/** A parsed plan with the body milestone bodies attached. */
export interface ParsedPlan {
  file: PlanFile;
  /** Absolute path to the plan markdown */
  path: string;
  /** Per-milestone parsed bodies, indexed by milestone id */
  milestones: Record<string, ParsedMilestone>;
  /** The raw frontmatter block (between the `---` lines), for byte-preserving rewrites */
  rawFrontmatter: string;
  /** The raw body (everything after the closing `---`) */
  rawBody: string;
}

export interface ParsedMilestone {
  id: string;
  /** Heading description (e.g. "Blockout") */
  description: string;
  /** Full markdown body of the milestone H3 section */
  body: string;
  /** Concatenated content of all ```mcp fenced blocks in this milestone */
  mcpCalls: string;
}

/** Read and parse a plan file at the given path. */
export async function readPlan(planPath: string): Promise<ParsedPlan> {
  const content = await readFile(planPath, "utf-8");
  return parsePlan(content, planPath);
}

/** Parse plan markdown content. */
export function parsePlan(content: string, planPath: string): ParsedPlan {
  const parsed = matter(content);
  const fm = parsed.data as Record<string, unknown>;

  const file: PlanFile = {
    id: requireString(fm, "id", planPath),
    assetId: requireString(fm, "asset-id", planPath),
    version: requireNumber(fm, "version", planPath),
    status: requirePlanStatus(fm, "status", planPath),
    tool: requireString(fm, "tool", planPath),
    engine: requireString(fm, "engine", planPath),
    references: parseReferences(fm, planPath),
    inputs: requireStringArray(fm, "inputs", planPath, /* allowEmpty */ true),
    milestones: parseMilestoneRefs(fm, planPath),
  };

  const milestones = parseMilestoneBodies(parsed.content);
  const rawFrontmatter = extractRawFrontmatter(content);

  return { file, path: planPath, milestones, rawFrontmatter, rawBody: parsed.content };
}

function extractRawFrontmatter(content: string): string {
  // Find the opening ---, then the matching closing ---
  const head = content.indexOf("---");
  if (head !== 0) return "";
  const tail = content.indexOf("\n---", 3);
  if (tail < 0) return "";
  return content.slice(4, tail).replace(/^\n/, "");
}

/**
 * Find the latest plan version on disk for an asset, or null if none exist.
 */
export async function findLatestPlan(
  root: string,
  assetId: string,
): Promise<{ path: string; version: number } | null> {
  const dir = resolve(root, ASSET_PLAN_ROOT, assetId);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }

  const re = new RegExp(`^${assetId}\\.v(\\d+)\\.plan\\.md$`);
  let best: { path: string; version: number } | null = null;
  for (const name of entries) {
    const m = name.match(re);
    if (!m) continue;
    const version = parseInt(m[1], 10);
    if (isNaN(version)) continue;
    if (!best || version > best.version) {
      best = { path: resolve(dir, name), version };
    }
  }
  return best;
}

/**
 * Persist a plan back to disk. Updates mutable status fields by regex inside
 * the raw frontmatter so unrelated fields (created, references, etc.) are
 * preserved byte-for-byte. Body is taken from `rawBody` verbatim.
 */
export async function writePlan(plan: ParsedPlan): Promise<void> {
  let fm = plan.rawFrontmatter;
  fm = fm.replace(/^(status:\s*)[\w-]+\s*$/m, `$1${plan.file.status}`);
  for (const m of plan.file.milestones) {
    const re = new RegExp(`(-\\s+id:\\s+${m.id}\\s*\\n\\s+status:\\s*)[\\w-]+`, "m");
    fm = fm.replace(re, `$1${m.status}`);
  }
  const out = `---\n${fm}\n---\n${plan.rawBody}`;
  await writeFile(plan.path, out, "utf-8");
}

/** Append a row to the plan's `## Iteration Log` table. */
export function appendIterationLog(
  plan: ParsedPlan,
  entry: { when: string; milestone: string; verdict: string; notes?: string },
): void {
  const row = `| ${entry.when} | ${entry.milestone} | ${entry.verdict} | ${entry.notes ?? ""} |`;
  const lines = plan.rawBody.split("\n");
  const headerIdx = lines.findIndex((l) => /^##\s+Iteration Log/i.test(l));
  if (headerIdx < 0) {
    plan.rawBody = `${plan.rawBody.trimEnd()}\n\n## Iteration Log\n\n| When | Milestone | Verdict | Notes |\n|------|-----------|---------|-------|\n${row}\n`;
    return;
  }
  // Drop the placeholder row if present, then append at the end of the table.
  const placeholderIdx = lines.findIndex((l, i) => i > headerIdx && /^\|\s*_no entries yet_/i.test(l));
  if (placeholderIdx >= 0) {
    lines.splice(placeholderIdx, 1, row);
  } else {
    // find end of the table (first non-table line after the separator)
    let i = headerIdx + 1;
    while (i < lines.length && (lines[i].startsWith("|") || lines[i].trim() === "")) i++;
    lines.splice(i, 0, row);
  }
  plan.rawBody = lines.join("\n");
}

// ---------------------------------------------------------------------------
// Body parsing — milestone H3 + ```mcp blocks
// ---------------------------------------------------------------------------

function parseMilestoneBodies(body: string): Record<string, ParsedMilestone> {
  const out: Record<string, ParsedMilestone> = {};

  type State =
    | { kind: "outside" }
    | { kind: "inside"; id: string; description: string; lines: string[] };

  let inMilestonesSection = false;
  let state: State = { kind: "outside" };

  const flush = () => {
    if (state.kind !== "inside") return;
    out[state.id] = {
      id: state.id,
      description: state.description,
      body: state.lines.join("\n"),
      mcpCalls: extractAllMcpBlocks(state.lines.join("\n")),
    };
    state = { kind: "outside" };
  };

  for (const line of body.split("\n")) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      flush();
      inMilestonesSection = /^Milestones\b/i.test(h2[1]);
      continue;
    }

    if (!inMilestonesSection) continue;

    const h3 = line.match(/^###\s+(.+?)\s*$/);
    if (h3) {
      flush();
      const m = h3[1].match(/^([A-Z]\d+)\s*[—–-]\s*(.+)$/);
      if (m) {
        state = { kind: "inside", id: m[1], description: m[2].trim(), lines: [] };
      }
      continue;
    }

    if (state.kind === "inside") state.lines.push(line);
  }

  flush();
  return out;
}

function extractAllMcpBlocks(body: string): string {
  const blocks: string[] = [];
  const re = /```mcp\s*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    blocks.push(m[1].trim());
  }
  return blocks.join("\n\n");
}

// ---------------------------------------------------------------------------
// Frontmatter helpers
// ---------------------------------------------------------------------------

function requireString(fm: Record<string, unknown>, key: string, planPath: string): string {
  const v = fm[key];
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(`Plan ${planPath}: frontmatter "${key}" must be a non-empty string.`);
  }
  return v;
}

function requireNumber(fm: Record<string, unknown>, key: string, planPath: string): number {
  const v = fm[key];
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new Error(`Plan ${planPath}: frontmatter "${key}" must be a number.`);
  }
  return v;
}

function requireStringArray(
  fm: Record<string, unknown>,
  key: string,
  planPath: string,
  allowEmpty = false,
): string[] {
  const v = fm[key];
  if (v === undefined || v === null) {
    if (allowEmpty) return [];
    throw new Error(`Plan ${planPath}: frontmatter "${key}" is required.`);
  }
  if (!Array.isArray(v) || v.some((item) => typeof item !== "string")) {
    throw new Error(`Plan ${planPath}: frontmatter "${key}" must be a string array.`);
  }
  return v as string[];
}

function requirePlanStatus(
  fm: Record<string, unknown>,
  key: string,
  planPath: string,
): PlanStatus {
  const v = fm[key];
  if (typeof v !== "string" || !VALID_PLAN_STATUSES.includes(v as PlanStatus)) {
    throw new Error(
      `Plan ${planPath}: frontmatter "${key}" must be one of ${VALID_PLAN_STATUSES.join(" | ")} (got ${JSON.stringify(v)}).`,
    );
  }
  return v as PlanStatus;
}

function parseReferences(fm: Record<string, unknown>, planPath: string): PlanFile["references"] {
  const refs = fm["references"];
  if (typeof refs !== "object" || refs === null || Array.isArray(refs)) {
    throw new Error(`Plan ${planPath}: frontmatter "references" must be an object.`);
  }
  const r = refs as Record<string, unknown>;
  return {
    assetSpec: typeof r["asset-spec"] === "string" ? r["asset-spec"] : "",
    aesSpecs: Array.isArray(r["aes-specs"])
      ? (r["aes-specs"] as unknown[]).map(String).filter((s) => /^AES-\d+$/.test(s))
      : [],
    concept: typeof r["concept"] === "string" ? r["concept"] : "",
    styleGuide: typeof r["style-guide"] === "string" ? r["style-guide"] : "",
  };
}

function parseMilestoneRefs(fm: Record<string, unknown>, planPath: string): MilestoneRef[] {
  const ms = fm["milestones"];
  if (ms === undefined || ms === null) return [];
  if (!Array.isArray(ms)) {
    throw new Error(`Plan ${planPath}: frontmatter "milestones" must be a list.`);
  }
  const out: MilestoneRef[] = [];
  for (const item of ms) {
    if (typeof item !== "object" || item === null) continue;
    const it = item as Record<string, unknown>;
    const id = typeof it.id === "string" ? it.id : null;
    const status = typeof it.status === "string" ? it.status : null;
    if (!id || !status || !VALID_MILESTONE_STATUSES.includes(status as MilestoneStatus)) {
      throw new Error(
        `Plan ${planPath}: milestone entry malformed: ${JSON.stringify(item)}.`,
      );
    }
    out.push({ id, status: status as MilestoneStatus });
  }
  return out;
}

