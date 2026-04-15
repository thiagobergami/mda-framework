import type { Diagnostic, ValidationRule, SpecGraph } from "../types.js";

/** MEC specs must trace to at least one DYN spec — no mechanics in isolation */
export const noVacuo: ValidationRule = {
  name: "no-vacuo",
  description: "Mechanics must not exist in isolation — every MEC must trace to a DYN",
  run(graph: SpecGraph): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const mecSpecs = graph.byLayer.get("MEC") ?? [];

    for (const spec of mecSpecs) {
      // Exempt framework-tool specs
      if (spec.scope?.startsWith("framework")) continue;

      const hasDynTrace = spec.tracesTo.some((id) => id.startsWith("DYN-"));
      if (!hasDynTrace) {
        diagnostics.push({
          level: "error",
          rule: "no-vacuo",
          specId: spec.id,
          file: spec.file,
          message: `${spec.id} has no trace to any DYN spec — mechanics must not exist in isolation`,
        });
      }
    }

    return diagnostics;
  },
};
