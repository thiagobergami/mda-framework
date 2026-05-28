# Workflow Simulation: Idea to Implementation

A complete walkthrough of how a designer/developer uses the MDA framework to go from a
rough game idea to a running Roblox Studio implementation, using the improved multi-engine
architecture. This is a simulation — the game is fictional, but every step reflects the
real process.

**Game used in this simulation**: "Lantern Woods" — a co-op exploration game where players
carry lanterns through a dark forest, revealing hidden creatures that react to light.

---

## Dataflow Overview

```
                          DESIGNER'S HEAD
                               │
                               │ rough idea (may be vague)
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     PHASE 1: CONCEPT REFINEMENT                      │
│                                                                     │
│    ┌──────────┐    ┌────────────────┐    ┌──────────────┐           │
│    │ Designer │───▶│  AI drafts     │───▶│  CONCEPT     │           │
│    │ describes│    │  concept spec  │    │  READINESS   │           │
│    │ idea     │    └────────────────┘    │  GATE        │           │
│    └──────────┘                          │  (6 checks)  │           │
│         ▲                                └──────┬───────┘           │
│         │                                       │                   │
│         │              ┌────── FAIL ◄───────────┤                   │
│         │              │                        │                   │
│         │              ▼                     PASS                   │
│         │    ┌──────────────────┐               │                   │
│         └────│ AI proposes fix  │               ▼                   │
│              │ for failing check│         PROCEED TO                │
│              └──────────────────┘         PHASE 2                   │
│                                                                     │
│    Loop: typically 2-4 iterations for a rough idea                  │
└──────────────────────────────────────────────────────────────────────┘
                               │
                               │ validated concept
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   PHASE 2: SPEC AUTHORING (gated)                    │
│                                                                     │
│  ┌─────────┐ GATE  ┌─────────┐ GATE  ┌─────────┐ GATE ┌─────────┐ │
│  │ Concept │──✓──▶│  Aes.   │──✓──▶│  Dyn.   │──✓──▶│  Mec.   │ │
│  │ GAME-002│       │ AES-002 │       │ DYN-002 │       │ MEC-004 │ │
│  └─────────┘       │ AES-003 │       │ DYN-003 │       │ MEC-005 │ │
│                    └─────────┘       └─────────┘       │ MEC-006 │ │
│                         │                │             └────┬────┘ │
│                         │                │                  │      │
│             GATE        ▼        GATE    ▼          GATE    ▼      │
│              ✓     ┌─────────┐    ✓ ┌─────────┐     ✓ ┌─────────┐ │
│              │     │  Asset  │    │ │ Tuning  │     │ │ Binding │ │
│              │     │ AST-007 │    │ │ TUN-002 │     │ │ BIND-001│ │
│              │     │ AST-008 │    │ │ TUN-003 │     │ │ BIND-002│ │
│              │     └─────────┘    │ └─────────┘     │ │ BIND-003│ │
│              │                    │                  │ └─────────┘ │
│              │                    │                  │ (roblox/)   │
│              ▼                    ▼                  ▼             │
│         ┌──────────────────────────────────────────────┐           │
│         │            IMPLEMENTATION GATE               │           │
│         │   All layer gates pass + bindings exist      │           │
│         └──────────────────┬───────────────────────────┘           │
│                            │                                       │
│              ┌─────────────┴─────────────┐                         │
│              │     Traceability Matrix    │                         │
│              │     (auto-updated by CLI)  │                         │
│              └───────────────────────────┘                         │
└──────────────────────────────────────────────────────────────────────┘
                               │
                               │ all gates passed
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│               PHASE 3: IMPLEMENTATION-DEBUG LOOP                     │
│                                                                     │
│             ┌─────────────┐                                         │
│             │  Implement  │◄──────────────────────────────┐         │
│             │  from specs │                               │         │
│             └──────┬──────┘                               │         │
│                    │                                      │         │
│    ┌───────────────┼───────────────┐                      │         │
│    ▼               ▼               ▼                      │         │
│ Claude Code    MCP Server    Roblox Studio                │         │
│ writes .luau   reads specs   runs game via                │         │
│ files          serves tools  Rojo/Argon sync              │         │
│    │               │               │                      │         │
│    │               │    MDABridge  │                      │         │
│    │               │◄──plugin logs─┘                      │         │
│    │               │                                      │         │
│    ▼               ▼                                      │         │
│ ┌──────────────────────────────┐                          │         │
│ │  Playtest + Analyze MDA logs │                          │         │
│ └──────────────┬───────────────┘                          │         │
│                │                                          │         │
│       ┌────────┴────────┐                                 │         │
│       ▼                 ▼                                 │         │
│  All pass          Some fail                              │         │
│       │                 │                                 │         │
│       ▼            ┌────┴────┐                            │         │
│  VALIDATED         ▼         ▼                            │         │
│                Tuning?   Vision change?                   │         │
│                   │         │                             │         │
│                   │         ▼                             │         │
│                   │    VCP protocol                       │         │
│                   │    (re-spec top-down                  │         │
│                   │     through gates)                    │         │
│                   │         │                             │         │
│                   └─────────┴─────────────────────────────┘         │
│                        loop back                                    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Concept Refinement

### What happens: the designer's rough idea is stress-tested

The designer opens Claude Code and describes a rough idea. The framework does NOT
immediately start writing specs. Instead, it enters a **refinement loop** that
pressure-tests the idea against the 6 Concept Readiness checks.

### The conversation

```
Designer:  I want to make a co-op game where 2-4 players explore a dark forest
           carrying lanterns. The lanterns reveal hidden creatures in the
           environment — mushroom sprites, glowing deer, firefly swarms. Each
           creature reacts differently to light. The goal is to fill a "Field
           Journal" by discovering all creature types. It's calm, no combat,
           ages 10+. Target platform is Roblox.
