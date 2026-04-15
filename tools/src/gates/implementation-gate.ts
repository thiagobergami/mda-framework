import type { GateCheckResult, SpecGraph, SpecContent } from "../types.js";
import { runMechanicGate } from "./mechanic-gate.js";

/** Implementation gate — checks that a mechanic is ready for coding */
export function runImplementationGate(
  spec: SpecContent,
  graph: SpecGraph,
): GateCheckResult[] {
  const checks: GateCheckResult[] = [];

  // Run all mechanic gate checks first
  checks.push(...runMechanicGate(spec));

  // Additional: engine binding exists for this spec
  const bindSpecs = graph.byLayer.get("BIND") ?? [];
  const hasBind = bindSpecs.some((bind) => bind.tracesTo.includes(spec.id));
  checks.push({
    name: "binding-exists",
    passed: hasBind,
    message: hasBind
      ? "Engine binding spec exists for this mechanic"
      : "No engine binding spec found — create a BIND spec before implementing",
  });

  // Additional: all upstream specs exist (DYN → AES chain)
  const dynIds = spec.tracesTo.filter((id) => id.startsWith("DYN-"));
  let upstreamComplete = true;
  const missingUpstream: string[] = [];

  for (const dynId of dynIds) {
    if (!graph.specs.has(dynId)) {
      upstreamComplete = false;
      missingUpstream.push(dynId);
      continue;
    }
    const dynSpec = graph.specs.get(dynId)!;
    const aesIds = dynSpec.tracesTo.filter((id) => id.startsWith("AES-"));
    for (const aesId of aesIds) {
      if (!graph.specs.has(aesId)) {
        upstreamComplete = false;
        missingUpstream.push(aesId);
      }
    }
  }

  checks.push({
    name: "upstream-complete",
    passed: upstreamComplete,
    message: upstreamComplete
      ? "All upstream specs (DYN, AES) exist"
      : `Missing upstream specs: ${missingUpstream.join(", ")}`,
  });

  return checks;
}
