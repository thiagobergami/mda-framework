import type { Diagnostic, ValidationRule, SpecGraph } from "../types.js";

/** MEC and AST specs should have a corresponding BIND spec for the target engine */
export const bindingCoverage: ValidationRule = {
  name: "binding-coverage",
  description: "MEC and AST specs should have engine binding specs",
  run(graph: SpecGraph): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Collect all spec IDs that bindings reference
    const boundSpecs = new Set<string>();
    const bindSpecs = graph.byLayer.get("BIND") ?? [];
    for (const bind of bindSpecs) {
      for (const target of bind.tracesTo) {
        boundSpecs.add(target);
      }
    }

    // Check MEC and AST specs
    for (const layer of ["MEC", "AST"] as const) {
      const specs = graph.byLayer.get(layer) ?? [];
      for (const spec of specs) {
        // Exempt framework-tool specs
        if (spec.scope?.startsWith("framework")) continue;

        if (!boundSpecs.has(spec.id)) {
          diagnostics.push({
            level: "warning",
            rule: "binding-coverage",
            specId: spec.id,
            file: spec.file,
            message: `${spec.id} has no engine binding spec — add a BIND spec for target engine`,
          });
        }
      }
    }

    return diagnostics;
  },
};
