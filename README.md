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

## Project Structure

```
specs/                              # Specification layer
├── WORKFLOW.md                     # 8-step process: idea -> implementation
├── glossary.md                     # Shared MDA vocabulary
├── traceability.md                 # Bidirectional links between all specs
├── concept/_schema.md              # Game vision, aesthetic profile, feature map
├── aesthetics/_schema.md           # Player experience goals (observable proxies)
├── dynamics/_schema.md             # Feedback systems, invariants, interaction patterns
├── mechanics/_schema.md            # Player affordances, rules, behavioral contracts
├── tuning/_schema.md               # Parameter ranges, trade-offs, iteration logs
└── assets/
    ├── _schema.md                  # Emotional intent, technical reqs, placeholders
    └── catalog.md                  # Asset registry with status tracking

src/                                # Runtime tools
├── shared/MDALogger.luau           # Structured logging with MDA layer tagging
└── tools/validate-specs.luau       # Spec integrity checker

examples/                           # Reference implementations
└── baby-chase/                     # Complete example from the MDA paper
    ├── aesthetics/                 # AES-001: Playful Discovery
    ├── dynamics/                   # DYN-001: Playful Pursuit Cycle
    ├── mechanics/                  # MEC-001: Movement, MEC-002: Expressions
    ├── tuning/                     # TUN-001: Pacing & Difficulty
    └── assets/                     # 6 asset specs with placeholder protocols

CLAUDE.md                           # AI instructions (read by Claude Code automatically)
```

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
8. **Validation** — Structural integrity check (automated)

Steps 1-3 require human design judgment. Steps 4-8 are increasingly automatable by AI.

## Spec Validation

The validator (`src/tools/validate-specs.luau`) checks:

- All trace references resolve to existing specs
- No mechanics exist without dynamic traces ("in vacuo" check)
- All assets trace to both a mechanic and an aesthetic
- All tuning specs trace to all three MDA layers
- Spec IDs are unique within their layer
- No orphaned specs (existing but never referenced)

## Getting Started

1. Read `specs/glossary.md` to learn the MDA vocabulary
2. Read `specs/WORKFLOW.md` to understand the spec authoring process
3. Look at `examples/baby-chase/` for a complete worked example
4. Create your game concept using `specs/concept/_schema.md`
5. Follow the workflow to spec each feature through all MDA layers

If using Claude Code or another AI assistant, the `CLAUDE.md` file is read automatically and
instructs the AI on how to read specs, implement from them, and debug using the dual perspective.

## Based On

- [MDA: A Formal Approach to Game Design and Game Research](https://users.cs.northwestern.edu/~hunicke/MDA.pdf)
  by Robin Hunicke, Marc LeBlanc, Robert Zubek (GDC 2001-2004)
- Platform: Roblox (Luau), though the spec framework is platform-agnostic

## License

MIT
