import type { Diagnostic, ValidationRule, SpecGraph } from "../types.js";

/** Check that all trace references resolve to existing specs */
export const traceResolution: ValidationRule = {
  name: "trace-resolution",
  description: "All trace references must resolve to existing spec IDs",
  run(graph: SpecGraph): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const [id, spec] of graph.specs) {
      // Exempt framework-tool specs
      if (spec.scope?.startsWith("framework")) continue;

      for (const targetId of spec.tracesTo) {
        if (!graph.specs.has(targetId)) {
          diagnostics.push({
            level: "error",
            rule: "trace-resolution",
            specId: id,
            file: spec.file,
            message: `${id} traces to ${targetId} which does not exist`,
          });
        }
      }
    }

    return diagnostics;
  },
};