```

Claude drafts a concept spec and immediately runs the readiness gate:

```
Claude:   I've drafted the concept. Let me run the readiness gate before we proceed.

          npx mda gate concept

          Concept Readiness Gate: specs/concept/lantern-woods.concept.md
          ─────────────────────────────────────────────────────────────
          [PASS] Vision clarity
                 "A co-op Discovery game..." — uses aesthetic vocabulary ✓

          [FAIL] Aesthetic commitment
                 Problem: Only 1 aesthetic marked Absent (Challenge).
                 The gate requires at least 2 Absent aesthetics to ensure focus.
                 Current profile has 5 aesthetics active in some capacity.

          [PASS] Core loop coherence
                 Primary loop (Search → Reveal → Journal → Search deeper) serves
                 Discovery (primary) ✓

          [WARN] Boundary definition
                 Only 2 explicit boundaries ("not combat", "not horror").
                 Gate requires at least 3 with aesthetic rationale.
                 Missing: what about competition? Crafting? Base-building?

          [PASS] Feature traceability
                 All 6 features map to aesthetics ✓

          [PASS] Scope realism
                 4 Must-have, 2 Should-have — within bounds ✓

          RESULT: BLOCKED (1 fail, 1 warn)

          Here's what I'd suggest fixing:

          CHECK 2 fix: Mark Expression and Submission as Absent.
            - Expression (building/creating) doesn't fit — players observe, not create
            - Submission (zone-out pastime) doesn't fit — sessions have a clear Journal
              goal, they're not idle
            This gives the design clearer focus: 3 active aesthetics, 3 absent.

          CHECK 4 fix: Add a third boundary:
            - "Not a competitive game: no per-player scores, no racing to discoveries.
              The Journal is shared. Competition would undermine Fellowship."

          Want me to apply these fixes?
```

```
Designer:  Yes, but also add "not a crafting/building game" as a boundary.
           I don't want players collecting resources.
```

```
Claude:   Updated. Re-running the gate:

          npx mda gate concept

          [PASS] Vision clarity ✓
          [PASS] Aesthetic commitment — 1 primary, 2 secondary, 2 tertiary, 3 absent ✓
          [PASS] Core loop coherence ✓
          [PASS] Boundary definition — 4 boundaries with aesthetic rationale ✓
          [PASS] Feature traceability ✓
          [PASS] Scope realism ✓

          RESULT: PASSED (6 pass, 0 fail)
          ✓ Ready to proceed to aesthetic specs.
