import type { GateCheckResult, SpecContent } from "../types.js";

const AESTHETIC_CATEGORIES = [
  "sensation", "fantasy", "narrative", "challenge",
  "fellowship", "discovery", "expression", "submission",
];

function hasSection(spec: SpecContent, name: string): boolean {
  return spec.sections.has(name.toLowerCase());
}

function sectionContent(spec: SpecContent, name: string): string {
  return spec.sections.get(name.toLowerCase()) ?? "";
}

/** 6 checks for concept readiness */
export function runConceptGate(spec: SpecContent): GateCheckResult[] {
  const checks: GateCheckResult[] = [];

  // 1. Vision clarity — vision section exists and is non-trivial
  const vision = sectionContent(spec, "vision");
  checks.push({
    name: "vision-clarity",
    passed: vision.length >= 50,
    message: vision.length >= 50
      ? "Vision section is present and substantive"
      : "Vision section is missing or too brief (need at least 2-3 sentences)",
  });

  // 2. Aesthetic commitment — aesthetic profile with at least Primary and Absent
  const profile = sectionContent(spec, "aesthetic profile");
  const hasPrimary = /primary/i.test(profile);
  const hasAbsent = /absent/i.test(profile);
  const aestheticCount = AESTHETIC_CATEGORIES.filter(
    (a) => profile.toLowerCase().includes(a)
  ).length;
  checks.push({
    name: "aesthetic-commitment",
    passed: hasPrimary && hasAbsent && aestheticCount >= 3,
    message: hasPrimary && hasAbsent && aestheticCount >= 3
      ? `Aesthetic profile ranks ${aestheticCount} categories with Primary and Absent tiers`
      : `Aesthetic profile must rank categories with at least Primary and Absent tiers (found: ${aestheticCount} categories, primary=${hasPrimary}, absent=${hasAbsent})`,
  });

  // 3. Core loop coherence — core loop section with cycle notation
  const coreLoop = sectionContent(spec, "core loop")
    + sectionContent(spec, "primary loop");
  const hasCycle = /→/.test(coreLoop) || /->/.test(coreLoop);
  checks.push({
    name: "core-loop-coherence",
    passed: hasCycle && coreLoop.length >= 30,
    message: hasCycle && coreLoop.length >= 30
      ? "Core loop is defined with cycle notation"
      : "Core loop must describe a repeating cycle (action → feedback → decision → action)",
  });

  // 4. Boundary definition — boundaries section exists with exclusions
  const boundaries = sectionContent(spec, "boundaries");
  const hasExclusions = /not|never|no\s/i.test(boundaries);
  checks.push({
    name: "boundary-definition",
    passed: boundaries.length >= 20 && hasExclusions,
    message: boundaries.length >= 20 && hasExclusions
      ? "Boundaries section defines explicit exclusions"
      : "Boundaries section must define what the game is NOT (prevents scope creep)",
  });

  // 5. Feature traceability — feature map section with table rows
  const features = sectionContent(spec, "feature map");
  const tableRows = features.split("\n").filter((l) => l.includes("|") && !l.includes("---")).length;
  checks.push({
    name: "feature-traceability",
    passed: tableRows >= 2,
    message: tableRows >= 2
      ? `Feature map has ${tableRows} entries`
      : "Feature map must list at least one feature with its aesthetic and priority",
  });

  // 6. Scope realism — success criteria section exists
  const success = sectionContent(spec, "success criteria");
  checks.push({
    name: "scope-realism",
    passed: success.length >= 20,
    message: success.length >= 20
      ? "Success criteria are defined"
      : "Success criteria must define measurable goals tied to the aesthetic profile",
  });

  return checks;
}
