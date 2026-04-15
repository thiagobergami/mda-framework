import type { Diagnostic, ValidationRule, SpecGraph } from "../types.js";

/** Spec IDs must be unique — no duplicates */
export const uniqueIds: ValidationRule = {
  name: "unique-ids",
  description: "Spec IDs must be unique across the scope",
  run(graph: SpecGraph): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const seen = new Map<string, string>(); // id → file

    for (const [id, spec] of graph.specs) {
      const existing = seen.get(id);
      if (existing) {
        diagnostics.push({
          level: "error",
          rule: "unique-ids",
          specId: id,
          file: spec.file,
          message: `${id} appears in both ${existing} and ${spec.file}`,
        });
      } else {
        seen.set(id, spec.file);
      }
    }

    return diagnostics;
  },
};
