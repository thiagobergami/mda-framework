import type { GateResult, GateCheckResult, SpecContent, SpecGraph } from "../types.js";
import { runConceptGate } from "./concept-gate.js";
import { runAestheticGate } from "./aesthetic-gate.js";
import { runDynamicGate } from "./dynamic-gate.js";
import { runMechanicGate } from "./mechanic-gate.js";
import { runImplementationGate } from "./implementation-gate.js";

export type GateLayer = "concept" | "aesthetic" | "dynamic" | "mechanic" | "implementation";

const GATE_RUNNERS: Record<GateLayer, (spec: SpecContent, graph: SpecGraph) => GateCheckResult[]> = {
  concept: (spec) => runConceptGate(spec),
  aesthetic: (spec) => runAestheticGate(spec),
  dynamic: (spec) => runDynamicGate(spec),
  mechanic: (spec) => runMechanicGate(spec),
  implementation: (spec, graph) => runImplementationGate(spec, graph),
};

/** Layer expected for each gate */
const GATE_LAYER_MAP: Record<GateLayer, string> = {
  concept: "GAME",
  aesthetic: "AES",
  dynamic: "DYN",
  mechanic: "MEC",
  implementation: "MEC",
};

/** Run a quality gate against matching specs */
export function runGate(
  gate: GateLayer,
  specs: SpecContent[],
  graph: SpecGraph,
  options: { override?: boolean; overrideReason?: string; strict?: boolean } = {},
): GateResult[] {
  const expectedLayer = GATE_LAYER_MAP[gate];
  const runner = GATE_RUNNERS[gate];
  const matching = specs.filter((s) => s.layer === expectedLayer);

  if (matching.length === 0) {
    return [{
      gate,
      passed: false,
      checks: [{
        name: "spec-exists",
        passed: false,
        message: `No ${expectedLayer} specs found for ${gate} gate`,
      }],
      overridden: false,
    }];
  }

  return matching.map((spec) => {
    const checks = runner(spec, graph);
    const allPassed = checks.every((c) => c.passed);
    const passed = allPassed || (options.override === true);

    return {
      gate: `${gate}:${spec.id}`,
      passed,
      checks,
      overridden: !allPassed && options.override === true,
      overrideReason: options.overrideReason,
    };
  });
}

export { runConceptGate, runAestheticGate, runDynamicGate, runMechanicGate, runImplementationGate };
