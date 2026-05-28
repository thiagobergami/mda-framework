# MDA Spec-Driven Game Development Framework

This project uses the MDA framework (Mechanics, Dynamics, Aesthetics) by Hunicke, LeBlanc & Zubek
to drive game implementation through structured specifications. Every feature is specified across
three causal layers before code is written.

**Core principle: Games are artifacts, not media. The content of a game is its behavior — not
the media that streams out of it towards the player.**

**Front door — hybrid.** The MDA Framework has two equally-valid entry points. The `mda`
CLI (`npx mda`, `npm run spec`) is the **authoring** path: solo developers writing concept →
aesthetic → dynamic → mechanic → tuning → asset → level at the keyboard. **MDA Studio**
(`mda-studio/`) is the **operating** path: a team-facing service that holds the state the
CLI can't — registered games, issues, costs, approvals, and (later) agent runs. Authoring
solo? Use the CLI. Coordinating with others, or driving long-running work? Use the studio.
See [`design/decisions/2026-05-27-front-door.md`](design/decisions/2026-05-27-front-door.md)
for the full rationale.

The two front doors share one engine. The studio drives the CLI via subprocess (the
`mda-runner` service in `mda-studio/server/`); it never re-implements validators, gates,
or scaffolding. A change to `tools/src/*.ts` is immediately visible from both surfaces
because there is no build step — the shim at `tools/bin/mda.cjs` runs the TypeScript
sources through `tsx`.

## Project Structure

```
specs/                           # Canonical M/D/A truth — behavioral contracts, balance, experience
├── WORKFLOW.md                  # Step-by-step spec authoring process — read this for process
├── glossary.md                  # Shared vocabulary — read this for terminology
├── traceability.md              # Bidirectional links between all specs
├── concept/
│   ├── _schema.md               # How to write game concept docs
│   └── {game}.concept.md        # The root — game vision, aesthetic profile, feature map
├── aesthetics/
│   ├── _schema.md               # How to write aesthetic specs
│   └── {feature}.aes.md         # Player experience goals (WHY)
├── dynamics/
│   ├── _schema.md               # How to write dynamic specs
│   └── {feature}.dyn.md         # Emergent behavior & feedback systems (WHAT emerges)
├── mechanics/
│   ├── _schema.md               # How to write mechanic specs
│   └── {feature}.mec.md         # Player actions, rules & content (HOW it works)
├── tuning/
│   ├── _schema.md               # How to write tuning specs
│   └── {feature}.tune.md        # Adjustable parameters & iteration log (BALANCE)
└── assets/
    ├── _schema.md               # How to write asset specs
    ├── catalog.md               # Master registry of all game assets
    └── {name}.asset.md          # Asset requirements, emotional intent, placeholders

design/                          # Iterative artifacts that CONSUME specs — never define new primitives
├── README.md                    # Explains the boundary between specs/ and design/
├── decisions/                   # ADR-style decision notes (front-door, embedded DB, dogfood, …)
├── levels/                      # Level / environment design
│   ├── _schema.md               # How to write a level spec
│   └── {level}.level.md         # Spatial layout, beat chart, encounters, affordances
├── flows/                       # Player journeys: onboarding, progression, retention
├── roadmap/                     # Parked roadmaps (e.g. multi-engine)
├── walkthroughs/                # End-to-end walkthroughs of the framework
├── asset-plans/                 # MCP-driven asset implementation pipeline
│   ├── spec.md                  # Feature spec (SDD)
│   ├── plan.md                  # Implementation plan
│   ├── _routing.md              # Asset type → tool routing table
│   ├── _style-guide.md          # Global style anchors
│   ├── _tools/{tool}.md         # Per-tool profiles (blender, photoshop, …)
│   ├── _engines/{engine}.md     # Per-engine import profiles
│   └── {asset-id}/              # Generated per asset: refs/, plan versions, output/
└── pipeline/                    # Guided spec-authoring tool — `npm run spec`
    ├── cli/                     # Node.js CLI wizard
    └── web/                     # Web UI (deferred)

src/
├── shared/MDALogger.luau        # Structured runtime logging (MEC-003)
└── tools/validate-specs.luau    # Spec integrity validator

tools/                           # The `mda` CLI — no build step (tsx via tools/bin/mda.cjs)
├── README.md                    # Machine-readable JSON contracts
├── bin/mda.cjs                  # Shim — runs src/cli.ts via tsx
└── src/
    ├── cli.ts                   # Commander entry point
    ├── scaffold.ts              # Spec template generation + override merge
    ├── asset-plan/              # Pipeline (generate/exec/import/list) with NDJSON events
    ├── rules/                   # Validation rules (binding-coverage parked)
    └── gates/                   # Quality gates

mda-studio/                      # Operator surface — pnpm workspace, separate from root npm project
├── README.md                    # How to install, run, and configure the studio
├── server/                      # @mda-studio/server: Express + mda-runner + spec-watcher
├── ui/                          # @mda-studio/ui: React 18 + Vite SPA
├── cli/                         # @mda-studio/cli: `mda-studio onboard`
└── packages/
    ├── shared/                  # @mda-studio/shared: zod schemas (incl. CLI contracts)
    └── db/                      # @mda-studio/db: drizzle schema + pglite/pg client
```

