import type { Diagnostic, ValidationRule, SpecGraph } from "../types.js";

/** AST specs must trace to both MEC and AES */
export const assetTraces: ValidationRule = {
  name: "asset-traces",
  description: "Assets must trace to both a MEC (where used) and an AES (why it exists)",
  run(graph: SpecGraph): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const astSpecs = graph.byLayer.get("AST") ?? [];

    for (const spec of astSpecs) {
      const hasMec = spec.tracesTo.some((id) => id.startsWith("MEC-"));
      const hasAes = spec.tracesTo.some((id) => id.startsWith("AES-"));

      if (!hasMec) {
        diagnostics.push({
          level: "error",
          rule: "asset-traces",
          specId: spec.id,
          file: spec.file,
          message: `${spec.id} has no trace to any MEC spec — where is this asset used?`,
        });
      }
      if (!hasAes) {
        diagnostics.push({
          level: "warning",
          rule: "asset-traces",
          specId: spec.id,
          file: spec.file,
          message: `${spec.id} has no trace to any AES spec — why does this asset exist?`,
        });
      }
    }

    return diagnostics;
  },
};
