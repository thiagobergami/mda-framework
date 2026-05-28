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
Game Concept          "A cozy hide-and-seek round for 2-4 friends, 60s rounds"
      |
      v
Aesthetics (WHY)      "The round should feel like playing together as a single
      |                 social unit, even though the surface mechanic is competitive."
      |                 Primary: Fellowship | Secondary: Sensation
      v
Dynamics (WHAT)       "A 60-second timer caps the round so no hider stays hidden
      |                 forever; on find, the hider becomes next round's seeker so
      |                 nobody is ever eliminated."
      v
Mechanics (HOW)       "Rule 4: Find Detection fires when seeker is within findRange
      |                 studs AND has line-of-sight AND presses interact. findRange
      |                 = TUN-001. Server-authoritative."
      v
Tuning (BALANCE)      "findRangeStuds: 8 [5-15], sensitivity: High
      |                 roundDurationSeconds: 60 [45-90], sensitivity: High"
      v
Assets (CONTENT)      "Cozy hiding-spot variants: 5 distinct silhouettes, pastel
                        palette, < 1500 tris each. Status: concept."
```

AI reads **top-down** to understand intent when implementing. AI reads **bottom-up** to trace
problems when debugging. The MDA paper calls this the "dual perspective" — designers think
M→D→A, players experience A→D→M. Both directions are necessary.

The example above is the running dogfood game — see
[`specs/concept/cozy-hide-and-seek.concept.md`](specs/concept/cozy-hide-and-seek.concept.md)
and its full M/D/A cascade for what a real `specs/` tree looks like.

## The 8 Aesthetic Categories

The MDA paper replaces vague words like "fun" with a directed vocabulary:

| # | Aesthetic    | Frame                        | Example                          |
|---|-------------|------------------------------|----------------------------------|
| 1 | Sensation   | Game as sense-pleasure       | Rez, Tetris Effect               |
| 2 | Fantasy     | Game as make-believe         | Skyrim, Animal Crossing          |
| 3 | Narrative   | Game as drama                | Last of Us, Celeste              |
| 4 | Challenge   | Game as obstacle course      | Dark Souls, Super Meat Boy       |
| 5 | Fellowship  | Game as social framework     | Among Us, MMOs                   |
| 6 | Discovery   | Game as uncharted territory  | Outer Wilds, Zelda: BotW         |
| 7 | Expression  | Game as self-discovery       | Minecraft Creative, LittleBigPlanet |
| 8 | Submission  | Game as pastime              | Stardew Valley, Cookie Clicker   |

Every spec in this framework uses these categories. Every design trade-off is resolved by
asking: "which aesthetic is primary?"

## Getting Started

**Front door — hybrid.** The MDA Framework has two equally-valid entry points. The `mda`
CLI (`npx mda`, `npm run spec`) is the **authoring** path: solo developers writing concept →
aesthetic → dynamic → mechanic → tuning → asset → level at the keyboard. **MDA Studio**
(`mda-studio/`) is the **operating** path: a team-facing service that holds the state the
CLI can't — registered games, issues, costs, approvals, and (later) agent runs. Authoring
solo? Use the CLI. Coordinating with others, or driving long-running work? Use the studio.
See [`design/decisions/2026-05-27-front-door.md`](design/decisions/2026-05-27-front-door.md)
for the full rationale.

The two front doors are not separate stacks. The studio drives the CLI as a subprocess
(via the `mda-runner` service) and parses its JSON output — one engine, one set of
validators, one set of gates.

### Authoring solo (CLI)

The CLI is the fastest path from "I have a game idea" to "I have validated specs". One
install at the repo root, no service to keep running.

Prerequisites: [Node.js](https://nodejs.org/) ≥ 18.

```bash
git clone <this-repo>
cd framework
npm install              # installs the `mda` CLI + wizard deps
```

There is **no build step**. The `mda` CLI runs `tools/src/cli.ts` directly through `tsx`
via the shim at `tools/bin/mda.cjs`. Editing `tools/src/*.ts` and re-invoking `npx mda`
picks up the change immediately.

Use the **spec wizard** — it walks Concept → Aesthetics → Dynamics → Mechanics →
Assets → Tuning → Levels, branches its menu off what already exists in `specs/`, and
pre-fills frontmatter from your answers:

```bash
npm run spec
```

Useful flags:

```bash
npm run spec -- --dry-run       # show which mda commands would run, write nothing
npm run spec -- --dir /path     # operate on a different project root
```

If you prefer hand-authoring, the same scaffolding is available via `npx mda new` directly —
see [CLI Usage](#cli-usage) below. Validate any time with `npx mda validate`, and run a
layer's quality gate with `npx mda gate <layer>`.

### Operating with the studio

The studio is an Express + React service under `mda-studio/` that holds operator state the
CLI can't keep: registered games, issue counters, cost events, approvals, and (later) agent
runs. Reach for it when more than one person needs the same view, when state has to survive
a restart, or when you want to drive long-running asset-plan execution from a UI.

Prerequisites: [Node.js](https://nodejs.org/) ≥ 20, [pnpm](https://pnpm.io/) 9.x.

```bash
cd mda-studio
pnpm install
pnpm mda-studio onboard --yes    # first-run housekeeping: creates the local pglite
                                  # instance, runs a smoke query, prints next steps
pnpm --filter @mda-studio/server dev    # API on 127.0.0.1:3100
pnpm --filter @mda-studio/ui dev        # UI  on 127.0.0.1:3101 (proxies /api → 3100)
```

Open `http://127.0.0.1:3101`, hit **Register a game**, and point the form at a folder that
contains `specs/concept/<game>.concept.md`. Everything else (the spec tree, the Validate
button, the "+" CTAs that scaffold new specs, the asset-plan generate/exec/import buttons)
flows from there.

Full docs — env vars, schema, operator guide — live in
[`mda-studio/README.md`](mda-studio/README.md).

## CLI Usage

The `mda` CLI provides four commands for working with specs. Every command emits
machine-readable output when `--json` is set; the studio's `mda-runner` service relies on
those contracts, documented in [`tools/README.md`](tools/README.md).

### `mda validate` — Check spec integrity

Runs validation rules across all specs to catch structural issues.

```bash
npx mda validate                      # human-readable report
npx mda validate --json               # NDJSON when multi-scope; one object per scope
npx mda validate --scope specs        # one scope only
npx mda validate --dir /path/to/proj  # different project root
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
| `frontmatter-schema` | Required frontmatter fields are present per layer | warning |
| `level-references` | LVL specs reference at least one AES, one DYN, one MEC | error |

The `binding-coverage` rule is parked under `_deferredRules` while multi-engine is deferred
([D6.MX1](design/decisions/2026-05-27-multi-engine.md)). The rule code stays in tree so
re-enabling it is a one-line change once a real second-engine target appears.

Exit code is `0` on pass, `1` on any error-level diagnostic.

### `mda gate <layer>` — Run quality gates

Quality gates verify that a spec is complete and well-formed enough to proceed to the next
layer. Gates check the markdown body content, not just frontmatter.

```bash
npx mda gate concept
npx mda gate dynamic --override "Invariants pending playtest data"
npx mda gate mechanic --strict           # exit 1 on failure
npx mda gate implementation --json       # single compact JSON array
```

**Available gates:**

| Gate | Applies to | Key checks |
|------|-----------|------------|
| `concept` | GAME specs | Vision clarity, aesthetic commitment, core loop, boundaries, feature map, success criteria |
| `aesthetic` | AES specs | Measurable proxies, anti-patterns, precise vocabulary, primary aesthetic classified |
| `dynamic` | DYN specs | Feedback loops with cycle notation, binary invariants (INV-N), degenerate dynamics |
| `mechanic` | MEC specs | Behavioral contract with I/O, testable acceptance criteria, traces to dynamics |
| `implementation` | MEC specs | All mechanic checks + engine binding + upstream specs present |

Gate results are saved to `specs/.gate-status.json` for tracking.

### `mda new <layer> <name>` — Scaffold a new spec

Creates a new spec file from a template with auto-assigned ID and updates traceability.

```bash
npx mda new concept "Lantern Woods"
npx mda new aesthetic "Forest Discovery"
npx mda new dynamic "Creature Reveal Cycle"
npx mda new mechanic "Lantern Interaction"
npx mda new tuning "Lantern Pacing"
npx mda new asset "Firefly Creature"
npx mda new level "Tutorial Forest"        # writes to design/levels/
```

**Machine-readable mode** (used by the studio's `runNew` helper):

```bash
echo '{"traces_to_dynamics":["DYN-001"]}' > /tmp/o.json
npx mda new mechanic "Lantern Interaction" \
  --from-json /tmp/o.json --no-prompt --json
# {"ok":true,"id":"MEC-007","file":"specs/mechanics/...","layer":"mechanic","name":"..."}
```

**What it does:**
- Assigns the next sequential ID (e.g., `AES-002`, `LVL-003`)
- Creates the file at `specs/{layer}/{slug}.{ext}` (or `design/levels/` for level)
- Updates `specs/traceability.md` with a new row
- Merges any frontmatter overrides from `--from-json` (the `id` field is scaffolder-owned
  and cannot be overridden)

### `mda asset-plan {generate,exec,import,list}` — Drive the asset pipeline

The asset-plan subcommands walk an asset from "concept" through reference intake, plan
generation, milestone execution, and engine import. See
[`design/asset-plans/spec.md`](design/asset-plans/spec.md) for the full pipeline.

Every subcommand accepts `--json` and emits NDJSON event lines (`generate-start`,
`milestone-start`, `milestone-complete`, `plan-saved`, …) so the studio's UI can show live
progress. See [`tools/README.md`](tools/README.md) for the full event vocabulary.

## Level Design

Levels live in `design/levels/` rather than `specs/` because they **compose** existing M/D/A
specs into a spatial/temporal arrangement — they don't define new mechanics, dynamics, or
aesthetics. See `design/levels/_schema.md` for the full schema and
[`design/levels/sunlit-den.level.md`](design/levels/sunlit-den.level.md) for the dogfood
example.

A level spec contains 11 required sections; frontmatter requires a `references:` block
listing the AES, DYN, MEC, and AST specs the level uses (the validator's `level-references`
rule enforces at least one of each).

```yaml
---
id: LVL-001
name: Sunlit Den
status: blockout | playable | polished
references:
  aesthetics: [AES-001, AES-002, AES-003]
  dynamics:   [DYN-001, DYN-002, DYN-003]
  mechanics:  [MEC-004, MEC-005, MEC-006]
  assets:     [AST-001, AST-002]
estimated_duration: 75
---
```

Author a level with `npm run spec` (then pick "Design a level") or `npx mda new level "..."`.

## Spec Wizard

`npm run spec` launches an interactive wizard at `design/pipeline/cli/`. It does two things
the bare `mda new` doesn't:

1. **Branched menus** — only offers what makes sense given the current state of `specs/`.
   You won't see "Add a mechanic" until at least one dynamic exists.
2. **Frontmatter pre-fill** — asks high-level questions (primary aesthetic, traces, level
   status) and patches the answers into the scaffolded file so you start with the body.

The wizard shells out to `mda new` for actual file creation and runs `mda validate` on
demand from the menu. Source: `design/pipeline/cli/{index.ts,prompts/,lib/}`.

## MDA Studio (operator surface)

Specs and the `mda` CLI cover authoring — version-controlled markdown is the source of truth
for game design. **MDA Studio** (`mda-studio/`) is the running service that owns the
*operational* data those sessions accumulate.

What works today:

- **Register a game** from the UI by pointing at a workspace folder (no env-var dance —
  the env-var bootstrap moved to a CI appendix).
- **Spec tree** rendered from a live filesystem scan plus a chokidar watcher that fires SSE
  `node-changed` events whenever a spec file is added, modified, or deleted.
- **Validate button** in the chrome that drives `mda validate --json` as a subprocess and
  surfaces diagnostics as warning badges on the relevant spec rows.
- **Inline "+" CTAs** that call `mda new` through the runner so the studio can scaffold
  specs without dropping to a shell.
- **Issues, costs, approvals, and activity** stored either in memory or in an embedded
  pglite database, chosen by `MDA_STUDIO_PERSISTENCE` (default `memory`).
- **Asset-plan generate / exec / import** buttons per asset, with NDJSON event streaming.
- **`mda-studio onboard`** CLI for first-run housekeeping (creates the instance dir, opens
  the embedded DB, prints next-step commands).

It's a pnpm workspace with five packages:

- `@mda-studio/shared` — zod schemas (including the CLI JSON contracts) and API path helpers
- `@mda-studio/db` — drizzle schema (5 tables: `studios`, `games`, `issues`, `cost_events`,
  `approvals`), a config resolver that picks between `pglite` (default), an external
  `DATABASE_URL`, or the opt-in `embedded-postgres` path, and a real `createClient` that
  returns a Drizzle instance
- `@mda-studio/server` — Express app with the routes above, a chokidar-based
  `spec-watcher` per registered game, and the `mda-runner` subprocess driver
- `@mda-studio/ui` — React 18 + Vite SPA, vanilla History API and `fetch` (TanStack stack
  deferred until routing/cache complexity demands it)
- `@mda-studio/cli` — the `mda-studio` operator CLI

Quick start:

```bash
cd mda-studio
pnpm install
pnpm mda-studio onboard --yes
pnpm --filter @mda-studio/server dev
pnpm --filter @mda-studio/ui dev
open http://127.0.0.1:3101
```

Full docs live in [`mda-studio/README.md`](mda-studio/README.md) and the day-to-day operator
guide is [`mda-studio/docs/operator-guide.md`](mda-studio/docs/operator-guide.md).

## Project Structure

```
specs/                              # Canonical M/D/A truth — behavioral contracts, balance, experience
├── WORKFLOW.md                     # 8-step process: idea -> implementation
├── glossary.md                     # Shared MDA vocabulary
├── traceability.md                 # Bidirectional links between all specs
├── concept/                        # Game vision, aesthetic profile, feature map
│   ├── _schema.md
│   └── cozy-hide-and-seek.concept.md   # Dogfood game
├── aesthetics/                     # Player experience goals (observable proxies)
├── dynamics/                       # Feedback systems, invariants, interaction patterns
├── mechanics/                      # Player affordances, rules, behavioral contracts
├── tuning/                         # Parameter ranges, trade-offs, iteration logs
├── assets/                         # Emotional intent, technical reqs, placeholders
└── bindings/                       # Engine-specific mapping specs (parked under multi-engine)

design/                             # Iterative artifacts — consume specs, never define new primitives
├── README.md                       # Boundary between specs/ and design/
├── decisions/                      # ADR-style decision notes (front-door, embedded DB, dogfood, …)
├── levels/                         # Spatial layouts, beat charts, encounters
├── flows/                          # Player journeys: onboarding, progression
├── roadmap/                        # Parked roadmaps (e.g. multi-engine)
├── walkthroughs/                   # End-to-end walkthroughs of the framework
├── asset-plans/                    # MCP-driven asset implementation pipeline
└── pipeline/                       # `npm run spec` wizard

tools/                              # The `mda` CLI (TypeScript, run through tsx)
├── README.md                       # Machine-readable JSON contracts
├── bin/mda.cjs                     # Shim — runs src/cli.ts via tsx
└── src/                            # No build step; tsx loads .ts directly
    ├── cli.ts                      # Commander entry point
    ├── parser.ts                   # Frontmatter parser with scope discovery
    ├── graph.ts                    # Spec adjacency-list graph builder
    ├── reporter.ts                 # Terminal and JSON output formatting
    ├── scaffold.ts                 # Spec template generation + override merge
    ├── asset-plan/                 # Pipeline (generate/exec/import/list)
    ├── rules/                      # Validation rules (binding-coverage parked)
    └── gates/                      # Quality gates

mda-studio/                         # Operator surface — see mda-studio/README.md
├── server/                         # @mda-studio/server — Express + mda-runner + spec-watcher
├── ui/                             # @mda-studio/ui — React SPA
├── cli/                            # @mda-studio/cli — `mda-studio onboard`
└── packages/
    ├── shared/                     # @mda-studio/shared — zod schemas (incl. CLI contracts)
    └── db/                         # @mda-studio/db — drizzle schema + pglite/pg client

src/                                # Runtime tools (Luau)
├── shared/MDALogger.luau           # Structured logging with MDA layer tagging
└── tools/validate-specs.luau       # Legacy Luau spec validator

CLAUDE.md                           # AI instructions (read by Claude Code automatically)
```

## Future: Multi-Engine Support

> **Status: deferred.** Roblox is the only engine the framework targets today. Multi-engine
> work re-opens when a real game ships against Roblox and a real second-engine target
> arrives with a motivating game attached. See
> [`design/decisions/2026-05-27-multi-engine.md`](design/decisions/2026-05-27-multi-engine.md)
> and the parked roadmap at
> [`design/roadmap/multi-engine.md`](design/roadmap/multi-engine.md).

The framework was designed to separate behavioral specs (what the game does) from engine
bindings (how a specific engine implements it). The binding directory (`specs/bindings/`),
the `binding-coverage` validator rule, and the asset-plan engine profiles
(`design/asset-plans/_engines/`) stay in tree so the work is cheap to revive — but until a
second engine target lands, treat the framework as Roblox-only.

## Structured Logging

Every game event is tagged with its MDA layer and spec ID at runtime:

```
[00:15.234] [M:MEC-005] [INFO] [HIDE]         cid=3 player=u1 spot=basket novel=true
[00:25.891] [M:MEC-005] [INFO] [FIND]         cid=7 seeker=u2 hider=u1 spot=basket
[00:25.891] [D:DYN-002] [PASS] [INVARIANT]    cid=7 inv=INV-1 detail="first found becomes seeker"
[03:12.000] [A:AES-001] [PASS] [PROXY_CHECK]  proxy=post_find_chat_density value=0.6 target=0.5
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

### Walkthroughs

- [`design/walkthroughs/v1-end-to-end.md`](design/walkthroughs/v1-end-to-end.md) — a
  scripted end-to-end pass through the framework from "rough idea" to a running Roblox
  implementation, showing how the gates and the implementation-debug loop fit together.
- [`design/decisions/2026-05-27-dogfood-log.md`](design/decisions/2026-05-27-dogfood-log.md)
  — the friction log captured while authoring the cozy hide-and-seek dogfood end-to-end.
  Real surface-area issues, not synthetic ones.

## Based On

- [MDA: A Formal Approach to Game Design and Game Research](https://users.cs.northwestern.edu/~hunicke/MDA.pdf)
  by Robin Hunicke, Marc LeBlanc, Robert Zubek (GDC 2001-2004)
- Target engine today: Roblox (Luau). Multi-engine deferred — see above.

## License

MIT
