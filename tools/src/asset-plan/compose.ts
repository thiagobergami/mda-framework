import type { MilestoneSpec, SpecContent, ToolProfile } from "../types.js";
import type { IntakeReport } from "./intake.js";
import type { StyleSource } from "./style.js";

const STYLE_GUIDE_FILE = "design/asset-plans/_style-guide.md";

export interface ComposeArgs {
  assetSpec: SpecContent;
  profile: ToolProfile;
  assetType: string;
  intake: IntakeReport;
  styleSources: StyleSource[];
  conceptSpec: SpecContent | null;
  aesSpecs: SpecContent[];
  version: number;
  engine: string;
  /** ISO date string used in the frontmatter (defaults to today UTC) */
  today?: string;
}

/** Render the full plan markdown for a single asset version. */
export function composePlan(args: ComposeArgs): string {
  const today = args.today ?? new Date().toISOString().slice(0, 10);
  const milestones = args.profile.milestonesByType[args.assetType] ?? [];

  const frontmatter = renderFrontmatter({
    planId: `PLAN-${args.assetSpec.id}-v${args.version}`,
    assetId: args.assetSpec.id,
    version: args.version,
    tool: shortToolName(args.profile.id),
    engine: args.engine,
    today,
    assetSpecPath: args.assetSpec.file,
    aesIds: args.aesSpecs.map((s) => s.id),
    conceptPath: args.conceptSpec?.file ?? "",
    inputs: args.intake.files.map((f) => `refs/${f}`),
    milestones,
  });

  const body = [
    `# ${args.assetSpec.name} — Implementation Plan v${args.version}`,
    "",
    renderGoal(args),
    renderReferences(args.intake),
    renderStyleSources(args.styleSources),
    renderMilestones(milestones, args.profile.name),
    renderIterationLog(),
  ].join("\n");

  return `${frontmatter}\n${body}\n`;
}

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

interface FrontmatterArgs {
  planId: string;
  assetId: string;
  version: number;
  tool: string;
  engine: string;
  today: string;
  assetSpecPath: string;
  aesIds: string[];
  conceptPath: string;
  inputs: string[];
  milestones: MilestoneSpec[];
}

function renderFrontmatter(a: FrontmatterArgs): string {
  const aesList = a.aesIds.length === 0 ? "[]" : `[${a.aesIds.join(", ")}]`;
  const inputsBlock =
    a.inputs.length === 0
      ? "inputs: []"
      : `inputs:\n${a.inputs.map((i) => `  - ${i}`).join("\n")}`;
  const milestoneBlock =
    a.milestones.length === 0
      ? "milestones: []"
      : `milestones:\n${a.milestones
          .map((m) => `  - id: ${m.id}\n    status: pending`)
          .join("\n")}`;

  return [
    "---",
    `id: ${a.planId}`,
    `asset-id: ${a.assetId}`,
    `version: ${a.version}`,
    `status: draft`,
    `tool: ${a.tool}`,
    `engine: ${a.engine}`,
    `created: ${a.today}`,
    "references:",
    `  asset-spec: ${a.assetSpecPath}`,
    `  aes-specs: ${aesList}`,
    `  concept: ${a.conceptPath}`,
    `  style-guide: ${STYLE_GUIDE_FILE}`,
    inputsBlock,
    milestoneBlock,
    "---",
  ].join("\n");
}

function shortToolName(toolId: string): string {
  // "TOOL-blender" → "blender"
  return toolId.replace(/^TOOL-/i, "").toLowerCase();
}

// ---------------------------------------------------------------------------
// Body sections
// ---------------------------------------------------------------------------

function renderGoal(args: ComposeArgs): string {
  const purpose =
    args.assetSpec.sections.get("purpose") ??
    args.assetSpec.sections.get("emotional intent") ??
    `(No \`Purpose\` section in ${args.assetSpec.id}.)`;

  return [
    "## Goal",
    "",
    `Build **${args.assetSpec.name}** (${args.assetSpec.id}) using ${args.profile.name}.`,
    "",
    "From the asset spec:",
    "",
    blockquote(purpose.trim()),
    "",
  ].join("\n");
}

function renderReferences(intake: IntakeReport): string {
  if (intake.files.length === 0) {
    return [
      "## References",
      "",
      `No reference files in \`${relPath(intake.refsDir)}\`. The composer ran in --no-strict mode; ` +
        `add references before approving this plan.`,
      "",
    ].join("\n");
  }

  const lines = intake.files.map((f) => {
    const ext = f.slice(f.lastIndexOf("."));
    return `- \`refs/${f}\` (${ext.slice(1) || "no-ext"})`;
  });

  return ["## References", "", ...lines, ""].join("\n");
}

function renderStyleSources(sources: StyleSource[]): string {
  const layers: Record<StyleSource["layer"], string> = {
    aes: "AES specs (highest priority)",
    concept: "Concept spec",
    asset: "Asset's own intent",
    "style-guide": "Global style guide (fallback)",
  };

  const grouped: Record<StyleSource["layer"], StyleSource[]> = {
    aes: [],
    concept: [],
    asset: [],
    "style-guide": [],
  };
  for (const s of sources) grouped[s.layer].push(s);

  const lines: string[] = ["## Style Sources", ""];
  lines.push(
    "Constraints come from these sources, listed in precedence order " +
      "(earlier entries win on conflict). Open each to read the full constraints; " +
      "this plan is bound by them.",
    "",
  );

  for (const layer of ["aes", "concept", "asset", "style-guide"] as const) {
    const items = grouped[layer];
    if (items.length === 0) continue;
    lines.push(`### ${layers[layer]}`, "");
    for (const s of items) {
      const refLabel = s.layer === "style-guide" ? "" : `${s.ref} — `;
      lines.push(`- ${refLabel}\`${s.file}\``);
      if (s.highlights.length > 0) {
        const sections = s.highlights.map((h) => `§${titleCase(h)}`).join(", ");
        lines.push(`  Focus on: ${sections}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

function renderMilestones(milestones: MilestoneSpec[], toolName: string): string {
  if (milestones.length === 0) {
    return [
      "## Milestones",
      "",
      `No milestones declared for this asset type in the ${toolName} profile yet. ` +
        `Fill in \`design/asset-plans/_tools/${toolName.toLowerCase()}.md\` and regenerate.`,
      "",
    ].join("\n");
  }

  const lines: string[] = ["## Milestones", ""];
  for (const m of milestones) {
    lines.push(`### ${m.id} — ${m.description}`, "");
    if (m.validation) lines.push(`**Validation.** ${m.validation}`);
    if (m.expectedArtifact) lines.push(`**Expected artifact.** \`output/${m.expectedArtifact}\``);
    lines.push("");
    if (m.mcpCalls) {
      lines.push("```mcp");
      lines.push(m.mcpCalls);
      lines.push("```");
      lines.push("");
    }
  }
  return lines.join("\n");
}

function renderIterationLog(): string {
  return [
    "## Iteration Log",
    "",
    "| When | Milestone | Verdict | Notes |",
    "|------|-----------|---------|-------|",
    "| _no entries yet_ | | | |",
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function blockquote(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function relPath(absPath: string): string {
  // best-effort: strip CWD prefix if present, else return as-is
  const cwd = process.cwd();
  return absPath.startsWith(cwd) ? absPath.slice(cwd.length + 1) : absPath;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
