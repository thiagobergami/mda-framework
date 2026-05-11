import matter from "gray-matter";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  ToolProfile,
  EngineProfile,
  MilestoneSpec,
  InputRequirement,
} from "../types.js";

export const ASSET_PLAN_ROOT = "design/asset-plans";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Parse a tool profile from raw markdown content. */
export function parseToolProfile(content: string, filePath: string): ToolProfile {
  const parsed = matter(content);
  const fm = parsed.data as Record<string, unknown>;

  const id = requireString(fm, "id", filePath);
  const name = requireString(fm, "name", filePath);
  const mcpRequired = requireString(fm, "mcp-required", filePath);
  const assetTypes = requireStringArray(fm, "asset-types", filePath);

  const { inputsByType, milestonesByType } = parseToolBody(parsed.content);

  return { id, name, mcpRequired, assetTypes, inputsByType, milestonesByType };
}

/** Parse an engine profile from raw markdown content. */
export function parseEngineProfile(content: string, filePath: string): EngineProfile {
  const parsed = matter(content);
  const fm = parsed.data as Record<string, unknown>;

  const id = requireString(fm, "id", filePath);
  const name = requireString(fm, "name", filePath);
  const mcpRequired = requireString(fm, "mcp-required", filePath);
  const importFormats = requireStringArray(fm, "import-formats", filePath);

  const sections = collectH2Sections(parsed.content);
  const importSteps = sections.get("import steps") ?? sections.get("import-steps") ?? "";

  return { id, name, mcpRequired, importFormats, importSteps };
}

/** Load a tool profile by name from `design/asset-plans/_tools/{name}.md`. */
export async function loadToolProfile(root: string, name: string): Promise<ToolProfile> {
  const path = resolve(root, ASSET_PLAN_ROOT, "_tools", `${name}.md`);
  const content = await readFile(path, "utf-8").catch((err: NodeJS.ErrnoException) => {
    if (err.code === "ENOENT") {
      throw new Error(`Tool profile not found: ${path}`);
    }
    throw err;
  });
  return parseToolProfile(content, path);
}

/** Load an engine profile by name from `design/asset-plans/_engines/{name}.md`. */
export async function loadEngineProfile(root: string, name: string): Promise<EngineProfile> {
  const path = resolve(root, ASSET_PLAN_ROOT, "_engines", `${name}.md`);
  const content = await readFile(path, "utf-8").catch((err: NodeJS.ErrnoException) => {
    if (err.code === "ENOENT") {
      throw new Error(`Engine profile not found: ${path}`);
    }
    throw err;
  });
  return parseEngineProfile(content, path);
}

// ---------------------------------------------------------------------------
// Frontmatter helpers
// ---------------------------------------------------------------------------

