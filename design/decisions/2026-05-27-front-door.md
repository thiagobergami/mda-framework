---
id: ADR-2026-05-27-front-door
date: 2026-05-27
status: accepted
review_item: S1 (REVIEW.html)
plan_task: D0.1 (plan.html)
---

# Front Door — Hybrid (CLI for authoring, Studio for operating)

## Decision

The MDA Framework adopts a **hybrid front door**:

- **CLI (`npx mda`, `npm run spec`)** is the primary entry point for solo
  spec authoring — concept → aesthetic → dynamic → mechanic → tuning →
  asset → level. It is also the entry point for any read-only validation
  (`mda validate`, `mda gate <layer>`).
- **MDA Studio (`mda-studio/`)** is the primary entry point for teams,
  agents (when they exist), and anything that needs persistent state:
  per-game registration, issue tracking, cost events, approvals,
  long-running asset-plan execution.

Studio-first is the longer-term target, but it is premature today: the
agent runtime, persistence layer, and adapter interface that would
justify a studio-only flow are still being built (weeks 3–5 of
plan.html).

## Which front door should I use?

Use the **CLI** when:

- You are alone at a keyboard authoring a new spec.
- You are validating or gating an existing spec set.
- You want to scaffold a fixture quickly (`npx mda new <layer> <name>`).
- You are running asset-plan steps from a terminal where MCP tooling is
  configured.

Use the **Studio** when:

- More than one operator needs to see the same state.
- You need persistent issues, cost events, or approvals across sessions.
- You want to drive `validate`/`gate`/`asset-plan` from a UI without a
  terminal.
- (Future, M3+) You are orchestrating agents.

## Why hybrid, not studio-first?

1. The CLI ships today and is the only path proven against real specs.
2. Studio-first requires agents and persistence; neither is ready.
3. Forcing every author through a server is bad ergonomics for the
   "open editor, write spec" use case the framework was built around.
4. Once agents and persistence land, the studio becomes the obvious
   front door without breaking the CLI flow — the CLI remains the
   underlying engine the studio drives.

## Why not CLI-forever?

1. State-bearing work (issues, costs, approvals, agent telemetry) does
   not survive a CLI invocation.
2. Multi-user coordination is impossible from a single user's terminal.
3. Long-running asset-plan execution needs a place to stream progress
   and accept human approvals — that's a UI, not a TTY.

## Consequences

- Top-of-tree docs (`README.md`, `mda-studio/README.md`, `CLAUDE.md`)
  must open with the same elevator paragraph naming "hybrid" and
  pointing readers to the right starting point. (Plan task D1.S1.)
- The studio's env-var bootstrap (`MDA_STUDIO_GAME_*`) is demoted to
  a CI/seeding appendix; the primary studio onboarding becomes the
  in-UI "Register a game" flow. (Plan tasks D4.ST1, D4.ST5.)
- `mda-studio onboard` (plan task D6.ST4) becomes the single-command
  on-ramp for new contributors.

## Re-evaluation triggers

- Agents (M3) and persistence (week 5) land and stabilise → revisit
  whether the studio should become the default front door.
- A real user reports getting lost picking between CLI and studio →
  the elevator paragraph in the three top-of-tree docs is failing and
  needs a rewrite.

## References

- REVIEW.html §S1 — "Pick & document the front door"
- plan.html §2 D0.1 and §3 D1.S1 / D1.DC1
- `README.md`, `mda-studio/README.md`, `CLAUDE.md` (callouts land in
  week 1)