```

### What the gate caught

Without the gate, the original concept would have led to aesthetic specs that tried to serve
5 aesthetics (Discovery, Fellowship, Fantasy, Sensation, Narrative). That's too many — the
dynamic specs would have conflicting goals, and the mechanics would be pulled in multiple
directions. By forcing Expression and Submission to Absent, the concept now has clear
priorities that cascade cleanly into focused downstream specs.

### Files created after Phase 1

```
specs/concept/lantern-woods.concept.md    (GAME-002, gate: PASSED)
```

---

## Phase 2: Spec Authoring (Gated)

Each layer is authored, then its gate runs before the next layer starts. If a gate fails,
the current layer is fixed BEFORE moving down.

### Dataflow at this phase

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  For each layer (AES → DYN → MEC → TUN/AST/BIND):              │
│                                                                 │
│  ┌──────────┐  npx mda new    ┌───────────┐  write    ┌──────┐ │
│  │ Designer │ ───────────────▶│ CLI       │ ────────▶ │ Spec │ │
│  │ + AI     │  aesthetic      │ scaffolds │  content  │ file │ │
│  │ draft    │  creature-wonder│ file + ID │           │ .md  │ │
│  └──────────┘                 └───────────┘           └──┬───┘ │
│                                                          │     │
│       ┌──────────────────────────────────────────────────┘     │
│       │                                                        │
│       ▼                                                        │
│  ┌──────────────────┐                                          │
│  │ npx mda gate     │                                          │
│  │ {next_layer}     │                                          │
│  └────────┬─────────┘                                          │
│           │                                                    │
│      ┌────┴────┐                                               │
│      ▼         ▼                                               │
│   PASSED     FAILED ──▶ AI shows which checks failed           │
│      │                  and proposes specific fixes             │
│      │                       │                                 │
│      │                       ▼                                 │
│      │                  Designer fixes current layer            │
│      │                  then re-runs gate                       │
│      │                       │                                 │
│      │           ◄───────────┘                                 │
│      ▼                                                         │
│   Proceed to next layer                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Step 2a: Aesthetic Specs → Aesthetic Gate

Claude creates two aesthetic specs:

```
specs/aesthetics/lantern-discovery.aes.md     ← AES-002: Light-Driven Discovery
specs/aesthetics/creature-wonder.aes.md       ← AES-003: Creature Wonder
```

Then runs the aesthetic gate before writing any dynamics:

```
$ npx mda gate dynamics

  Aesthetic → Dynamic Gate
  ────────────────────────
  Checking AES-002 (Light-Driven Discovery):
    [PASS] 4 observable proxies, all measurable
    [PASS] 4 anti-patterns, all have detection signals
    [PASS] Profile consistent with concept (Discovery primary)

  Checking AES-003 (Creature Wonder):
    [PASS] 3 observable proxies, all measurable
    [FAIL] Anti-pattern "reveal fatigue" has no detection signal
           → You say "players stop being impressed by reveals" but how
             do you DETECT this from game data?
    [PASS] Profile consistent with concept

  RESULT: BLOCKED (1 fail)
```

Claude proposes a detection method:

```
Claude:   AES-003 anti-pattern "reveal fatigue" needs a measurable detection signal.
          Suggestion: "Average player pause duration at reveal drops below 0.5s
          for 3 consecutive reveals." This is trackable — the MDA logger records
          how long players stop moving after a creature is revealed.

          The proxy then becomes:
          - reveal_pause_duration: Target >1.0s, Warning <0.8s, Fail <0.5s

Designer: Good. Apply it.

Claude:   [updates AES-003, re-runs gate]
          RESULT: PASSED ✓ — proceed to dynamic specs
