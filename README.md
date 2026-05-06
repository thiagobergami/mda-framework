# MDA Spec Framework

A spec-driven development framework for AI-assisted game development, built on the
[MDA framework](https://users.cs.northwestern.edu/~hunicke/MDA.pdf) (Mechanics, Dynamics,
Aesthetics) by Hunicke, LeBlanc & Zubek.

**The problem**: AI coding assistants can write game code, but they lack design intent. They
implement features "in vacuo" — isolated from their effect on player experience. A damage
system gets built without knowing it exists to create *tension*. A hint system gets tuned
without knowing it serves *discovery*.

**The solution**: Structure game design as layered, traceable specifications that give AI
three things it normally lacks:

- **Intent** — Aesthetic specs explain *why* a feature exists (which of the 8 player
  experience categories it serves)
- **Constraints** — Dynamic specs define behavioral boundaries and feedback systems that
  *must* emerge from the mechanics
- **Testability** — Mechanic specs provide concrete acceptance criteria, and runtime logs
  validate invariants and aesthetic proxies automatically

## How It Works

Every game feature is specified across the MDA causal chain before code is written:

```
Game Concept          "A cozy hide-and-seek game for young children"
      |
      v
Aesthetics (WHY)      "The player should feel the delight of discovery"
      |                 Primary: Discovery | Secondary: Fantasy, Sensation
      v
Dynamics (WHAT)       "A negative feedback loop ensures the player always finds
      |                 the baby within 50 seconds via escalating hints"
      v
Mechanics (HOW)       "Rule 4: Hint system fires at [15s, 25s, 35s, 45s] with
      |                 escalating cues. discoveryRange = 8 studs. Line-of-sight
      |                 check every frame."
      v
Tuning (BALANCE)      "hintTier1Time: 15s [10-25], sensitivity: High
      |                 discoveryRange: 8 studs [5-15], sensitivity: High"
      v
Assets (CONTENT)      "Baby character: 5k tri, R15 rig, 8 emotion blendshapes
                        Status: placeholder | Emotional intent: warmth, protectiveness"
```

AI reads **top-down** to understand intent when implementing. AI reads **bottom-up** to trace
problems when debugging. The MDA paper calls this the "dual perspective" — designers think
M->D->A, players experience A->D->M. Both directions are necessary.

## The 8 Aesthetic Categories

The MDA paper replaces vague words like "fun" with a directed vocabulary:

| # | Aesthetic    | Frame                        | Example                          |
|---|-------------|------------------------------|----------------------------------|
| 1 | Sensation   | Game as sense-pleasure       | Rez, Tetris Effect               |
| 2 | Fantasy     | Game as make-believe         | Skyrim, Animal Crossing          |
| 3 | Narrative   | Game as drama                | Last of Us, Celeste              |
| 4 | Challenge   | Game as obstacle course      | Dark Souls, Super Meat Boy       |
| 5 | Fellowship  | Game as social framework     | Among Us, MMOs                   |
| 6 | Discovery   | Game as uncharted territory  | Outer Wilds, Zelda: BotW        |
| 7 | Expression  | Game as self-discovery       | Minecraft Creative, LittleBigPlanet |
| 8 | Submission  | Game as pastime              | Stardew Valley, Cookie Clicker   |

Every spec in this framework uses these categories. Every design trade-off is resolved by
asking: "which aesthetic is primary?"

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- npm (comes with Node.js)

### Installation

```bash
git clone <this-repo>
cd framework
npm install
```

This installs the `mda` CLI tool plus the wizard's runtime deps (`tsx`, `@inquirer/prompts`,
`chalk`). All `mda` commands run via `npx mda`; the wizard runs via `npm run spec`.

### Quick Start (guided)

The fastest path is the **spec wizard**, which walks you through Concept → Aesthetics →
Dynamics → Mechanics → Assets → Tuning → Levels and pre-fills frontmatter from your answers:

```bash
npm run spec
```

The wizard branches its menu based on what already exists in `specs/`. On a fresh project
you'll only see "Start a new game concept"; once a concept exists, aesthetics unlock; once
aesthetics exist, dynamics unlock; and so on.

Useful flags:

