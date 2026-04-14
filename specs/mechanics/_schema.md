# Mechanic Spec Schema

Mechanic specs define the **actions, behaviors, and control mechanisms afforded to the player**
within the game context. Together with game content (levels, assets, etc.), they support the
dynamics. They answer: "What can the player DO and what RULES govern the system?"

The paper states: *"Mechanics are the various actions, behaviors and control mechanisms afforded
to the player within a game context. Together with the game's content (levels, assets and so on)
the mechanics support overall gameplay dynamics."*

**Critical rule from the paper**: Components cannot be evaluated "in vacuo" — every mechanic
must be understood through its effect on dynamics and player experience.

## Template

```markdown
---
id: MEC-{NNN}
name: {Descriptive name}
traces_to_dynamics: [{DYN-NNN IDs this mechanic supports}]
platform: roblox
language: luau
---

# {Name}

## Purpose

{1-2 sentences explaining WHY this mechanic exists — what dynamic it supports and
what aesthetic it ultimately serves. This prevents mechanics from existing "in vacuo".}

## Player Affordances

{What the player can DO. List the verbs — the actions available to the player.
Each affordance is a capability the player has within the game context.}

- **{Verb}**: {Description of the action} — Input: {how the player triggers it}
- **{Verb}**: {Description of the action} — Input: {how the player triggers it}

## Game Content

{The material that mechanics operate on. Levels, assets, spawn points, items,
characters — anything that is "in the world" rather than a rule about the world.

Each content entry references an asset spec from `specs/assets/` by ID. This ensures
every asset traces from mechanic (where it's used) through to aesthetic (why it exists).}

- **{Content type}**: {Description} — Asset: {AST-NNN} — Status: {concept|placeholder|draft|final}

## Rules

{The constraints and formulas that govern how mechanics interact. Each rule has
a clear condition and outcome. Parameters that can be tuned are marked with
[TUNABLE] and reference a tuning spec.}

### Rule {N}: {Name}
- **Condition**: {When this rule applies}
- **Effect**: {What happens}
- **Formula**: {If applicable, the calculation}
- **Parameters**: {List tunable values with defaults and ranges}

## Behavioral Contract

{What this mechanic DOES as a system — its inputs, outputs, and guarantees.
This is the specification that code must satisfy.}

### Inputs
- {Input}: {Type and source}

### Outputs
- {Output}: {Type and destination}

### Guarantees
- {Guarantee}: {What is always true about this mechanic's behavior}

## Acceptance Criteria

{Concrete, testable conditions that prove the mechanic is correctly implemented.
AI uses these as a checklist.}

- [ ] {Criterion — specific, measurable, binary pass/fail}
- [ ] {Criterion}
- [ ] {Criterion}

## Integration Points

{How this mechanic connects to other mechanics. What events does it fire?
What events does it listen to? What shared state does it read or write?}

- **Fires**: {Events this mechanic produces}
- **Listens**: {Events this mechanic responds to}
- **Reads**: {Shared state consumed}
- **Writes**: {Shared state modified}
```

## Rules

1. **Never in vacuo** — Every mechanic MUST have `traces_to_dynamics`. If you can't name the dynamic it supports, the mechanic has no purpose
2. **Player affordances first** — Start with what the player CAN DO. Mechanics exist to give players agency
3. **Behavior over data** — Describe what the system DOES, not just its data structures. Data models are implementation details; behavioral contracts are specs
4. **Mark tunable parameters** — Any numeric value that might need adjustment references a tuning spec
5. **Acceptance criteria are tests** — They should be specific enough to write automated tests from
6. **Integration points prevent surprises** — When AI implements a mechanic, it needs to know what other systems are affected
