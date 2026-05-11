/** MDA spec layers derived from ID prefix */
export type SpecLayer = "AES" | "DYN" | "MEC" | "TUN" | "AST" | "GAME" | "BIND" | "LVL";

/** Parsed frontmatter metadata for a single spec */
export interface SpecMeta {
  id: string;
  name: string;
  layer: SpecLayer;
  file: string;
  tracesTo: string[];
  scope?: string;
  /** Raw frontmatter key-value pairs */
  frontmatter: Record<string, unknown>;
}

/** Parsed spec with body content for gate analysis */
export interface SpecContent extends SpecMeta {
  body: string;
  /** Markdown sections keyed by heading text (lowercase, trimmed) */
  sections: Map<string, string>;
}

/** Severity of a diagnostic */
export type DiagnosticLevel = "error" | "warning";

/** A single validation finding */
export interface Diagnostic {
  level: DiagnosticLevel;
  rule: string;
  specId?: string;
  file?: string;
  message: string;
}

/** Aggregated result from running all validation rules */
export interface ValidationResult {
  passed: boolean;
  diagnostics: Diagnostic[];
  stats: {
    totalSpecs: number;
    byLayer: Partial<Record<SpecLayer, number>>;
    traceLinks: number;
    orphaned: number;
  };
}

/** A validation rule that checks frontmatter/graph structure */
export interface ValidationRule {
  name: string;
  description: string;
  run(graph: SpecGraph): Diagnostic[];
}

/** Adjacency-list graph built from parsed specs */
export interface SpecGraph {
  /** All specs keyed by ID */
  specs: Map<string, SpecMeta>;
  /** IDs that a spec traces TO (outbound edges) */
  outbound: Map<string, Set<string>>;
  /** IDs that trace to a spec (inbound edges) */
  inbound: Map<string, Set<string>>;
  /** Specs grouped by layer */
  byLayer: Map<SpecLayer, SpecMeta[]>;
  /** Spec ID → file path */
  byFile: Map<string, string>;
}

/** Result of a single gate check */
export interface GateCheckResult {
  name: string;
  passed: boolean;
  message: string;
}

/** Aggregated result from running a quality gate */
export interface GateResult {
  gate: string;
  passed: boolean;
  checks: GateCheckResult[];
  overridden: boolean;
  overrideReason?: string;
}

// ============================================================================
// Asset Plan Pipeline (FEAT-asset-plan)
// See design/asset-plans/spec.md, design/asset-plans/plan.md
// ============================================================================

/** Lifecycle status of a plan file */
export type PlanStatus = "draft" | "approved" | "executed" | "imported";

/** Per-milestone execution status within a plan */
export type MilestoneStatus = "pending" | "executed" | "rejected" | "skipped-mcp";

/** Lightweight reference to a milestone in a plan's frontmatter */
export interface MilestoneRef {
  id: string;
  status: MilestoneStatus;
}

/** A required input declared by a tool profile for a given asset type */
export interface InputRequirement {
  /** Content kind: "image" | "audio" | "text" | "video" | "model3d" | etc. */
  kind: string;
  /** Whether at least one of this kind must be present before plan generation */
  required: boolean;
  /** Human-readable description shown by the intake prompt */
  description: string;
}

/** A single milestone declared by a tool profile */
export interface MilestoneSpec {
  id: string;
  description: string;
  /** MCP call block (raw template — variables resolved at compose-time) */
  mcpCalls: string;
  /** Validation criteria for the produced artifact */
  validation: string;
  /** Path of the artifact this milestone produces, relative to output/ */
  expectedArtifact: string;
}

/** A tool profile read from design/asset-plans/_tools/{tool}.md */
export interface ToolProfile {
  id: string;
  name: string;
  /** MCP server name the tool requires (or "none" for doc-only profiles) */
  mcpRequired: string;
  /** Asset types this tool can produce */
  assetTypes: string[];
  /** Milestones declared per asset type */
  milestonesByType: Record<string, MilestoneSpec[]>;
  /** Required inputs per asset type */
  inputsByType: Record<string, InputRequirement[]>;
}

/** An engine profile read from design/asset-plans/_engines/{engine}.md */
export interface EngineProfile {
  id: string;
  name: string;
  mcpRequired: string;
  importFormats: string[];
  /** Raw markdown body of the import-steps section */
  importSteps: string;
}

/** Frontmatter contract for a {asset-id}.v{N}.plan.md file */
export interface PlanFile {
  id: string;
  assetId: string;
  version: number;
  status: PlanStatus;
  tool: string;
  engine: string;
  references: {
    assetSpec: string;
    aesSpecs: string[];
    concept: string;
    styleGuide: string;
  };
  inputs: string[];
  milestones: MilestoneRef[];
}
