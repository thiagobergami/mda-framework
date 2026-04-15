import type { GateCheckResult, SpecContent } from "../types.js";

function sectionContent(spec: SpecContent, name: string): string {
  return spec.sections.get(name.toLowerCase()) ?? "";
}

/** Quality gate for mechanic specs */
export function runMechanicGate(spec: SpecContent): GateCheckResult[] {
  const checks: GateCheckResult[] = [];

  // 1. Behavioral contract has inputs and outputs
  const contract = sectionContent(spec, "behavioral contract");
  const inputs = sectionContent(spec, "inputs");
  const outputs = sectionContent(spec, "outputs");
  const hasIO = (inputs.length >= 10 && outputs.length >= 10) || contract.length >= 30;
  checks.push({
    name: "contract-has-io",
    passed: hasIO,
    message: hasIO
      ? "Behavioral contract defines inputs and outputs"
      : "Behavioral contract must define Inputs and Outputs sections",
  });

  // 2. Acceptance criteria are testable
  const acceptance = sectionContent(spec, "acceptance criteria");
  const acLines = acceptance.split("\n").filter((l) => l.trim().startsWith("-") || /\[\s?\]/.test(l)).length;
  checks.push({
    name: "acceptance-testable",
    passed: acLines >= 1,
    message: acLines >= 1
      ? `${acLines} acceptance criteria defined`
      : "At least one testable acceptance criterion must be defined",
  });

  // 3. Player affordances are listed
  const affordances = sectionContent(spec, "player affordances");
  checks.push({
    name: "affordances-defined",
    passed: affordances.length >= 10,
    message: affordances.length >= 10
      ? "Player affordances are defined"
      : "Player affordances must list what the player can DO (the verbs)",
  });

  // 4. Traces to dynamics
  const hasDynTrace = spec.tracesTo.some((id) => id.startsWith("DYN-"));
  checks.push({
    name: "traces-to-dynamics",
    passed: hasDynTrace,
    message: hasDynTrace
      ? "Traces to dynamic spec(s)"
      : "Mechanic must trace to at least one DYN spec — no mechanics in vacuo",
  });

  return checks;
}
