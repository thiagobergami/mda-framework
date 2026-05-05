import type { Diagnostic, ValidationRule, SpecGraph } from "../types.js";

/**
 * Level specs (LVL-NNN) must reference at least one aesthetic, one dynamic, and one
 * mechanic. A level orchestrates all three layers per zone — a level missing one of
 * them is incomplete.
 *
 * Levels also use a `references:` block in frontmatter (parsed into `tracesTo` by the
 * parser). The `status` field must be one of `blockout | playable | polished`.
 */
export const levelReferences: ValidationRule = {
  name: "level-references",
  description: "Level specs must reference at least one AES, one DYN, and one MEC",
  run(graph: SpecGraph): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const lvlSpecs = graph.byLayer.get("LVL") ?? [];

    const validStatuses = new Set(["blockout", "playable", "polished"]);

    for (const spec of lvlSpecs) {
      const refs = spec.tracesTo;

      const hasAes = refs.some((id) => id.startsWith("AES-"));
      const hasDyn = refs.some((id) => id.startsWith("DYN-"));
      const hasMec = refs.some((id) => id.startsWith("MEC-"));

      if (!hasAes) {
        diagnostics.push({
          level: "error",
          rule: "level-references",
          specId: spec.id,
          file: spec.file,
          message: `${spec.id} references no AES spec — every level must target at least one aesthetic`,
        });
      }
      if (!hasDyn) {
        diagnostics.push({
          level: "error",
          rule: "level-references",
          specId: spec.id,
          file: spec.file,
          message: `${spec.id} references no DYN spec — every level must engage at least one dynamic`,
        });
      }
      if (!hasMec) {
        diagnostics.push({
          level: "error",
          rule: "level-references",
          specId: spec.id,
          file: spec.file,
          message: `${spec.id} references no MEC spec — every level must surface at least one mechanic`,
        });
      }

      const status = spec.frontmatter.status;
      if (typeof status !== "string" || !validStatuses.has(status)) {
        diagnostics.push({
          level: "warning",
          rule: "level-references",
          specId: spec.id,
          file: spec.file,
          message: `${spec.id} status='${String(status)}' — must be one of: blockout, playable, polished`,
        });
      }
    }

    return diagnostics;
  },
};
