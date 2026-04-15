import type { Diagnostic, ValidationRule, SpecGraph, SpecLayer } from "../types.js";

/** Required frontmatter fields per layer */
const REQUIRED_FIELDS: Partial<Record<SpecLayer, string[]>> = {
  GAME: ["id", "name"],
  AES: ["id", "name"],
  DYN: ["id", "name"],
  MEC: ["id", "name"],
  TUN: ["id", "name"],
  AST: ["id", "name"],
  BIND: ["id", "name"],
};

/** Validate that each spec has the required frontmatter fields for its layer */
export const frontmatterSchema: ValidationRule = {
  name: "frontmatter-schema",
  description: "Specs must have required frontmatter fields for their layer",
  run(graph: SpecGraph): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const [id, spec] of graph.specs) {
      const required = REQUIRED_FIELDS[spec.layer];
      if (!required) continue;

      for (const field of required) {
        if (!(field in spec.frontmatter) || spec.frontmatter[field] === null || spec.frontmatter[field] === "") {
          diagnostics.push({
            level: "warning",
            rule: "frontmatter-schema",
            specId: id,
            file: spec.file,
            message: `${id} is missing required frontmatter field: ${field}`,
          });
        }
      }

      // Check trace fields exist for non-root layers
      if (spec.layer !== "GAME" && spec.tracesTo.length === 0) {
        // Framework-tool specs are exempt
        if (!spec.scope?.startsWith("framework")) {
          diagnostics.push({
            level: "warning",
            rule: "frontmatter-schema",
            specId: id,
            file: spec.file,
            message: `${id} has no trace references — specs should trace to related specs`,
          });
        }
      }
    }

    return diagnostics;
  },
};