```bash
npm run spec -- --dry-run       # show which mda commands would run, write nothing
npm run spec -- --dir /path     # operate on a different project root
```

### Quick Start (manual)

If you prefer to author files by hand, the same scaffolding is available without the wizard.
All game-specific commands take `--game <slug>` to target a game under `games/<slug>/`:

```bash
# 1. Bootstrap a game directory
npx mda init game "My Game"
# → games/my-game/ with empty spec dirs and a fresh traceability.md

# 2. Scaffold a concept inside that game
npx mda new concept "My Game" --game my-game

# 3. Fill in the generated template at games/my-game/specs/concept/my-game.concept.md

# 4. Run the concept readiness gate
npx mda gate concept

# 5. Scaffold the next layer
npx mda new aesthetic "Core Feature" --game my-game

# 6. Validate just this game (or all scopes)
npx mda validate --scope game:my-game
npx mda validate
```

## CLI Usage

The `mda` CLI provides three commands for working with specs.

### `mda validate` — Check spec integrity

Runs 8 validation rules against all specs to catch structural issues.

```bash
# Validate all scopes (framework + every game + any examples)
npx mda validate

# Validate one game only
npx mda validate --scope game:lantern-woods

# Validate just the framework foundation
npx mda validate --scope specs

# JSON output (for CI or tooling)
npx mda validate --json

# Validate from a different project root
npx mda validate --dir /path/to/project
```

**Validation rules:**

| Rule | What it checks | Level |
|------|---------------|-------|
| `trace-resolution` | All `traces_to_*` and level `references:` IDs resolve | error |
| `no-vacuo` | Every MEC spec traces to at least one DYN spec | error |
| `asset-traces` | Every AST spec traces to a MEC (error) and an AES (warning) | mixed |
| `tuning-completeness` | Every TUN spec traces to MEC + DYN + AES | warning |
| `unique-ids` | No duplicate spec IDs within a scope | error |
| `no-orphans` | Every spec is referenced by at least one other spec (LVL exempt) | warning |
| `binding-coverage` | MEC and AST specs have engine binding specs | warning |
| `frontmatter-schema` | Required frontmatter fields are present per layer | warning |
| `level-references` | LVL specs reference at least one AES, one DYN, one MEC | error |

Exit code is `0` on pass, `1` on any error-level diagnostic.

### `mda gate <layer>` — Run quality gates

Quality gates verify that a spec is complete and well-formed enough to proceed to the next layer. Gates check the markdown body content, not just frontmatter.

```bash
# Run the concept readiness gate
npx mda gate concept

# Run the aesthetic gate
npx mda gate aesthetic

# Override a failure with a logged reason
npx mda gate dynamic --override "Invariants pending playtest data"

# Fail the process on gate failure (useful in CI)
npx mda gate mechanic --strict

# JSON output
npx mda gate implementation --json
```

**Available gates:**

| Gate | Applies to | Key checks |
|------|-----------|------------|
| `concept` | GAME specs | Vision clarity, aesthetic commitment (Primary + Absent tiers), core loop cycle, boundary definition, feature map, success criteria |
| `aesthetic` | AES specs | Measurable proxies with targets, anti-patterns defined, precise vocabulary (no "fun"), primary aesthetic classified |
| `dynamic` | DYN specs | Feedback loops with cycle notation, binary invariants (INV-N), degenerate dynamics named, traces to aesthetics |
| `mechanic` | MEC specs | Behavioral contract with I/O, testable acceptance criteria, player affordances listed, traces to dynamics |
| `implementation` | MEC specs | All mechanic checks + engine binding exists + upstream specs (DYN, AES) are present |

Gate results are saved to `specs/.gate-status.json` for tracking.

### `mda init game <name>` — Bootstrap a new game

Creates `games/<slug>/` with empty spec directories and a fresh per-game `traceability.md`.

```bash
npx mda init game "Lantern Woods"
# → games/lantern-woods/ with specs/{concept,aesthetics,...}/ and design/levels/
```

### `mda new <layer> <name>` — Scaffold a new spec

Creates a new spec file from a template with auto-assigned ID and updates traceability.
Game-specific layers require `--game <slug>`.