```

### Step 2b: Dynamic Specs → Dynamic Gate

```
specs/dynamics/light-reveal-cycle.dyn.md      ← DYN-002
specs/dynamics/coop-exploration.dyn.md        ← DYN-003
```

```
$ npx mda gate mechanics

  Dynamic → Mechanic Gate
  ───────────────────────
  Checking DYN-002 (Light Reveal Cycle):
    [PASS] 2 feedback loops identified (Discovery Pacing, Journal Momentum)
    [PASS] 4 invariants, all binary (pass/fail testable)
    [PASS] 2 degenerate dynamics with detection + prevention
    [WARN] Journal Momentum is a positive loop with no cap identified
           → What prevents "journal completionism" from dominating the experience?

  Checking DYN-003 (Co-op Exploration):
    [PASS] 1 feedback loop identified
    [PASS] 3 invariants, all binary
    [PASS] 1 degenerate dynamic with detection + prevention

  RESULT: PASSED with warnings (0 fail, 1 warn)
  ✓ May proceed, but address the uncapped positive loop warning
```

Designer notes the warning, adds a cap: "Journal shows max 2 undiscovered silhouettes at a
time, preventing overwhelm. Momentum comes from quality of each discovery, not quantity pressure."

### Step 2c: Mechanic Specs (engine-agnostic) → Mechanic Gate

```
specs/mechanics/lantern-system.mec.md         ← MEC-004
specs/mechanics/creature-behavior.mec.md      ← MEC-005
specs/mechanics/field-journal.mec.md          ← MEC-006
```

```
$ npx mda gate implementation

  Mechanic → Implementation Gate
  ──────────────────────────────
  Checking MEC-004 (Lantern System):
    [PASS] Traces to DYN-002, DYN-003
    [PASS] Behavioral contract: 3 inputs, 3 outputs, 4 guarantees
    [PASS] 10 acceptance criteria, all binary
    [PASS] Integration points documented (fires/listens/reads/writes)

  Checking MEC-005 (Creature Behavior):
    [PASS] All checks pass

  Checking MEC-006 (Field Journal):
    [PASS] All checks pass

  Checking bindings (engine: roblox):
    [PASS] BIND-001 covers MEC-004
    [PASS] BIND-002 covers MEC-005
    [PASS] BIND-003 covers MEC-006

  Checking tuning:
    [PASS] All [TUNABLE] parameters in MEC specs appear in TUN-002 or TUN-003
    [PASS] Ranges don't conflict with DYN invariants

  RESULT: PASSED (0 fail, 0 warn)
  ✓ All gates clear — ready for implementation
