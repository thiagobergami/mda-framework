# Level Spec Schema

Level specs describe the **spatial and temporal composition** of a single level: geometry,
pacing, encounters, sightlines, optional content. They live in `design/levels/` because they
*orchestrate* existing M/D/A specs into a particular arrangement — they do not define new
mechanics, dynamics, or aesthetics.

The MDA paper treats levels as content under Mechanics. In practice, a level orchestrates
**all three layers per zone** — geometry that affords a mechanic, pacing that drives a
dynamic feedback loop, and atmosphere that targets a specific aesthetic. Forcing levels into
`specs/mechanics/` either bloats mechanic specs or scatters spatial decisions. A level spec
references those primitives by ID instead.

## Vocabulary

| Term              | Meaning                                                                |
|-------------------|------------------------------------------------------------------------|
| Blockout          | Whitebox / spatial layout — geometry only, no art                      |
| Beat chart        | Pacing curve over time: tension, rest, climax, release                 |
| Encounter         | A self-contained unit of mechanic interaction (combat, puzzle, etc.)   |
| Affordance        | What the geometry teaches the player (ledge → climb, gap → jump)       |
| Sightline         | What the player can see from key positions — drives discovery          |
| Critical path     | The minimum traversal to complete the level                            |
| Optional path     | Branches off critical path — usually rewards exploration               |

## Template

```markdown
---
id: LVL-{NNN}
name: {Descriptive name}
status: blockout | playable | polished
references:
  aesthetics: [AES-NNN, ...]      # which aesthetics this level targets
  dynamics:   [DYN-NNN, ...]      # which feedback systems are active
  mechanics:  [MEC-NNN, ...]      # which player actions are available
  assets:     [AST-NNN, ...]      # which assets the level uses
estimated_duration: {seconds}     # expected time-to-complete on critical path
---

# {Level Name}

## Player Goal

{One sentence. What does the player accomplish here? "Find the lost firefly and lead it home."}

## Aesthetic Targets

{Which of the 8 aesthetic categories should peak in this level, and where. The same level
typically has different aesthetics at different beats.}

| Beat       | Target aesthetic        | Reasoning                                  |
|------------|-------------------------|--------------------------------------------|
| Entry      | AES-NNN ({category})    | First impression, sets tone                |
| Mid        | AES-NNN ({category})    | Core engagement                            |
| Exit       | AES-NNN ({category})    | Resolution, satisfaction                   |

## Critical Path

{ASCII or mermaid diagram showing the minimum traversal. Mark entry, exit, and any
mandatory checkpoints. This is the path a player can take with zero exploration.}

```
[Entry] → (Clearing) → [Bridge] → (Vista) → [Exit]
                        ↑
                     checkpoint
```

## Blockout

{Coarse spatial layout. ASCII grid is acceptable for v1; can graduate to image attachments
when geometry becomes complex enough. Each cell roughly maps to a navigable area.}

```
┌─────────────────────────────┐
│  E .  .  .  .  .  .  .  .   │   E = entry
│  .  T  T  .  .  .  .  .  .  │   T = trees (cover)
│  .  .  .  ?  .  .  .  C  .  │   ? = optional path
│  .  .  .  .  .  .  .  .  .  │   C = checkpoint
│  .  .  .  .  .  .  .  X  .  │   X = exit
└─────────────────────────────┘
```

## Beat Chart

{Pacing curve. Each row is a beat in chronological order. Tension is 1–5
(1 = calm, 5 = peak). Active mechanic and target aesthetic trace to spec IDs.}

| Time   | Zone      | Tension | Active mechanic | Target aesthetic     | Notes                |
|--------|-----------|---------|-----------------|----------------------|----------------------|
| 0:00   | Entry     | 1       | MEC-NNN (move)  | AES-NNN (Discovery)  | Wide vista on entry  |
| 0:30   | Clearing  | 2       | MEC-NNN (climb) | AES-NNN (Discovery)  | First affordance     |
| 1:15   | Bridge    | 4       | MEC-NNN (move)  | AES-NNN (Challenge)  | Gap forces commitment|
| 1:45   | Vista     | 1       | —               | AES-NNN (Sensation)  | Pacing rest          |

## Encounters

{Self-contained interaction units. Each encounter is a place where a specific mechanic mix
plays out, with an expected dynamic and clear success/fail states.}

### {Encounter name}

- **Location**: {zone in blockout, e.g., "Bridge"}
- **Mechanic mix**: {MEC-NNN, MEC-NNN — which player actions are required/available}
- **Expected dynamic**: {DYN-NNN — which feedback system this should trigger}
- **Success state**: {what completing the encounter looks like}
- **Fail state**: {what failure looks like — and what it means for pacing}

## Affordances

{What the geometry teaches the player. Each row maps a piece of geometry to the player
action it affords and the spec it references.}

| Geometry          | Player action             | Teaches spec   |
|-------------------|---------------------------|----------------|
| Low ledge         | Step up — no input needed | MEC-NNN        |
| Tall ledge        | Climb — hold A            | MEC-NNN        |
| Gap < 4 studs     | Jump — single press       | MEC-NNN        |
| Gap > 4 studs     | Jump + climb — combo      | MEC-NNN, MEC-NNN |

## Sightline Notes

{What is visible from each key position. Drives Discovery: what is hidden from the entry,
revealed at the mid, and contextualized at the exit.}

- **From Entry**: {what the player sees first — first impression matters}
- **From Mid**: {what the geometry reveals as they progress}
- **From Exit looking back**: {what context the player gains at the end}
- **Hidden**: {what should NOT be visible until the player commits to a path}

## Optional Content

{Side paths off the critical path and their reward type. Reward types: cosmetic, narrative,
mechanical (unlocks ability), economic (resources). Be explicit — vague rewards are
dead content.}

- **{Side path name}** (off {zone}): {reward type} — {why a player would take this path}

## Open Questions

{Playtesting items not yet resolved. Each question should be answerable by observation
during a real playtest.}

- {Question — e.g., "Does the bridge gap read as jumpable from the approach?"}
- {Question — e.g., "Do players notice the optional path on first traversal?"}

## Iteration Log

{Record significant changes to this level. Format: date, what changed, why, observed effect.}

| Date       | Change                            | Why                          | Observed effect |
|------------|-----------------------------------|------------------------------|-----------------|
| YYYY-MM-DD | {what was changed}                | {motivation}                 | {result}        |
```

## Required sections

A level spec MUST contain ALL of the following sections, in this order:

1. **Player Goal** — one sentence
2. **Aesthetic Targets** — table by beat
3. **Critical Path** — diagram
4. **Blockout** — spatial layout
5. **Beat Chart** — pacing curve table
6. **Encounters** — at least one
7. **Affordances** — geometry → action → spec ID
8. **Sightline Notes**
9. **Optional Content** (may be empty if level has none — say so explicitly)
10. **Open Questions**
11. **Iteration Log** (may be empty for new levels)

## Validation rules

The validator (see `tools/`) MUST check that every level spec:

- Has a unique `LVL-NNN` ID.
- Has `references:` block with at least one aesthetic, one dynamic, and one mechanic.
- Every spec ID in `references:` resolves to an existing file under `specs/`.
- `status` is one of `blockout | playable | polished`.
- All 11 required sections are present.

## Status meanings

- **blockout** — geometry placeholders only, traversable but ugly. Used to validate beat
  chart and sightlines.
- **playable** — full geometry, real assets in place, encounters wired up. Ready for
  internal playtesting.
- **polished** — art, audio, and tuning passes complete. Ready for external playtest.
