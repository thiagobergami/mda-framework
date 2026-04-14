# MDA Spec-Driven Game Development Framework

This project uses the MDA framework (Mechanics, Dynamics, Aesthetics) by Hunicke, LeBlanc & Zubek
to drive game implementation through structured specifications. Every feature is specified across
three causal layers before code is written.

**Core principle: Games are artifacts, not media. The content of a game is its behavior — not
the media that streams out of it towards the player.**

## Project Structure

```
specs/
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

src/
├── shared/MDALogger.luau        # Structured runtime logging (MEC-003)
└── tools/validate-specs.luau    # Spec integrity validator

examples/                        # Reference implementations (not part of the game)
└── baby-chase/                  # Complete example from the MDA paper
```

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
- Spec in order: Concept → Aesthetics → Dynamics → Mechanics → Assets → Tuning
- Run `validate-specs` after adding specs to check integrity
- Update `specs/traceability.md` after every new spec

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

- Runtime: Roblox (Luau)
- Specs reference Roblox services, instances, and APIs where applicable
- Logger module: `src/shared/MDALogger.luau` (MEC-003)
- Validator: `src/tools/validate-specs.luau`