```

### Files created after Phase 2

```
specs/
├── concept/lantern-woods.concept.md          GAME-002 (gate: PASSED)
├── aesthetics/lantern-discovery.aes.md       AES-002  (gate: PASSED)
├── aesthetics/creature-wonder.aes.md         AES-003  (gate: PASSED)
├── dynamics/light-reveal-cycle.dyn.md        DYN-002  (gate: PASSED)
├── dynamics/coop-exploration.dyn.md          DYN-003  (gate: PASSED)
├── mechanics/lantern-system.mec.md           MEC-004  (gate: PASSED)
├── mechanics/creature-behavior.mec.md        MEC-005  (gate: PASSED)
├── mechanics/field-journal.mec.md            MEC-006  (gate: PASSED)
├── assets/forest-creatures.asset.md          AST-007
├── assets/forest-environment.asset.md        AST-008
├── tuning/lantern-pacing.tune.md             TUN-002
├── tuning/creature-reveal.tune.md            TUN-003
├── bindings/roblox/lantern-system.mec.bind.md     BIND-001
├── bindings/roblox/creature-behavior.mec.bind.md  BIND-002
└── bindings/roblox/field-journal.mec.bind.md      BIND-003
```

---

## Phase 3: The Implementation-Debug Loop

This is NOT a waterfall. Implementation and debugging form a single continuous cycle.
The designer and AI alternate between writing code, playtesting, reading logs, and
correcting — looping until all proxies pass and all invariants hold.

### Loop iteration 1: Initial implementation

```
┌──────────────────────────────────────────────────────────────────┐
│ IMPLEMENT                                                        │
│                                                                  │
│ Claude reads the spec chain:                                     │
│                                                                  │
│   MCP call: get_trace_chain("MEC-004", direction="up")           │
│   ┌─────────────────────────────────────────────────┐            │
│   │  MEC-004 → DYN-002 → AES-002                    │            │
│   │  MEC-004 → DYN-003 → AES-002, AES-003           │            │
│   │  Binding: BIND-001 (Roblox)                      │            │
│   │  Tuning: TUN-002                                 │            │
│   └─────────────────────────────────────────────────┘            │
│                                                                  │
│ Claude reads BIND-001 for Roblox-specific implementation:        │
│   - Scene structure, API mapping, code patterns, perf notes      │
│                                                                  │
│ Claude writes Luau code:                                         │
│   src/server/LanternSystem.server.luau                           │
│   src/client/LanternVisuals.client.luau                          │
│   src/shared/LanternConfig.luau                                  │
│                                                                  │
│ Every game event gets a logger call:                             │
│   Log.info("M", "MEC-004", "CREATURE_LIT", { ... }, cid)        │
│   Log.checkInvariant("DYN-002", "INV-2", hadPeek, "...", cid)   │
│                                                                  │
│ Files sync to Roblox Studio via Rojo.                            │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ PLAYTEST                                                         │
│                                                                  │
│ Designer hits Play in Studio. Plays for 3 minutes.               │
│ Notices: "The reveals don't feel rewarding. Players find         │
│ creatures but just keep walking. No wow moment."                 │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ ANALYZE                                                          │
│                                                                  │
│ Claude reads MDA logs via MCP:                                   │
│                                                                  │
│ MCP call: get_runtime_logs(filter="PROXY_CHECK")                 │
│                                                                  │
│ [03:00] [A:AES-002] [PASS] proxy=reveal_rate value=52 ✓         │
│ [03:00] [A:AES-003] [FAIL] proxy=reveal_pause value=0.3         │
│                             target=1.0 status=OUT_OF_RANGE       │
│                                                                  │
│ Players pause only 0.3s at reveals (target >1.0s). No wow.      │
│                                                                  │
│ MCP call: check_invariants(specId="DYN-002")                     │
│                                                                  │
│ INV-1: PASS                                                      │
│ INV-2: FAIL — 4/12 reveals had no partial reaction before full   │
│         reveal. Creatures jumped from hidden to visible.          │
│                                                                  │
│ MCP call: get_runtime_logs(filter="cid=9")                       │
│                                                                  │
│ [01:42.100] [M:MEC-004] CREATURE_LIT  light=0.12                │
│ [01:42.300] [M:MEC-004] CREATURE_LIT  light=0.28                │
│ [01:42.400] [M:MEC-004] CREATURE_LIT  light=0.74  ← jumped      │
│ [01:42.401] [M:MEC-005] CREATURE_REVEAL hadPeek=false           │
│ [01:42.401] [D:DYN-002] FAIL INVARIANT inv=INV-2                │
│                                                                  │
│ Root cause: light level jumped from 0.28 to 0.74 in one frame,  │
│ skipping the peek phase entirely. peekThreshold (0.3) and        │
│ revealThreshold (0.7) are too close, and player moved fast.      │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ DIAGNOSE: What type of fix?                                      │
│                                                                  │
│ Is it a tuning fix? Partially — thresholds can be adjusted.      │
│ But there's also a missing mechanic: nothing FORCES a minimum    │
│ peek duration. Even with better thresholds, a fast player could  │
│ still skip the phase.                                            │
│                                                                  │
│ Decision: TUNING FIX + small MECHANIC AMENDMENT                  │
│   1. Lower peekThreshold from 0.3 to 0.15 (tuning)              │
│   2. Add peekMinDuration = 1.0s to MEC-005 Rule 2 (spec change) │
│                                                                  │
│ This is a mechanic-scope change (lowest scope), no cascade.      │
│ No need for a full Vision Change Proposal.                       │
│                                                                  │
│ Claude pushes the threshold live:                                │
│   MCP call: push_parameter("peekThreshold", 0.15)               │
│                                                                  │
│ Claude updates MEC-005 with peekMinDuration, re-implements,      │
│ and updates TUN-003 iteration log.                               │
└──────────────────────────────────────────────────────────────────┘
                               │
                               │ loop back to PLAYTEST
                               ▼

### Loop iteration 2: Retest after fix

