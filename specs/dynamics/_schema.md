# Dynamic Spec Schema

Dynamic specs define the **runtime behavior** that emerges from mechanics interacting with player
input and each other over time. They answer: "What BEHAVIOR should emerge during play?"

The paper states: *"Dynamics describes the run-time behavior of the mechanics acting on player
inputs and each others' outputs over time."*

Critically, the paper models dynamics as **feedback systems** — loops where outputs feed back
as inputs, amplifying or dampening game states.

## Template

```markdown
---
id: DYN-{NNN}
name: {Descriptive name}
traces_to_aesthetics: [{AES-NNN IDs this dynamic serves}]
---

# {Name}

## Behavior Description

{2-3 sentences describing what emergent behavior should occur during play. Focus on
what the PLAYER observes and what the SYSTEM produces — not on how it's coded.}

## Feedback System

{Model the dynamic as a feedback system. Show the loop(s) and classify each as
positive (amplifying) or negative (dampening).}

### Loop: {Name}
- **Type**: Positive | Negative
- **Cycle**: {State A} → {causes} → {State B} → {causes} → {State A (amplified/dampened)}
- **Effect on experience**: {How this loop serves the target aesthetic}

### Diagram

```
{ASCII diagram of the feedback system. Show:
 - Player actions as inputs
 - System states as nodes
 - Feedback arrows with +/- labels
 - Where the loop amplifies or dampens}
```

## Interaction Patterns

{Describe the key interactions between player and system, or between subsystems,
that produce this dynamic. These are more specific than the feedback model.}

### Pattern: {Name}
- **Trigger**: {What initiates this pattern}
- **Sequence**: {Step-by-step what happens}
- **Duration**: {How long this pattern typically lasts}
- **Outcome**: {What state results}

## Invariants

{Conditions that MUST hold for this dynamic to function correctly. These are the
hard constraints that AI validates against. If an invariant is violated, the dynamic
is broken regardless of whether the aesthetic "feels" right.}

- **INV-{N}**: {Condition that must always be true}
- **INV-{N}**: {Condition that must always be true}

## Degenerate Dynamics

{Behaviors that could emerge from the mechanics but undermine the target aesthetics.
Name them so AI can detect and prevent them.}

- **{Name}**: {Description} — Breaks: {which aesthetic}
  - **Detection**: {How to identify this is happening}
  - **Prevention**: {What constraint prevents it}
```

## Rules

1. **Model feedback systems** — Every dynamic must identify at least one feedback loop. If there's no feedback, it's probably a mechanic, not a dynamic
2. **Trace to aesthetics** — Every dynamic must list which aesthetic specs it serves. If it doesn't serve an aesthetic, why does it exist?
3. **Invariants are non-negotiable** — They are hard constraints. Code that violates an invariant is WRONG even if the game "feels okay" in testing
4. **Name degenerate dynamics** — The Monopoly problem (positive feedback destroying tension) is the paper's key example. Anticipate what can go wrong
5. **Be concrete about interactions** — The paper says: "we want our discussion of dynamics to remain as concrete as possible." Use patterns with triggers, sequences, and durations
6. **No code** — Dynamic specs describe behavior, not implementation. Code belongs in mechanic specs
