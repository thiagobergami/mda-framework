---
id: ADR-2026-05-27-multi-engine
date: 2026-05-27
status: accepted (defer)
review_item: MX1 (REVIEW.html)
plan_task: D0.2 (plan.html)
---

# Multi-Engine Support — Deferred until one game ships

## Decision

Multi-engine support is **deferred**. The framework targets **Roblox
only** until a real game built on this framework ships against Roblox,
and a real second-engine target (Unity, Unreal, Godot, or another)
arrives with a motivating game attached.

## Context

- Roblox is the only engine the existing M/D/A specs target.
- `specs/bindings/` has no instances; the `binding-coverage` validator
  rule has nothing to enforce in practice.
- `IMPROVEMENTS.md` describes a multi-engine ambition with no game
  driving it. Moving it to `design/roadmap/multi-engine.md` (plan task
  D1.DC2) removes the noise from the active surface.
- Every plan-budget hour spent on engine abstraction today is an hour
  not spent on persistence, the onboarding CLI, or actually shipping a
  game.

## What changes immediately

1. The `binding-coverage` rule is demoted to no-op (or removed from the
   default rule set). Plan task D6.MX1 implements this.
2. `IMPROVEMENTS.md` moves to `design/roadmap/multi-engine.md` with a
   "Status: deferred" banner pointing to this ADR. Plan task D1.DC2.
3. `MDALogger` documentation is updated to declare its Roblox scope
   explicitly (plan task D6.RT2).

## What stays

- Asset-plan tool/engine profile machinery
  (`design/asset-plans/_engines/`, `_tools/`) stays. It already
  abstracts the asset pipeline across DCC tools and is the
  cheapest demonstration that the framework can plug in engines
  later — see plan task D6.MX2.
- The `binding-coverage` rule's code stays in tree (just not enabled)
  so we can re-enable it cheaply when a second engine arrives.

## Re-evaluation trigger

When a **real game** with a real player target asks for a second
engine, dust off `design/roadmap/multi-engine.md` and revisit. Until
then, the deferral stands.

## Consequences

- Documentation stops promising features the framework does not have.
- The validator stops emitting warnings for a feature no one consumes.
- Plan-budget freed up for V1-lite (persistence + onboarding + asset
  plans in UI). See plan.html week 5–6 and the V1-lite ADR
  ([[2026-05-27-v1-lite]]).

## References

- REVIEW.html §MX1 — "Multi-engine: commit or defer"
- plan.html §2 D0.2 and §8 D6.MX1
- `IMPROVEMENTS.md` (moving to `design/roadmap/multi-engine.md`)
- Related: [[2026-05-27-front-door]], [[2026-05-27-v1-lite]]
