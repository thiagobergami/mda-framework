/** MDA spec layers derived from ID prefix */
export type SpecLayer = "AES" | "DYN" | "MEC" | "TUN" | "AST" | "GAME" | "BIND";

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