```bash
# All game-specific scaffolding takes --game
npx mda new concept "Lantern Woods" --game lantern-woods
npx mda new aesthetic "Forest Discovery" --game lantern-woods
npx mda new dynamic "Creature Reveal Cycle" --game lantern-woods
npx mda new mechanic "Lantern Interaction" --game lantern-woods
npx mda new tuning "Lantern Pacing" --game lantern-woods
npx mda new asset "Firefly Creature" --game lantern-woods
npx mda new binding "Lantern Roblox Binding" --game lantern-woods
npx mda new level "Tutorial Forest" --game lantern-woods    # → games/.../design/levels/

# Framework-tool specs (rare) bypass the game requirement
npx mda new mechanic "Some Framework Tool" --framework
```

**What it does:**
- Assigns the next sequential ID for that layer **scoped to the game** (each game's
  AES-001 is independent)
- Creates a file at `games/<slug>/specs/{layer}/{slug}.{ext}` (or `.../design/levels/` for level)
- Updates `games/<slug>/specs/traceability.md` with a new row

## Level Design

Levels live in `design/levels/` rather than `specs/` because they **compose** existing M/D/A
specs into a spatial/temporal arrangement — they don't define new mechanics, dynamics, or
aesthetics. See `design/levels/_schema.md` for the full schema.

A level spec contains 11 required sections:

1. **Player Goal** — one sentence
2. **Aesthetic Targets** — which AES peaks at entry, mid, exit
3. **Critical Path** — the minimum traversal
4. **Blockout** — ASCII spatial layout
5. **Beat Chart** — pacing curve over time (tension, mechanic, aesthetic per beat)
6. **Encounters** — self-contained interaction units with success/fail states
7. **Affordances** — geometry → action → spec ID mapping
8. **Sightline Notes** — what's visible from each key position
9. **Optional Content** — side paths and reward types
10. **Open Questions** — playtest items
11. **Iteration Log** — what changed and why

Frontmatter requires a `references:` block listing the AES, DYN, MEC, and AST specs the
level uses. The validator's `level-references` rule enforces at least one of each.

```yaml
---
id: LVL-001
name: Tutorial Forest
status: blockout | playable | polished
references:
  aesthetics: [AES-001]
  dynamics:   [DYN-001]
  mechanics:  [MEC-001]
  assets:     []
estimated_duration: 180
---
```

Author a level with `npm run spec` (then pick "Design a level") or `npx mda new level "..."`.

## Spec Wizard

`npm run spec` launches an interactive wizard at `design/pipeline/cli/`. It does two things
the bare `mda new` doesn't:

1. **Branched menus** — only offers what makes sense given the current state of `specs/`.
   You won't see "Add a mechanic" until at least one dynamic exists.
2. **Frontmatter pre-fill** — asks high-level questions (primary aesthetic, traces, level
   status) and patches the answers into the scaffolded file so you start with the body, not
   metadata.

The wizard shells out to `mda new` for actual file creation and runs `mda validate` on
demand from the menu. Source: `design/pipeline/cli/{index.ts,prompts/,lib/}`.

## Project Structure

