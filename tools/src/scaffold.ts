import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { parseAll } from "./parser.js";
import type { SpecLayer } from "./types.js";

type ScaffoldLayer = "concept" | "aesthetic" | "dynamic" | "mechanic" | "tuning" | "asset" | "binding";

const LAYER_MAP: Record<ScaffoldLayer, { prefix: SpecLayer; dir: string; ext: string }> = {
  concept:   { prefix: "GAME", dir: "specs/concept",    ext: "concept.md" },
  aesthetic: { prefix: "AES",  dir: "specs/aesthetics",  ext: "aes.md" },
  dynamic:   { prefix: "DYN",  dir: "specs/dynamics",    ext: "dyn.md" },
  mechanic:  { prefix: "MEC",  dir: "specs/mechanics",   ext: "mec.md" },
  tuning:    { prefix: "TUN",  dir: "specs/tuning",      ext: "tune.md" },
  asset:     { prefix: "AST",  dir: "specs/assets",      ext: "asset.md" },
  binding:   { prefix: "BIND", dir: "specs/bindings",    ext: "bind.md" },
};

/** Find the next sequential ID for a layer */
async function nextId(root: string, prefix: SpecLayer): Promise<string> {
  const allScopes = await parseAll(root);
  const specs = allScopes.get("specs") ?? [];
  const ids = specs
    .filter((s) => s.layer === prefix)
    .map((s) => {
      const num = parseInt(s.id.replace(`${prefix}-`, ""), 10);
      return isNaN(num) ? 0 : num;
    });
  const max = ids.length > 0 ? Math.max(...ids) : 0;
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Generate frontmatter template for each layer */
function template(layer: ScaffoldLayer, id: string, name: string): string {
  switch (layer) {
    case "concept":
      return `---
id: ${id}
name: ${name}
version: 1
---

# ${name}

## Vision

{2-4 sentences capturing the essence of the game.}

## Aesthetic Profile

| Priority | Aesthetic | Role in this game |
|----------|-----------|-------------------|
| Primary  | {category} | {How this aesthetic manifests} |
| Secondary | {category} | {How it supports the primary} |
| Tertiary | {category} | {Present but not a design driver} |
| Absent   | {category} | {Explicitly NOT pursued — and why} |

**Conflicts and resolutions**: {State which aesthetic wins when they tension.}

## Core Loop

### Primary Loop
\`\`\`
{Action} → {System Response} → {Player Decision} → {repeat}
\`\`\`
- **Frequency**: {How often this cycle repeats}
- **Serves aesthetic**: {Which aesthetic this loop delivers}

## Target Audience

- **Age range**: {e.g., 8-14}
- **Player archetype**: {e.g., Explorers}
- **Experience level**: {e.g., casual}
- **Session length**: {e.g., 15-30 min}
- **Social context**: {e.g., co-op}

## Platform Constraints

- **Runtime**: {e.g., Roblox}
- **Target devices**: {e.g., PC, mobile}
- **Input methods**: {e.g., keyboard/mouse, touch}

## Feature Map

| Feature | Primary Aesthetic | Priority | Status |
|---------|------------------|----------|--------|
| {name} | {aesthetic} | Must-have | Not started |

## Boundaries

- **Not a {genre}**: {Why excluded}

## Reference Games

| Game | What to learn from | What to avoid |
|------|-------------------|---------------|
| {name} | {Specific aspect} | {What doesn't apply} |

## Success Criteria

- {Criterion}: {How to measure it}
`;

    case "aesthetic":
      return `---
id: ${id}
name: ${name}
primary_aesthetic: {one of the 8 categories}
secondary_aesthetics: []
target_audience: {who is this for}
---

# ${name}

## Experience Goal

{2-3 sentences describing the desired player experience.}

## Aesthetic Profile

### Primary: {Category} — {Why dominant}

{Explain why this aesthetic is the primary goal.}

## Observable Proxies

- **{Proxy name}**: {What to measure} — Target: {range}

## Anti-Patterns

- {Anti-pattern}: {Why it breaks the aesthetic}

## Audience Context

{Who is the target player for this feature?}
`;

    case "dynamic":
      return `---
id: ${id}
name: ${name}
traces_to_aesthetics: [{AES-NNN}]
---

# ${name}

## Behavior Description

{2-3 sentences describing what emergent behavior should occur.}

## Feedback System

### Loop: {Name}
- **Type**: Positive | Negative
- **Cycle**: {State A} → {causes} → {State B} → {causes} → {State A}
- **Effect on experience**: {How this loop serves the target aesthetic}

## Interaction Patterns

### Pattern: {Name}
- **Trigger**: {What initiates this pattern}
- **Sequence**: {Step-by-step}
- **Duration**: {How long}
- **Outcome**: {What state results}

## Invariants

- **INV-1**: {Condition that must always be true}

## Degenerate Dynamics

- **{Name}**: {Description} — Breaks: {which aesthetic}
  - **Detection**: {How to identify}
  - **Prevention**: {What constraint prevents it}
`;

    case "mechanic":
      return `---
id: ${id}
name: ${name}
traces_to_dynamics: [{DYN-NNN}]
---

# ${name}

## Purpose

{1-2 sentences explaining WHY this mechanic exists.}

## Player Affordances

- **{Verb}**: {Description} — Input: {how triggered}

## Game Content

- **{Content type}**: {Description} — Asset: {AST-NNN} — Status: concept

## Rules

### Rule 1: {Name}
- **Condition**: {When this applies}
- **Effect**: {What happens}

## Behavioral Contract

### Inputs
- {Input}: {Type and source}

### Outputs
- {Output}: {Type and destination}

## Acceptance Criteria

- [ ] {Testable criterion}
`;

    case "tuning":
      return `---
id: ${id}
name: ${name}
traces_to_mechanics: [{MEC-NNN}]
traces_to_dynamics: [{DYN-NNN}]
traces_to_aesthetics: [{AES-NNN}]
---

# ${name}

## Tuning Goal

{What experience outcome is this tuning trying to achieve?}

## Parameters

| Parameter | Default | Range | Unit | Affects |
|-----------|---------|-------|------|---------|
| {name} | {value} | {min-max} | {unit} | {DYN/AES reference} |

## Iteration Log

| Date | Parameter | Old | New | Reason | Result |
|------|-----------|-----|-----|--------|--------|
`;

    case "asset":
      return `---
id: ${id}
name: ${name}
type: model
traces_to_mechanics: [{MEC-NNN}]
traces_to_aesthetics: [{AES-NNN}]
status: concept
---

# ${name}

## Purpose

{Why does this asset exist? What mechanic uses it and what aesthetic does it deliver?}

## Requirements

- **Style**: {Visual style description}
- **Scale**: {Dimensions or proportions}

## Placeholder Protocol

{What code can rely on before the final asset is ready.}

## Engine Integration

- **Tags**: [{CollectionService tags or equivalent}]
- **Attributes**: [{Attribute names and types}]
`;

    case "binding":
      return `---
id: ${id}
name: ${name}
engine: {roblox | unity | unreal}
binds_to: [{MEC-NNN or AST-NNN IDs}]
language: {luau | csharp | cpp}
---

# ${name}

## Scene Structure

{How this spec maps to the engine's scene graph.}

## API Surface

{Engine-specific APIs used to implement this spec.}

## Data Representation

{How game state maps to engine data types.}
`;
  }
}

export interface ScaffoldResult {
  id: string;
  file: string;
  layer: ScaffoldLayer;
}

/** Create a new spec file from template */
export async function scaffold(
  root: string,
  layer: ScaffoldLayer,
  name: string,
): Promise<ScaffoldResult> {
  const config = LAYER_MAP[layer];
  const id = await nextId(root, config.prefix);
  const slug = slugify(name);
  const fileName = `${slug}.${config.ext}`;
  const filePath = resolve(root, config.dir, fileName);
  const content = template(layer, id, name);

  await writeFile(filePath, content);

  // Update traceability.md — append to matrix
  const traceFile = resolve(root, "specs", "traceability.md");
  try {
    let trace = await readFile(traceFile, "utf-8");
    const matrixRow = buildTraceRow(layer, id, name);
    if (matrixRow) {
      // Insert before the "## Reading Guide" section
      trace = trace.replace(
        /\n## Reading Guide/,
        `\n${matrixRow}\n\n## Reading Guide`,
      );
      await writeFile(traceFile, trace);
    }
  } catch {
    // traceability.md doesn't exist, skip
  }

  return { id, file: join(config.dir, fileName), layer };
}

function buildTraceRow(layer: ScaffoldLayer, id: string, name: string): string | null {
  switch (layer) {
    case "concept":
      return `| ${id} ${name} | — | — | — | — | Concept gate |`;
    case "aesthetic":
      return `| ${id} ${name} | | | | | Proxy checks |`;
    case "dynamic":
      return `| | ${id} ${name} | | | | Invariant checks |`;
    case "mechanic":
      return `| | | ${id} ${name} | | | Contract tests |`;
    case "tuning":
      return `| | | | ${id} ${name} | | Parameter ranges |`;
    case "asset":
      return `| | | | | ${id} ${name} | Asset status |`;
    default:
      return null;
  }
}

export const VALID_LAYERS: ScaffoldLayer[] = [
  "concept", "aesthetic", "dynamic", "mechanic", "tuning", "asset", "binding",
];