### Where work happens — the three planes

```
┌─────────────────────────────────────────────────────────────┐
│  CONTENT plane   specs/  design/levels/  design/asset-plans │
│  ENGINE plane    tools/  src/shared/MDALogger.luau          │
│  SURFACE plane   mda-studio/  (operator UI + server + db)   │
└─────────────────────────────────────────────────────────────┘
```

- **CONTENT** holds canonical M/D/A truth, level compositions, and asset plans. Authored by
  hand (or with the wizard) and read by everything below it.
- **ENGINE** holds the validator, the spec CLI, the scaffolder, and the Roblox runtime
  logger. Engine code consumes content; the studio drives engine code via subprocess.
- **SURFACE** is the studio: the operator UI, server, and database. Surface depends on
  engine and reads content; never the other way around.

When picking where new code goes: ask which plane it lives in. Cross-plane shortcuts
(SURFACE writing directly into `specs/` without going through ENGINE; ENGINE depending on
SURFACE state) are the wrong direction and should fail review.

## The Dual Perspective

MDA has two directions of reading. You MUST use both:

### Designer Perspective (M → D → A) — Use when IMPLEMENTING

```
Mechanics → give rise to → Dynamics → which produce → Aesthetics
```

1. Read the mechanic spec — implement the rules, actions, and control mechanisms
2. Validate against the dynamic spec — does the intended behavior emerge?
3. Validate against the aesthetic spec — does it produce the target experience?

### Player Perspective (A → D → M) — Use when DEBUGGING or TUNING

```
Aesthetics → set the tone for → Dynamics → which expose → Mechanics
```

1. Start from the aesthetic spec — what experience is broken or missing?
2. Trace to dynamics — which feedback system is misfiring?
3. Trace to mechanics — which rule, parameter, or action needs adjustment?

## Rules for AI

### Before writing any code:
1. Read `specs/concept/` to understand the game vision and aesthetic profile
2. Read `specs/glossary.md` to understand the shared vocabulary
3. Read the relevant aesthetic spec to understand WHY this feature exists
4. Read the relevant dynamic spec to understand WHAT behavior should emerge
5. Read the relevant mechanic spec to understand HOW to implement it
6. Check `specs/traceability.md` to understand dependencies between specs

### When implementing:
- Follow `specs/WORKFLOW.md` for the full authoring and implementation process
- Every mechanic you implement MUST trace upward to a dynamic and an aesthetic
- No mechanic should exist "in vacuo" — isolated from its effect on behavior and experience
- Mechanics describe player-afforded actions and behaviors, not just data structures
- Game content (levels, assets, spawn points) is part of mechanics
- Focus on BEHAVIOR contracts — what the system does, not just what data it holds
- Add MDALogger calls for every game event, invariant check, and metric tracking