function requireString(fm: Record<string, unknown>, key: string, filePath: string): string {
  const value = fm[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Profile ${filePath}: missing or invalid frontmatter field "${key}"`);
  }
  return value;
}

function requireStringArray(fm: Record<string, unknown>, key: string, filePath: string): string[] {
  const value = fm[key];
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new Error(`Profile ${filePath}: frontmatter field "${key}" must be a string array`);
  }
  return value as string[];
}

// ---------------------------------------------------------------------------
// Body parsing — tool profile (Inputs: <type> + Milestones: <type>)
// ---------------------------------------------------------------------------

/** Parse the body of a tool profile, walking H2 + H3 headings statefully. */
function parseToolBody(body: string): {
  inputsByType: Record<string, InputRequirement[]>;
  milestonesByType: Record<string, MilestoneSpec[]>;
} {
  const inputsByType: Record<string, InputRequirement[]> = {};
  const milestonesByType: Record<string, MilestoneSpec[]> = {};

  type Mode =
    | { kind: "none" }
    | { kind: "inputs"; type: string; lines: string[] }
    | {
        kind: "milestones";
        type: string;
        current: { id: string; description: string; lines: string[] } | null;
      };

  let mode: Mode = { kind: "none" };

  const flushInputs = (m: Extract<Mode, { kind: "inputs" }>) => {
    inputsByType[m.type] = parseInputLines(m.lines);
  };

  const flushMilestone = (m: Extract<Mode, { kind: "milestones" }>) => {
    if (!m.current) return;
    const list = (milestonesByType[m.type] ??= []);
    list.push(parseMilestoneLines(m.current.id, m.current.description, m.current.lines));
    m.current = null;
  };

  for (const line of body.split("\n")) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    const h3 = line.match(/^###\s+(.+?)\s*$/);

    if (h2) {
      if (mode.kind === "inputs") flushInputs(mode);
      if (mode.kind === "milestones") flushMilestone(mode);

      const heading = h2[1];
      const inputsMatch = heading.match(/^Inputs:\s*(.+)$/i);
      const milestonesMatch = heading.match(/^Milestones:\s*(.+)$/i);

      if (inputsMatch) {
        mode = { kind: "inputs", type: inputsMatch[1].trim(), lines: [] };
      } else if (milestonesMatch) {
        mode = { kind: "milestones", type: milestonesMatch[1].trim(), current: null };
      } else {
        mode = { kind: "none" };
      }
      continue;
    }

    if (h3 && mode.kind === "milestones") {
      flushMilestone(mode);
      const milestoneMatch = h3[1].match(/^([A-Z]\d+)\s*[—–-]\s*(.+)$/);
      if (milestoneMatch) {
        mode.current = {
          id: milestoneMatch[1],
          description: milestoneMatch[2].trim(),
          lines: [],
        };
      }
      continue;
    }

    if (mode.kind === "inputs") {
      mode.lines.push(line);
    } else if (mode.kind === "milestones" && mode.current) {
      mode.current.lines.push(line);
    }
  }

  if (mode.kind === "inputs") flushInputs(mode);
  if (mode.kind === "milestones") flushMilestone(mode);

  return { inputsByType, milestonesByType };
}

/** Parse `- kind (required|optional) — description` bullets. */
function parseInputLines(lines: string[]): InputRequirement[] {
  const out: InputRequirement[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*-\s+(\w[\w-]*)\s*\((required|optional)\)\s*[—–-]\s*(.+?)\s*$/i);
    if (!m) continue;
    out.push({
      kind: m[1].toLowerCase(),
      required: m[2].toLowerCase() === "required",
      description: m[3],
    });
  }
  return out;
}

/** Parse a single milestone's body block. */
function parseMilestoneLines(id: string, description: string, lines: string[]): MilestoneSpec {
  const body = lines.join("\n");

  const validation = extractInlineLabel(body, "Validation") ?? "";
  const expectedArtifact =
    extractInlineLabel(body, "Artifact") ?? extractInlineLabel(body, "Expected artifact") ?? "";
  const mcpCalls = extractFencedBlock(body, "mcp") ?? "";

  return { id, description, mcpCalls, validation, expectedArtifact };
}

/** Extract `**Label.** value` from a body. */
function extractInlineLabel(body: string, label: string): string | null {
  const re = new RegExp(`\\*\\*${escapeRegex(label)}\\.\\*\\*\\s*([^\\n]+)`, "i");
  const m = body.match(re);
  return m ? m[1].trim() : null;
}

/** Extract the first fenced block tagged with `language`. */
function extractFencedBlock(body: string, language: string): string | null {
  const re = new RegExp("```" + escapeRegex(language) + "\\s*\\n([\\s\\S]*?)```", "m");
  const m = body.match(re);
  return m ? m[1].trim() : null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Body parsing — engine profile (flat H2 sections only)
// ---------------------------------------------------------------------------

function collectH2Sections(body: string): Map<string, string> {
  const out = new Map<string, string>();
  let currentHeading: string | null = null;
  let currentLines: string[] = [];
  for (const line of body.split("\n")) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      if (currentHeading !== null) {
        out.set(currentHeading, currentLines.join("\n").trim());
      }
      currentHeading = h2[1].toLowerCase().trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentHeading !== null) {
    out.set(currentHeading, currentLines.join("\n").trim());
  }
  return out;
}
