import type { GateCheckResult, SpecContent } from "../types.js";

function sectionContent(spec: SpecContent, name: string): string {
  return spec.sections.get(name.toLowerCase()) ?? "";
}

/** Quality gate for aesthetic specs */
export function runAestheticGate(spec: SpecContent): GateCheckResult[] {
  const checks: GateCheckResult[] = [];

  // 1. Observable proxies are measurable
  const proxies = sectionContent(spec, "observable proxies");
  const hasTarget = /target:/i.test(proxies);
  const proxyLines = proxies.split("\n").filter((l) => l.trim().startsWith("-")).length;
  checks.push({
    name: "proxies-measurable",
    passed: proxyLines >= 1 && hasTarget,
    message: proxyLines >= 1 && hasTarget
      ? `${proxyLines} observable proxies defined with target metrics`
      : "Observable proxies must be listed with measurable targets (e.g., Target: 60-80%)",
  });

  // 2. Anti-patterns have detection methods
  const antiPatterns = sectionContent(spec, "anti-patterns");
  const apLines = antiPatterns.split("\n").filter((l) => l.trim().startsWith("-")).length;
  checks.push({
    name: "anti-patterns-defined",
    passed: apLines >= 1,
    message: apLines >= 1
      ? `${apLines} anti-patterns defined`
      : "At least one anti-pattern must be defined (behaviors that indicate the aesthetic is failing)",
  });

  // 3. Experience goal uses aesthetic vocabulary (not vague terms)
  const goal = sectionContent(spec, "experience goal");
  const vagueTerms = /\b(fun|gameplay|cool|awesome|nice|good)\b/i.test(goal);
  checks.push({
    name: "vocabulary-precise",
    passed: goal.length >= 30 && !vagueTerms,
    message: goal.length >= 30 && !vagueTerms
      ? "Experience goal uses precise aesthetic vocabulary"
      : vagueTerms
        ? "Experience goal uses vague terms (fun, gameplay, etc.) — use the 8 aesthetic categories instead"
        : "Experience goal is too brief — describe the desired player experience in 2-3 sentences",
  });

  // 4. Primary aesthetic is specified in frontmatter
  const hasPrimary = spec.frontmatter.primary_aesthetic != null;
  checks.push({
    name: "primary-classified",
    passed: hasPrimary,
    message: hasPrimary
      ? `Primary aesthetic: ${spec.frontmatter.primary_aesthetic}`
      : "Frontmatter must include primary_aesthetic from the 8 categories",
  });

  return checks;
}