### When referencing assets:
- Check `specs/assets/catalog.md` BEFORE writing code that uses any asset
- If an asset is `concept` status: write code structure but add a `-- PLACEHOLDER NEEDED: AST-XXX` comment
- If `placeholder` or above: use it directly via CollectionService tags and Attribute names
- NEVER hard-code asset paths below the container level — always use tags and attributes
- Read the asset spec's "Placeholder Protocol" to know which properties code can rely on

### When something breaks:
- Use the Player Perspective (A → D → M) to diagnose
- Start from the aesthetic — which of the 8 aesthetic categories is failing?
- Trace through dynamics — which feedback loop is amplifying or dampening incorrectly?
- Arrive at the mechanic — what specific rule or parameter needs to change?
- Use MDA logs to trace with real runtime data (see Debugging section below)

### When tuning:
- Read the tuning spec for parameter ranges and target metrics
- Make small, isolated changes — one parameter at a time
- Validate changes against dynamic invariants BEFORE checking aesthetic proxies
- Record tuning changes in the tuning spec's iteration log

### When creating new specs:
- Follow `specs/WORKFLOW.md` for the step-by-step process
- Always start from the Game Concept — new features must appear in the feature map
- Spec in order: Concept → Aesthetics → Dynamics → Mechanics → Assets → Tuning → Levels
- Prefer `npm run spec` (the wizard) — it branches its menu off existing specs and pre-fills
  frontmatter. `npx mda new <layer> <name>` is the manual fallback.
- Run `npx mda validate` after adding specs to check integrity
- `mda new` auto-updates `specs/traceability.md`; manual edits to traceability are rarely needed

### When implementing an asset (MCP-driven pipeline):
- Place reference inputs in `design/asset-plans/{asset-id}/refs/` before generating
- `mda asset-plan generate <asset-id>` produces `{asset-id}.v{N}.plan.md` — does NOT execute
- `mda asset-plan exec <asset-id>` walks milestones, prompts after each, persists state
- `mda asset-plan import <asset-id>` lands the artifact in the engine after exec succeeds
- Tool profiles live in `design/asset-plans/_tools/{tool}.md`; engine profiles in `_engines/`
- When MCP servers are absent, every command degrades gracefully — instructions print and
  state still tracks; re-run with `--resume` to continue
- All four subcommands support `--json` and emit NDJSON event lines for studio consumption
- See `design/asset-plans/spec.md` for the full feature spec, `plan.md` for the
  implementation plan

### When working with levels:
- Levels live in `design/levels/`, NOT `specs/` — they compose existing M/D/A specs into a
  spatial/temporal arrangement and never define new primitives
- Every level MUST reference at least one AES, one DYN, and one MEC via the `references:`
  block in frontmatter (enforced by the `level-references` validator rule)
- Use `design/levels/_schema.md` as the authoritative spec for the 11 required sections
- `design/levels/_example.level.md` is reference documentation (skipped by the validator)
- `status` is one of `blockout | playable | polished` — promote only after the prior state's
  goals (geometry, encounter wiring, art/audio) are met

### Things in `design/` vs `specs/`:
- `specs/` holds canonical M/D/A truth: behavioral contracts, balance, experience goals
- `design/` holds iterative artifacts that *consume* specs: levels, flows, the wizard tool
- Artifacts in `design/` MUST reference specs by ID — never introduce new aesthetic, dynamic,
  mechanic, or asset primitives there
- See `design/README.md` for the full boundary rules

### When working on the `mda` CLI (`tools/`):
- **No build step.** The `bin` field in `tools/package.json` points at the shim
  `tools/bin/mda.cjs`, which runs `src/cli.ts` through `tsx`. Don't add `tsc` build scripts
  or `dist/` outputs.
- Every command must support `--json`. The studio's `mda-runner` parses the last non-empty
  stdout line as JSON — keep stdout clean in JSON mode and route diagnostics to stderr.
- Zod schemas for every JSON contract live in
  `mda-studio/packages/shared/src/schemas/mda-cli.ts`. Both the CLI emitter and the runner
  import the same schema; drift breaks one of the two test suites immediately.
