import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { parseAll } from "./parser.js";
import type { SpecLayer } from "./types.js";

type ScaffoldLayer = "concept" | "aesthetic" | "dynamic" | "mechanic" | "tuning" | "asset" | "binding" | "level";

/**
 * Layers that produce game-specific data MUST be scaffolded into a game's directory.
 * Binding specs are also game-specific (they map a game's MECs/ASTs to engine APIs).
 * Only `level` lives outside specs/ (under design/levels/).
 */
const LAYER_DIRS: Record<ScaffoldLayer, { prefix: SpecLayer; subdir: string; ext: string }> = {
  concept:   { prefix: "GAME", subdir: "specs/concept",    ext: "concept.md" },
  aesthetic: { prefix: "AES",  subdir: "specs/aesthetics", ext: "aes.md" },
  dynamic:   { prefix: "DYN",  subdir: "specs/dynamics",   ext: "dyn.md" },
  mechanic:  { prefix: "MEC",  subdir: "specs/mechanics",  ext: "mec.md" },
  tuning:    { prefix: "TUN",  subdir: "specs/tuning",     ext: "tune.md" },
  asset:     { prefix: "AST",  subdir: "specs/assets",     ext: "asset.md" },
  binding:   { prefix: "BIND", subdir: "specs/bindings",   ext: "bind.md" },
  level:     { prefix: "LVL",  subdir: "design/levels",    ext: "level.md" },
};

/**
 * Resolve where a scaffolded file should land. If `game` is set, all layers go under
 * `games/<game>/{specs,design}/...`. If unset (legacy), they go to the framework root —
 * intended only for framework-tool specs and is gated by the CLI.
 */
function resolveScaffoldDir(root: string, layer: ScaffoldLayer, game: string | null): string {
  const { subdir } = LAYER_DIRS[layer];
  if (game) {
    return resolve(root, "games", game, subdir);
  }
  return resolve(root, subdir);
}

/** Find the next sequential ID for a layer, scoped to the target game (or framework). */
async function nextId(root: string, prefix: SpecLayer, game: string | null): Promise<string> {
  const allScopes = await parseAll(root);
  const scopeKey = game ? `game:${game}` : "specs";
  const specs = allScopes.get(scopeKey) ?? [];
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

    case "level":
      return `---
id: ${id}
name: ${name}
status: blockout
references:
  aesthetics: []
  dynamics:   []
  mechanics:  []
  assets:     []
estimated_duration: 0
---

# ${name}

## Player Goal

{One sentence. What does the player accomplish here?}

## Aesthetic Targets

| Beat   | Target aesthetic | Reasoning                  |
|--------|------------------|----------------------------|
| Entry  | AES-NNN ({cat})  | First impression, sets tone|
| Mid    | AES-NNN ({cat})  | Core engagement            |
| Exit   | AES-NNN ({cat})  | Resolution, satisfaction   |

## Critical Path

\`\`\`
[Entry] → ... → [Exit]
\`\`\`

## Blockout

\`\`\`
{ASCII or mermaid blockout — see design/levels/_schema.md}
\`\`\`

## Beat Chart

| Time | Zone | Tension | Active mechanic | Target aesthetic | Notes |
|------|------|---------|-----------------|------------------|-------|

## Encounters

### {Encounter name}

- **Location**:
- **Mechanic mix**:
- **Expected dynamic**:
- **Success state**:
- **Fail state**:

## Affordances

| Geometry | Player action | Teaches spec |
|----------|---------------|--------------|

## Sightline Notes

- **From Entry**:
- **From Mid**:
- **From Exit looking back**:
- **Hidden**:

## Optional Content

(none — fill in or write "none" explicitly)

## Open Questions

-

## Iteration Log

| Date | Change | Why | Observed effect |
|------|--------|-----|-----------------|
`;
  }
}

export interface ScaffoldResult {
  id: string;
  file: string;
  layer: ScaffoldLayer;
}

export interface ScaffoldOptions {
  /** Target game directory under games/<game>/. Required for non-framework specs. */
  game?: string | null;
}

