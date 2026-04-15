import type { Diagnostic, ValidationRule, SpecGraph } from "../types.js";

/** Every spec should be referenced by at least one other spec (except GAME root) */
export const noOrphans: ValidationRule = {
  name: "no-orphans",
  description: "Specs should not be orphaned — every spec must be referenced by something",
  run(graph: SpecGraph): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const [id, spec] of graph.specs) {
      // GAME is the root — it's never referenced, that's fine
      if (spec.layer === "GAME") continue;

      // Exempt framework-tool specs
      if (spec.scope?.startsWith("framework")) continue;

      const refs = graph.inbound.get(id);
      if (!refs || refs.size === 0) {
        diagnostics.push({
          level: "warning",
          rule: "no-orphans",
          specId: id,
          file: spec.file,
          message: `${id} is never referenced by any other spec`,
        });
      }
    }

    return diagnostics;
  },
};
