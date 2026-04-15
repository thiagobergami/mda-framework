import type { Diagnostic, ValidationRule, SpecGraph } from "../types.js";

/** TUN specs should trace to all three layers: MEC, DYN, and AES */
export const tuningCompleteness: ValidationRule = {
  name: "tuning-completeness",
  description: "Tuning specs should trace to MEC, DYN, and AES for full coverage",
  run(graph: SpecGraph): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const tunSpecs = graph.byLayer.get("TUN") ?? [];

    for (const spec of tunSpecs) {
      const hasMec = spec.tracesTo.some((id) => id.startsWith("MEC-"));
      const hasDyn = spec.tracesTo.some((id) => id.startsWith("DYN-"));
      const hasAes = spec.tracesTo.some((id) => id.startsWith("AES-"));

      if (!(hasMec && hasDyn && hasAes)) {
        const missing: string[] = [];
        if (!hasMec) missing.push("MEC");
        if (!hasDyn) missing.push("DYN");
        if (!hasAes) missing.push("AES");

        diagnostics.push({
          level: "warning",
          rule: "tuning-completeness",
          specId: spec.id,
          file: spec.file,
          message: `${spec.id} missing traces to: ${missing.join(", ")} — tuning should trace all layers`,
        });
      }
    }

    return diagnostics;
  },
};