- `binding-coverage` is in the rules folder but **not** in the default rule set (parked
  under `_deferredRules` per the multi-engine deferral). Leave it in tree.
- Tests use Node's built-in `node:test` runner via `tsx --test`; run them with
  `npm test` from `tools/`.

### When working in `mda-studio/`:
- It's a **pnpm workspace** (pinned to `pnpm@9.11.0`), NOT the root npm project. Run
  `pnpm install` / `pnpm dev` / `pnpm test` from `mda-studio/`, never `npm` there.
- Packages cross-reference via `workspace:*` — when adding a package, register it in
  `pnpm-workspace.yaml` (or under an existing glob) before adding deps that point to it.
- The studio is the *operator surface*: persistent state about studios, issue counters,
  games, issues, cost events, approvals. Specs in `specs/` remain the source of
  truth for design — never move design primitives into the database.
- HTTP paths are built via `apiPath()` / `healthPath()` in `@mda-studio/shared` — don't
  hardcode `/api/...` strings in the server.
- Every package ships a `vitest.config.ts` and tests live next to source. Run
  `pnpm --filter @mda-studio/<pkg> test` for a single package.
- See `mda-studio/README.md` for env vars, scripts, and the full schema reference.

#### Driving the engine from the studio (`mda-runner`)
- The studio NEVER reads or writes `specs/` files directly. It spawns `npx mda <cmd> --json`
  via the `mda-runner` service (`server/src/services/mda-runner.ts`) and parses the last
  stdout line through the shared zod schema. New CLI work means: (1) add the command to
  `tools/src/cli.ts`, (2) add a zod schema in `@mda-studio/shared`, (3) add a helper
  (`runValidate`, `runGate`, `runNew`, …) in `mda-runner.ts`, (4) call from a route.
- `MDA_BIN` env var overrides which binary the runner spawns. Tests set it to the
  framework's local `mda` shim so subprocess calls don't hit npm registry resolution from a
  fresh tmpdir.

#### Persistence (`@mda-studio/db` + `services/stores/`)
- `resolveDatabaseConfig` picks one of three drivers:
  - `pglite` (default when `DATABASE_URL` is unset) — embedded, cross-platform.
  - external Postgres via `DATABASE_URL`.
  - `embedded-postgres` opt-in via `MDA_STUDIO_DB_DRIVER=embedded-postgres` (not yet wired;
    throws a descriptive error today — see plan §5 for the follow-up).
- Five tables defined: `studios`, `games`, `issues`, `cost_events`, `approvals`. Schema
  files live in `packages/db/src/schema/`. Migrations are generated via
  `pnpm --filter @mda-studio/db db:generate` and applied via `db:migrate`.
- Each operational store has three files under `server/src/services/stores/`:
  - `<name>-store.ts` — interface + factory
  - `<name>-store-memory.ts` — pure in-process impl
  - `<name>-store-db.ts` — Drizzle-backed impl
- `MDA_STUDIO_PERSISTENCE=db` switches the runtime to the DB-backed impls; `memory` (the
  default) keeps tests fast.
- The legacy `services/{games-registry,issues-store,cost-events-store,approvals-store}.ts`
  files are facades: a sync shadow Map for reads, an async write to the configured store,
  and a `rehydrate*FromStore()` function called from `server/src/index.ts` on boot. Routes
  consume the facades' free-function exports and never need to await.
- Shared contract test: `services/stores/stores.contract.test.ts` runs every interface
  test against both impls. Add a behavior here when you add it to either store.

#### Spec-tree liveness (`spec-watcher`)
- Every registered game gets a chokidar `spec-watcher` (`services/spec-watcher.ts`) that
  publishes `node-changed` studio events when files under `specs/**/*.md` or
  `design/levels/**/*.md` change. The UI's SSE bridge re-emits these so the spec tree
  refreshes without F5.