/** Create a new spec file from template */
export async function scaffold(
  root: string,
  layer: ScaffoldLayer,
  name: string,
  options: ScaffoldOptions = {},
): Promise<ScaffoldResult> {
  const game = options.game ?? null;
  const config = LAYER_DIRS[layer];
  const id = await nextId(root, config.prefix, game);
  const slug = slugify(name);
  const fileName = `${slug}.${config.ext}`;
  const targetDir = resolveScaffoldDir(root, layer, game);
  const filePath = resolve(targetDir, fileName);
  const content = template(layer, id, name);

  await mkdir(targetDir, { recursive: true });
  await writeFile(filePath, content);

  // Resolve which traceability.md to update — framework's or the game's
  const traceFile = game
    ? resolve(root, "games", game, "specs", "traceability.md")
    : resolve(root, "specs", "traceability.md");

  if (layer === "level") {
    await appendLevelTraceRow(traceFile, id, name);
  } else {
    try {
      let trace = await readFile(traceFile, "utf-8");
      const matrixRow = buildTraceRow(layer, id, name);
      if (matrixRow) {
        // Insert before the Levels block (which sits between matrix and Reading Guide)
        if (/\n## Levels/.test(trace)) {
          trace = trace.replace(/\n## Levels/, `\n${matrixRow}\n\n## Levels`);
        } else if (/\n## Reading Guide/.test(trace)) {
          trace = trace.replace(/\n## Reading Guide/, `\n${matrixRow}\n\n## Reading Guide`);
        }
        await writeFile(traceFile, trace);
      }
    } catch {
      // traceability.md doesn't exist, skip
    }
  }

  // Path for the success message — relative to game dir if applicable
  const relPath = game
    ? join("games", game, config.subdir, fileName)
    : join(config.subdir, fileName);

  return { id, file: relPath, layer };
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
    case "level":
      // Level rows go in the Levels table, handled separately below
      return null;
    default:
      return null;
  }
}

/** Append a row to the Levels table in a traceability.md (framework or per-game) */
async function appendLevelTraceRow(traceFile: string, id: string, name: string): Promise<void> {
  try {
    let trace = await readFile(traceFile, "utf-8");
    const row = `| ${id}  | ${name} | — | — | — | — | blockout |`;
    if (trace.includes("*Add rows as level specs are created*")) {
      trace = trace.replace(
        /\| \*Add rows as level specs are created\* \| \| \| \| \| \| \|/,
        row,
      );
    } else if (trace.includes("## Levels")) {
      trace = trace.replace(
        /(## Levels[\s\S]*?\n\|[^\n]*\n)([\s\S]*?)(\n##)/,
        `$1${row}\n$2$3`,
      );
    }
    await writeFile(traceFile, trace);
  } catch {
    // traceability.md missing or unwritable — non-fatal
  }
}

export const VALID_LAYERS: ScaffoldLayer[] = [
  "concept", "aesthetic", "dynamic", "mechanic", "tuning", "asset", "binding", "level",
];

/** Layers that produce game-specific data and require a `--game` target. */
export const GAME_SPECIFIC_LAYERS: Set<ScaffoldLayer> = new Set([
  "concept", "aesthetic", "dynamic", "mechanic", "tuning", "asset", "binding", "level",
]);

export interface InitGameResult {
  game: string;
  dir: string;
  created: boolean;
}

/**
 * Bootstrap a new game directory under games/<slug>/ with empty spec dirs and a fresh
 * per-game traceability.md. Idempotent: returns `created: false` if the dir already exists.
 */
export async function initGame(root: string, name: string): Promise<InitGameResult> {
  const slug = slugify(name);
  if (!slug) throw new Error(`Invalid game name: "${name}"`);

  const gameRoot = resolve(root, "games", slug);
  const gameRel = join("games", slug);

  let created = true;
  try {
    await readdir(gameRoot);
    created = false;
  } catch {
    // doesn't exist — proceed
  }

  const subdirs = [
    "specs/concept",
    "specs/aesthetics",
    "specs/dynamics",
    "specs/mechanics",
    "specs/tuning",
    "specs/assets",
    "specs/bindings",
    "design/levels",
  ];
  for (const sub of subdirs) {
    await mkdir(resolve(gameRoot, sub), { recursive: true });
  }

  // Per-game traceability.md (only written if absent)
  const tracePath = resolve(gameRoot, "specs", "traceability.md");
  try {
    await readFile(tracePath, "utf-8");
  } catch {
    await writeFile(tracePath, perGameTraceabilityTemplate(name));
  }

  // Per-game README so users know what lives where
  const readmePath = resolve(gameRoot, "README.md");
  try {
    await readFile(readmePath, "utf-8");
  } catch {
    await writeFile(readmePath, perGameReadme(name, slug));
  }

  return { game: slug, dir: gameRel, created };
}

function perGameTraceabilityTemplate(name: string): string {
  return `# Traceability — ${name}

Bidirectional links between this game's spec layers. Use this to navigate in both directions:

- **Designer (M → D → A)**: left-to-right — what mechanics produce what experience
- **Player (A → D → M)**: right-to-left — trace an experience problem to its mechanical cause

## Matrix

| Aesthetic | Dynamic | Mechanic | Tuning | Assets | Validation Method |
|-----------|---------|----------|--------|--------|-------------------|
| *Add rows as specs are created* | | | | | |

## Levels

Level specs live in \`design/levels/\` (a sibling of this \`specs/\`). They reference M/D/A
specs by ID and compose them into spatial/temporal arrangements.

| Level ID | Name             | Aesthetics    | Dynamics  | Mechanics | Assets | Status   |
|----------|------------------|---------------|-----------|-----------|--------|----------|
| *Add rows as level specs are created* | | | | | | |

## Reading Guide

See the framework's \`specs/traceability.md\` for the full reading guide, debugging workflow,
and dependency-graph templates. They apply identically here.
`;
}

function perGameReadme(name: string, slug: string): string {
  return `# ${name}

This directory holds all spec and design data for the **${name}** game. The framework
foundation (schemas, glossary, validation rules) lives at the repo root in \`specs/\` and
is shared across all games.

## Layout

\`\`\`
games/${slug}/
├── README.md
├── specs/
│   ├── traceability.md           # this game's M/D/A traceability
│   ├── concept/                  # GAME-NNN concept docs
│   ├── aesthetics/               # AES-NNN
│   ├── dynamics/                 # DYN-NNN
│   ├── mechanics/                # MEC-NNN
│   ├── tuning/                   # TUN-NNN
│   ├── assets/                   # AST-NNN
│   └── bindings/                 # BIND-NNN (engine mappings)
└── design/
    └── levels/                   # LVL-NNN level specs
\`\`\`

## Authoring

Use the wizard:

\`\`\`bash
npm run spec
# pick "${slug}" from the game prompt
\`\`\`

Or scaffold manually:

\`\`\`bash
npx mda new aesthetic "Forest Discovery" --game ${slug}
npx mda new level "Tutorial Forest" --game ${slug}
\`\`\`

## Validation

\`\`\`bash
npx mda validate --scope game:${slug}
\`\`\`

IDs (AES-001, DYN-001, etc.) are namespaced per game — this game's AES-001 is independent
of any other game's AES-001.
`;
}
