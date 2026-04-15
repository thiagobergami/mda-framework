import type { Diagnostic, ValidationRule, SpecGraph, ValidationResult, SpecLayer } from "../types.js";
import { traceResolution } from "./trace-resolution.js";
import { noVacuo } from "./no-vacuo.js";
import { assetTraces } from "./asset-traces.js";
import { tuningCompleteness } from "./tuning-completeness.js";
import { uniqueIds } from "./unique-ids.js";
import { noOrphans } from "./no-orphans.js";
import { bindingCoverage } from "./binding-coverage.js";
import { frontmatterSchema } from "./frontmatter-schema.js";

/** All built-in validation rules */
export const allRules: ValidationRule[] = [
  traceResolution,
  noVacuo,
  assetTraces,
  tuningCompleteness,
  uniqueIds,
  noOrphans,
  bindingCoverage,
  frontmatterSchema,
];

/** Run all rules against a graph and produce a ValidationResult */
export function runRules(graph: SpecGraph, rules: ValidationRule[] = allRules): ValidationResult {
  const diagnostics: Diagnostic[] = [];

  for (const rule of rules) {
    diagnostics.push(...rule.run(graph));
  }

  // Compute stats
  const byLayer: Partial<Record<SpecLayer, number>> = {};
  let traceLinks = 0;

  for (const [, spec] of graph.specs) {
    byLayer[spec.layer] = (byLayer[spec.layer] ?? 0) + 1;
    traceLinks += spec.tracesTo.length;
  }

  const orphaned = diagnostics.filter(
    (d) => d.rule === "no-orphans"
  ).length;

  const hasErrors = diagnostics.some((d) => d.level === "error");

  return {
    passed: !hasErrors,
    diagnostics,
    stats: {
      totalSpecs: graph.specs.size,
      byLayer,
      traceLinks,
      orphaned,
    },
  };
}