- WSL/Windows hosts auto-enable polling mode (10× the latency, but reliable). The two
  fs-event integration tests are skipped by default; set
  `VITEST_FS_WATCHER_INTEGRATION=1` to run them on a host with native inotify.

## The 8 Aesthetic Categories (Quick Reference)

| # | Aesthetic  | Frame                        |
|---|------------|------------------------------|
| 1 | Sensation  | Game as sense-pleasure       |
| 2 | Fantasy    | Game as make-believe         |
| 3 | Narrative  | Game as drama                |
| 4 | Challenge  | Game as obstacle course      |
| 5 | Fellowship | Game as social framework     |
| 6 | Discovery  | Game as uncharted territory  |
| 7 | Expression | Game as self-discovery       |
| 8 | Submission | Game as pastime              |

Always use these categories — never use vague words like "fun" or "gameplay" in specs.

## Debugging with MDA Logs

This project uses structured logging (`src/shared/MDALogger.luau`, spec MEC-003) that tags
every runtime event with its MDA layer and spec ID.

### Log Format

```
[MM:SS.mmm] [LAYER:SPEC_ID] [LEVEL] [EVENT_TYPE] key=value key=value ...
```

### Log Levels

| Level | Purpose |
|-------|---------|
| TRACE | Per-frame data (disabled by default) |
| DEBUG | Internal state changes |
| INFO  | Game events — discoveries, state transitions, etc. |
| WARN  | Degraded behavior, metric drifting out of range |
| ERROR | Invariant violation, broken contract |
| PASS  | Invariant or proxy validated successfully |
| FAIL  | Invariant or proxy violated |

### Debugging Workflow (A → D → M with log data)

1. Filter for `[FAIL]` and `[WARN]` — find what's broken
2. Check `[A:AES-*] [PROXY_CHECK]` — which aesthetic proxy is out of range?
3. Check `[D:DYN-*] [INVARIANT]` — which dynamic invariant failed?
4. Filter by correlation ID (`cid=N`) — trace the full causal chain
5. Read `[M:MEC-*]` in that chain — which mechanic event preceded the failure?
6. Cross-reference the mechanic spec — which rule or parameter is off?

### Common Filters

| Looking for | Filter |
|-------------|--------|
| All failures | `[FAIL]` |
| Specific spec | `[M:MEC-001]` |
| Invariant checks | `[INVARIANT]` |
| Proxy validation | `[PROXY_CHECK]` |
| One causal chain | `cid=7` |
| Session summary | `[SUMMARY]` |

### Logger API

```luau
local Log = require(path.to.MDALogger)

-- Log game events
Log.info("M", "MEC-001", "EVENT_NAME", { key = "value", num = 42 })

-- Correlate events across specs in the same moment
local cid = Log.correlate()
Log.info("M", "MEC-001", "EVENT_A", { data = 1 }, cid)
Log.info("M", "MEC-002", "EVENT_B", { data = 2 }, cid)

-- Validate dynamic invariants at runtime
Log.checkInvariant("DYN-001", "INV-1", condition, "detail string")

-- Track metrics for aesthetic proxy validation
Log.trackMetric("AES-001", "proxy_name", measuredValue, target, tolerance)

-- Emit full session summary
Log.summary()
```

## Platform

- Game runtime: Roblox (Luau). Multi-engine deferred per
  [`design/decisions/2026-05-27-multi-engine.md`](design/decisions/2026-05-27-multi-engine.md).
- Specs reference Roblox services, instances, and APIs where applicable.
- Logger module: `src/shared/MDALogger.luau` (MEC-003), engine scope deferred for non-Roblox.
- Validator: `src/tools/validate-specs.luau`.
- Spec CLI / wizard (`tools/`, `design/pipeline/cli/`): Node.js >= 18. No build step — `tsx`
  loads `tools/src/cli.ts` directly via the `tools/bin/mda.cjs` shim. Run via `npm` from
  the repo root.
- Studio service (`mda-studio/`): Node.js >= 20, run via `pnpm` from `mda-studio/`. First
  run goes through `pnpm mda-studio onboard --yes` to create the embedded pglite instance.
