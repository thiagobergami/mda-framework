import type { GateCheckResult, SpecContent } from "../types.js";

function sectionContent(spec: SpecContent, name: string): string {
  return spec.sections.get(name.toLowerCase()) ?? "";
}

/** Quality gate for dynamic specs */
export function runDynamicGate(spec: SpecContent): GateCheckResult[] {
  const checks: GateCheckResult[] = [];

  // 1. Feedback loops exist
  const feedback = sectionContent(spec, "feedback system");
  const hasLoop = /loop:/i.test(feedback) || /positive|negative/i.test(feedback);
  const hasCycle = /→|->/.test(feedback);
  checks.push({
    name: "feedback-loops-exist",
    passed: hasLoop && hasCycle,
    message: hasLoop && hasCycle
      ? "Feedback system defines loops with cycle notation"
      : "Feedback system must define at least one loop (Positive or Negative) with a cycle diagram",
  });

  // 2. Invariants are binary (testable conditions)
  const invariants = sectionContent(spec, "invariants");
  const invLines = invariants.split("\n").filter((l) => /INV-\d+/i.test(l)).length;
  checks.push({
    name: "invariants-binary",
    passed: invLines >= 1,
    message: invLines >= 1
      ? `${invLines} invariants defined with INV-N format`
      : "At least one invariant (INV-N) must be defined — conditions that MUST hold for the dynamic to work",
  });

  // 3. Degenerate dynamics are named
  const degenerate = sectionContent(spec, "degenerate dynamics");
  const hasDegen = degenerate.length >= 20;
  const hasDetection = /detection:/i.test(degenerate);
  checks.push({
    name: "degenerate-dynamics-named",
    passed: hasDegen,
    message: hasDegen
      ? hasDetection
        ? "Degenerate dynamics named with detection methods"
        : "Degenerate dynamics named (consider adding Detection: fields)"
      : "Must name at least one degenerate dynamic — behaviors that could emerge but undermine aesthetics",
  });

  // 4. Traces to aesthetics
  const hasAesTrace = spec.tracesTo.some((id) => id.startsWith("AES-"));
  checks.push({
    name: "traces-to-aesthetics",
    passed: hasAesTrace,
    message: hasAesTrace
      ? "Traces to aesthetic spec(s)"
      : "Dynamic must trace to at least one AES spec — which aesthetic does this behavior serve?",
  });

  return checks;
}
