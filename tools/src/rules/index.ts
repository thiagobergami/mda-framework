import type { Diagnostic, ValidationRule, SpecGraph, ValidationResult, SpecLayer } from "../types.js";
import { traceResolution } from "./trace-resolution.js";
import { noVacuo } from "./no-vacuo.js";
import { assetTraces } from "./asset-traces.js";
import { tuningCompleteness } from "./tuning-completeness.js";
import { uniqueIds } from "./unique-ids.js";
import { noOrphans } from "./no-orphans.js";
import { bindingCoverage } from "./binding-coverage.js";
import { frontmatterSchema } from "./frontmatter-schema.js";
import { levelReferences } from "./level-references.js";

/**
 * Multi-engine binding coverage is deferred per
 * `design/decisions/2026-05-27-multi-engine.md` (D6.MX1). The rule code stays
 * in tree so a second engine target can re-enable it cheaply, but it does
 * not run as part of the default rule set today.
 */
export const _deferredRules: ValidationRule[] = [bindingCoverage];

/** All built-in validation rules. */
export const allRules: ValidationRule[] = [
  traceResolution,
  noVacuo,
  assetTraces,
  tuningCompleteness,
  uniqueIds,
  noOrphans,
  frontmatterSchema,
  levelReferences,
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