Designer plays again. Creatures now glow before revealing. Players pause to watch.

Logs:
  [A:AES-003] [PASS] proxy=reveal_pause value=1.2 target=1.0 ✓
  [D:DYN-002] all invariants PASS (0 failures) ✓
  [A:AES-002] [PASS] proxy=reveal_rate value=52 ✓
  [A:AES-002] [FAIL] proxy=coop_clustering value=0.15 target=0.70 ✗

Creatures work now, but co-op is broken — players ignore each other.
```

### Loop iteration 3: A vision change

This is the hard case. The co-op proxy fails, and it's NOT a tuning problem.

```
┌──────────────────────────────────────────────────────────────────┐
│ DIAGNOSE: coop_clustering at 0.15 (target 0.70)                  │
│                                                                  │
│ A→D→M trace:                                                    │
│   AES-002 proxy "coop_clustering" → DYN-003 (Co-op Exploration) │
│   → MEC-004 (Lantern Merge)                                     │
│                                                                  │
│ Is it tuning? No. No parameter makes solo play impossible.       │
│ Is it a bug? No. Merge works correctly when players are close.   │
│ Is it a vision change? YES — DYN-003 assumed merge would be      │
│ incentive enough, but players have no MECHANICAL REASON to       │
│ cooperate. Every creature is soloable.                           │
│                                                                  │
│ This requires a VISION CHANGE PROPOSAL.                          │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ VISION CHANGE PROPOSAL (VCP)                                     │
│                                                                  │
│ Trigger:  coop_clustering proxy at 0.15 (target 0.70)            │
│ Root:     No creature requires 2+ lanterns. Solo always works.   │
│ Scope:    DYNAMIC (DYN-003) + MECHANIC (MEC-005)                 │
│                                                                  │
│ Proposed change:                                                 │
│   DYN-003: Add "Forced Cooperation" interaction pattern —        │
│            some creatures only reveal under combined lantern      │
│            light (merged beams)                                   │
│   MEC-005: Add "Rare Creature" rules — require merged light      │
│            to reveal. Normal creatures still soloable.            │
│   TUN-003: Add rareCreatureCount param, mergeRevealSpeedBonus    │
│   AST-007: Add rare creature visual variants                     │
│                                                                  │
│ Cascade impact:                                                  │
│   DYN-003 → MEC-005 → TUN-003 → AST-007                         │
│   4 specs modified, code for MEC-005 needs re-implementation     │
│                                                                  │
│ What we KEEP (not affected):                                     │
│   GAME-002 (concept unchanged — co-op was always the intent)     │
│   AES-002, AES-003 (aesthetic goals unchanged)                   │
│   DYN-002 (solo reveal cycle unchanged)                          │
│   MEC-004 (lantern system unchanged — merge already works)       │
│   MEC-006 (journal unchanged)                                    │
│   BIND-001, BIND-003 (bindings unchanged)                        │
│                                                                  │
│ Risk: Rare creatures may feel gating for solo players             │
│ Alternative: Merge makes reveals FASTER (not exclusive) —        │
│              less disruptive but may not be enough incentive      │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ DESIGNER DECIDES                                                 │
│                                                                  │
│ Designer: "Do both — rare creatures require merge, AND merge     │
│           makes normal reveals faster. Solo players can still    │
│           complete 80% of the Journal."                          │
│                                                                  │
│ Decision: ACCEPT (with modification)                             │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ APPLY TOP-DOWN THROUGH GATES                                     │
│                                                                  │
│ Step 1: Modify DYN-003                                           │
│   Add "Forced Cooperation" interaction pattern                   │
│   Add "Merge Speed Bonus" interaction pattern                    │
│   → Re-run dynamic gate: PASSED ✓                                │
│                                                                  │
│ Step 2: Modify MEC-005                                           │
│   Add rare creature detection rules (require merged light)       │
│   Add merge speed bonus to normal creature reveal formula        │
│   → Re-run mechanic gate: PASSED ✓                               │
│                                                                  │
│ Step 3: Modify TUN-003                                           │
│   Add rareCreatureCount: 3 [2-5]                                 │
│   Add mergeRevealSpeedBonus: 1.5x [1.2-2.0]                     │
│   → Ranges don't conflict with invariants ✓                      │
│                                                                  │
│ Step 4: Modify BIND-002                                          │
│   Add Roblox-specific implementation for merged light detection  │
│                                                                  │
│ Step 5: Re-implement MEC-005 code                                │
│   Claude rewrites creature detection to check for merged light   │
│                                                                  │
│ Step 6: Log the change in traceability                           │
│   Vision Change Log:                                             │
│   | 2026-04-14 | coop_clustering 0.15 | Dynamic | DYN-003,       │
│   |            |                      |         | MEC-005,        │
│   |            |                      |         | TUN-003 |       │
│   |            |                      |         | Added rare      │
│   |            |                      |         | creatures +     │
│   |            |                      |         | merge speed     │
│   |            |                      |         | bonus           │
└──────────────────────────────────────────────────────────────────┘
                               │
                               │ loop back to PLAYTEST
                               ▼

