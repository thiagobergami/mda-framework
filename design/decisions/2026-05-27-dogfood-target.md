---
id: ADR-2026-05-27-dogfood-target
date: 2026-05-27
status: accepted
review_item: S2 (REVIEW.html)
plan_task: D0.5 (plan.html)
---

# Dogfood Target — Cozy 60-second hide-and-seek

## Decision

In plan week 1 (task D1.S2) we author one real game end-to-end through
every spec layer. The chosen target is a **cozy 60-second
hide-and-seek prototype** on Roblox.

This replaces the synthetic "virus-hunter" fixture as the
pressure-test for the spec schemas, the CLI, the wizard, and the
studio's spec-tree rendering.

## The game in one paragraph

A small party game: one **seeker** searches for one-to-three **hiders**
across a single small Roblox map. Rounds are **60 seconds**. The
aesthetic register is **cozy** — soft pastel colours, gentle ambient
music, near-misses produce a giggle rather than dread. When the
seeker finds a hider, the hider becomes a seeker for the next round
(no elimination). The session is a handful of consecutive rounds with
a per-session winner.

## Why this game

1. **Tiny scope.** Two roles, one map, one timer. Realistic to spec
   end-to-end in two days inside plan week 1's budget.
2. **All eight aesthetic categories are represented but not all are
   primary.** Forces a clean Primary/Secondary/Tertiary/Absent ranking
   without contortion — exactly the test the schemas were built for.
3. **Two feedback systems.** Tension as the timer winds down
   (positive feedback on seeker confidence); social safety from the
   no-elimination rule (negative feedback on dread). Exercises both
   loop polarities in `specs/dynamics/`.
4. **Asset-light.** A couple of cosy props, two character variants,
   one map. Lets `npx mda asset-plan generate` exercise the pipeline
   without drowning the dogfood in art TODOs.
5. **A real running example.** Future docs that reach for "imagine a
   small game" can point at this one rather than inventing yet
   another straw target.

## Aesthetic ranking (initial — refined when AES specs are written)

| Rank      | Aesthetic  | Why                                                 |
|-----------|------------|-----------------------------------------------------|
| Primary   | Fellowship | The game is fundamentally about playing together    |
| Secondary | Sensation  | Cosy pastel/audio register is the felt experience   |
| Tertiary  | Discovery  | Finding good hiding spots on a small map           |
| Absent    | Submission | No grinding, no pastime loop                       |
| Absent    | Narrative  | Round-based; no story                              |

The remaining three (Fantasy, Challenge, Expression) sit in the
middle and will be ranked when `specs/concept/<game>.concept.md`
is written.

## What gets specced in week 1 (D1.S2)

Following `specs/WORKFLOW.md` steps 1–10:

1. `specs/concept/cozy-hide-and-seek.concept.md` — vision, aesthetic
   profile, core loop, boundaries, feature map.
2. `specs/aesthetics/` — at least one AES per feature in the feature
   map.
3. `specs/dynamics/` — the round timer loop, the role-handoff loop.
4. `specs/mechanics/` — seek action, hide action, role swap, round
   timer, scoring.
5. `specs/assets/` — props, character variants, map.
6. `specs/tuning/` — round duration, map size, hiding-spot density.
7. `design/levels/cozy-hide-and-seek.level.md` — the one map.
8. `npx mda validate` exits 0; `npx mda gate <layer>` passes for each
   layer.
9. `npx mda asset-plan generate` runs on at least one AST without
   exec.

Depth is deliberately shallow: just enough to make each spec
**valid**. The point is exercising the pipeline, not designing the
final game.

## Friction log

Every surprise, mis-prompt, schema confusion, or wizard
inconvenience encountered during D1.S2 is logged as a one-line entry
in `design/decisions/2026-05-27-dogfood-log.md`, tagged `cli`,
`wizard`, or `schema`. That log becomes the input for week 2's CLI
work (plan tasks D2.EN1, D2.Q1) and any schema follow-ups.

## Why not a bigger game

A bigger target (e.g. a coop loot-and-escape micro-game) would burn
plan week 1's budget on game design instead of on pressure-testing
the framework. A bigger target also blurs the friction log: schema
problems get attributed to "the game is complicated" rather than to
"the schema is wrong here."

## Why not stay with the synthetic fixture

The virus-hunter fixture in `mda-studio/ui/src/fixtures/` was
designed to test the UI. It is not under `specs/`, it was never
written through the wizard, and `npx mda validate` does not see it.
A real spec set exercises everything the fixture cannot.

## Re-evaluation triggers

- The cozy-hide-and-seek specs reach `validate` exit-0 in under a
  day → consider adding a second tiny dogfood as scope insurance for
  weeks 2+.
- A schema cracks open under cozy-hide-and-seek → the friction log
  becomes the schema-fix backlog; plan task D1.S2 still completes
  with the fixture in tree and the schema gap tracked.

## References

- REVIEW.html §S2 — "Dogfood one real game"
- plan.html §2 D0.5 and §3 D1.S2
- `specs/WORKFLOW.md`
- Related: [[2026-05-27-front-door]], [[2026-05-27-v1-lite]]