```
specs/                              # FRAMEWORK FOUNDATION — schemas + framework-tool specs only
├── WORKFLOW.md                     # 8-step process: idea -> implementation
├── glossary.md                     # Shared MDA vocabulary
├── traceability.md                 # Framework traceability template (no user data)
├── concept/_schema.md              # Templates only (one per layer)
├── aesthetics/_schema.md
├── dynamics/_schema.md
├── mechanics/{_schema.md, mda-logger.mec.md}   # MEC-003 is framework-tool
├── tuning/_schema.md
├── assets/_schema.md
└── bindings/{_schema.md, equivalence.md}

games/                              # USER GAME DATA — one isolated subdirectory per game
├── README.md
└── {slug}/
    ├── README.md
    ├── specs/{traceability.md, concept/, aesthetics/, dynamics/, mechanics/, tuning/, assets/, bindings/}
    └── design/levels/

design/                             # FRAMEWORK-LEVEL design artifacts (schemas + tools, no game data)
├── README.md
├── levels/_schema.md               # Level schema and reference example
└── pipeline/                       # Guided spec-authoring tool — `npm run spec`
    ├── cli/                        # Node.js wizard
    └── web/                        # Web UI (deferred)

tools/                              # CLI tooling (TypeScript)
├── src/
│   ├── cli.ts                      # Commander-based CLI entry point
│   ├── parser.ts                   # Frontmatter parser with scope discovery
│   ├── graph.ts                    # Spec adjacency-list graph builder
│   ├── reporter.ts                 # Terminal and JSON output formatting
│   ├── scaffold.ts                 # Spec template generation
│   ├── types.ts                    # Core type definitions
│   ├── rules/                      # 8 validation rules
│   └── gates/                      # 5 quality gates
└── dist/                           # Compiled output (git-ignored)

src/                                # Runtime tools (Luau)
├── shared/MDALogger.luau           # Structured logging with MDA layer tagging
└── tools/validate-specs.luau       # Legacy Luau spec validator

CLAUDE.md                           # AI instructions (read by Claude Code automatically)
IMPROVEMENTS.md                     # Roadmap and improvement plan
WORKFLOW_SIMULATION.md              # End-to-end workflow walkthrough
```

## Multi-Engine Support

The framework separates behavioral specs (what the game does) from engine bindings (how a
specific engine implements it). This enables the same game design to target multiple engines:

- **Behavioral specs** (`specs/mechanics/`, `specs/dynamics/`, etc.) are engine-agnostic
- **Binding specs** (`specs/bindings/`) map behavioral contracts to engine-specific APIs
- **Equivalence table** (`specs/bindings/equivalence.md`) provides a quick reference for
  Roblox, Unity, and Unreal Engine mappings

When implementing for a specific engine, read both the mechanic spec (what to build) and its
binding spec (how to build it in your engine).

## Structured Logging

Every game event is tagged with its MDA layer and spec ID at runtime:

```
[00:15.234] [M:MEC-001] [INFO] [HINT_FIRED]  cid=3 tier=1 elapsed=15.2s
[00:25.891] [M:MEC-001] [INFO] [DISCOVERY]   cid=7 spot=kitchen time=25.8s
[00:25.891] [M:MEC-002] [INFO] [EXPRESSION]  cid=7 emotion=Giggle anim=giggle_02
[00:25.892] [D:DYN-001] [PASS] [INVARIANT]   cid=7 inv=INV-1 detail="25.8s < 50s"
[03:12.000] [A:AES-001] [PASS] [PROXY_CHECK] proxy=discovery_rate value=24.1 target=25
```

- Filter by `[FAIL]` to find broken invariants and out-of-range proxies
- Filter by `cid=N` to trace a full causal chain across all MDA layers
- `Log.summary()` at session end validates all aesthetic proxies automatically

This lets AI debug by tracing from experience (Aesthetics) through behavior (Dynamics) to
code (Mechanics) using real runtime data — not guessing.

## Workflow

The framework defines an 8-step spec authoring process (see `specs/WORKFLOW.md`):

1. **Game Concept** — Vision, aesthetic profile, core loops, boundaries
2. **Aesthetic Specs** — Observable proxies and anti-patterns per feature
3. **Dynamic Specs** — Feedback systems, invariants, degenerate dynamics
4. **Mechanic Specs** — Rules, behavioral contracts, acceptance criteria
5. **Asset Specs** — Emotional intent, technical requirements, placeholder protocols
6. **Tuning Specs** — Parameter ranges, trade-offs, iteration log
7. **Traceability** — Bidirectional links between all layers
8. **Validation** — Structural integrity check (automated via `npx mda validate`)

Quality gates between each step ensure specs are complete before proceeding.
Steps 1-3 require human design judgment. Steps 4-8 are increasingly automatable by AI.

## Based On

- [MDA: A Formal Approach to Game Design and Game Research](https://users.cs.northwestern.edu/~hunicke/MDA.pdf)
  by Robin Hunicke, Marc LeBlanc, Robert Zubek (GDC 2001-2004)
- Targets: Roblox (Luau), Unity (C#), Unreal Engine (C++/Blueprint) via engine binding specs

## License

MIT