### Loop iteration 4: Validate the vision change

Designer plays co-op session with another tester.

Logs:
  [A:AES-002] [PASS] proxy=coop_clustering value=0.71 target=0.70 ✓
  [A:AES-002] [PASS] proxy=reveal_rate value=48 ✓
  [A:AES-003] [PASS] proxy=reveal_pause value=1.4 ✓
  [D:DYN-002] all invariants PASS ✓
  [D:DYN-003] all invariants PASS ✓

ALL PROXIES IN_RANGE. ALL INVARIANTS PASS.
```

---

## Phase 3 Exit: Feature Validated

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Lantern System:    VALIDATED (iteration 2 — tuning fix)         │
│  Creature System:   VALIDATED (iteration 4 — vision change)      │
│  Field Journal:     VALIDATED (iteration 1 — worked first try)   │
│  Co-op Merge:       VALIDATED (iteration 4 — rare creatures)     │
│                                                                  │
│  Actions:                                                        │
│  • Update GAME-002 feature map: all Must-haves → "Validated"     │
│  • TUN-002 iteration log: final entry recording validated params │
│  • TUN-003 iteration log: final entry recording vision change    │
│  • Traceability: vision change logged with date + rationale      │
│                                                                  │
│  Proceed to Should-have features (ambient soundscape, etc.)      │
│  or begin polish/release prep.                                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Summary: Decision Points and Who Decides

| Moment | Question | Who decides | AI role |
|--------|----------|-------------|---------|
| Concept draft | "Is this idea clear enough?" | Gate decides (automated 6 checks) | Proposes fixes for failing checks |
| Concept refinement | "Is Expression Absent or Tertiary?" | Designer | Presents trade-offs |
| Aesthetic gate fails | "How do we detect reveal fatigue?" | AI proposes, designer confirms | Drafts measurable detection signal |
| Dynamic gate warns | "Is this positive loop capped?" | Designer | Flags the risk, suggests cap |
| Implementation | "How to implement light cone in Roblox?" | AI (reads binding spec) | Writes all code |
| Playtest feedback | "Reveals feel flat" | Designer (subjective) | Translates to: which proxy is failing? |
| Diagnosis | "Tuning, bug, or vision change?" | AI diagnoses from log data | Traces A→D→M, classifies fix type |
| Tuning fix | "Change peekThreshold to 0.15?" | AI proposes, designer confirms | Pushes parameter live via MCP |
| Vision change proposal | "Add rare creatures?" | Designer decides (accept/reduce/reject/defer) | Drafts VCP with cascade analysis |
| Vision change cascade | "Which specs to modify?" | VCP defines scope | Modifies specs top-down, re-runs gates |
| Feature validated | "Are all proxies passing?" | Data decides (automated) | Reports results |

### The key insight

The human makes **design decisions** (what the game should feel like, which aesthetic wins
when they conflict, whether to accept a vision change). The AI makes **analytical decisions**
(which proxy is failing, what the root cause is, which specs are in the cascade). The
tooling makes **structural decisions** (are gates passing, are traces valid, are IDs unique).

No one actor has full authority. The framework's value is in making these handoff points
explicit.
