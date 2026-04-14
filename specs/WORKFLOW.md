# Spec Authoring Workflow

Step-by-step process from "I have a game idea" to "AI can implement it." Each step has
a clear input, output, and validation checkpoint.

## Overview

```
Step 1: Game Concept     → The "what" and "why"
Step 2: Aesthetic Specs   → The player experience goals
Step 3: Dynamic Specs     → The emergent behaviors and feedback systems
Step 4: Mechanic Specs    → The rules, actions, and content
Step 5: Asset Specs       → The models, sounds, and visual content
Step 6: Tuning Specs      → The adjustable parameters
Step 7: Traceability      → The bidirectional links
Step 8: Validation        → The integrity check
```

Each step only requires the output of the previous step. AI can assist at any step,
but the earlier steps require more design judgment (human-driven), while the later
steps become increasingly implementable by AI alone.

---

## Step 1: Game Concept

**Input**: A game idea (can be rough)
**Output**: `specs/concept/{game-name}.concept.md`
**Schema**: `specs/concept/_schema.md`

### What to do:
1. Write the Vision (2-4 sentence elevator pitch)
2. Rank the 8 aesthetic categories for your game (Primary, Secondary, Tertiary, Absent)
3. Define the core loop as a cycle: action → feedback → decision → repeat
4. Describe target audience, platform constraints, and session length
5. List features that need to be specced (the feature map)
6. Define boundaries (what the game is NOT)

### Validation checkpoint:
- [ ] Can you explain the game in 2 sentences using aesthetic vocabulary (not "fun")?
- [ ] Is there exactly one Primary aesthetic?
- [ ] Does the core loop serve the Primary aesthetic?
- [ ] Are boundaries clear enough that AI won't add unwanted features?
- [ ] Does every feature in the feature map connect to an aesthetic?

### Common pitfalls:
- **Too vague**: "A cool adventure game" → Which aesthetics? For whom? What loop?
- **Too broad**: 15 features all marked "must-have" → Prioritize ruthlessly
- **Missing boundaries**: No "this is NOT a..." → AI will add combat to your puzzle game

---

## Step 2: Aesthetic Specs

**Input**: Game Concept (Step 1)
**Output**: One `specs/aesthetics/{feature}.aes.md` per feature (or feature group)
**Schema**: `specs/aesthetics/_schema.md`

### What to do:
For each feature in the concept's feature map:
1. Identify which aesthetic(s) this feature delivers
2. Write the experience goal in 2-3 sentences
3. Define observable proxies — measurable player behaviors that indicate the aesthetic is working
4. Define anti-patterns — behaviors that indicate the aesthetic is failing
5. Note audience context if it differs from the game-wide audience

### Validation checkpoint:
- [ ] Every feature from the concept's feature map has at least one aesthetic spec
- [ ] Every aesthetic spec has a Primary aesthetic that matches the concept's profile
- [ ] Every observable proxy is measurable (not "the player feels happy")
- [ ] Every anti-pattern has a detection signal (not "the game isn't fun")

### Common pitfalls:
- **Unmeasurable proxies**: "Player enjoys the experience" → What behavior shows enjoyment?
- **Missing anti-patterns**: If you can't describe failure, you can't detect it
- **Aesthetic drift**: Feature aesthetics conflict with the concept's profile → revisit the concept

---

## Step 3: Dynamic Specs

**Input**: Aesthetic Specs (Step 2)
**Output**: One `specs/dynamics/{feature}.dyn.md` per behavior system
**Schema**: `specs/dynamics/_schema.md`

### What to do:
For each aesthetic spec, design the dynamics that produce it:
1. Identify feedback loops (positive and negative) that create the aesthetic
2. Draw the feedback system diagram
3. Define interaction patterns (trigger → sequence → outcome)
4. Define invariants — conditions that MUST hold for the dynamic to work
5. Name degenerate dynamics — behaviors that could emerge but shouldn't

### Validation checkpoint:
- [ ] Every dynamic traces to at least one aesthetic spec
- [ ] Every dynamic has at least one feedback loop identified
- [ ] Every invariant is a binary testable condition (true/false, not a range)
- [ ] Degenerate dynamics have detection methods AND prevention strategies
- [ ] Feedback systems are balanced — positive loops have counteracting negative loops or caps

### Common pitfalls:
- **No feedback loops**: If there's no feedback, it's probably a mechanic, not a dynamic
- **Unchecked positive feedback**: The Monopoly problem — rich get richer destroys tension
- **Vague invariants**: "The game should feel balanced" → What specific condition must hold?

### AI role at this step:
AI can help model feedback systems and identify degenerate dynamics, but the core
behavioral goals should come from the designer. AI is good at finding edge cases
("what if the player does X?") but poor at deciding which behaviors matter.

---

## Step 4: Mechanic Specs

**Input**: Dynamic Specs (Step 3)
**Output**: One `specs/mechanics/{feature}.mec.md` per system
**Schema**: `specs/mechanics/_schema.md`

### What to do:
For each dynamic spec, design the mechanics that produce it:
1. Define player affordances — what verbs does the player have?
2. List game content — what is in the world for mechanics to operate on?
3. Write rules with conditions, effects, formulas, and parameters
4. Define the behavioral contract (inputs, outputs, guarantees)
5. Write acceptance criteria — concrete, testable pass/fail conditions
6. Map integration points (fires, listens, reads, writes)
7. Add MDA Logger integration examples

### Validation checkpoint:
- [ ] Every mechanic traces to at least one dynamic spec
- [ ] Every rule has at least one tunable parameter marked `[TUNABLE]`
- [ ] Every acceptance criterion is binary (pass/fail, not subjective)
- [ ] Behavioral contract guarantees match the dynamic's invariants
- [ ] Integration points are complete (no undocumented side effects)
- [ ] Logger integration covers all game events and invariant checks

### Common pitfalls:
- **Mechanics in vacuo**: A mechanic that doesn't trace to a dynamic has no purpose
- **Data over behavior**: Describing data structures instead of what the system DOES
- **Missing integration**: Two mechanics that share state but don't document it → race conditions

### AI role at this step:
This is where AI becomes highly effective. Given well-written dynamic specs with clear
invariants, AI can design mechanics that satisfy the constraints. AI can also identify
missing integration points and propose acceptance criteria.

---

## Step 5: Asset Specs

**Input**: Mechanic Specs (Step 4) — specifically the Game Content sections
**Output**: `specs/assets/catalog.md` + one `specs/assets/{name}.asset.md` per asset group
**Schema**: `specs/assets/_schema.md`

### What to do:
For each Game Content entry in the mechanic specs:
1. Create an asset spec with emotional intent (using aesthetic vocabulary)
2. Define technical requirements (poly count, duration, spatial settings, etc.)
3. List variants and their triggers
4. Define the Roblox integration (location, tags, attributes)
5. Write the placeholder protocol (behavioral equivalence + swap protocol)
6. Add the asset to `specs/assets/catalog.md`

### Validation checkpoint:
- [ ] Every asset traces to at least one mechanic AND one aesthetic
- [ ] Every asset has a placeholder protocol with behavioral equivalence defined
- [ ] Technical requirements include performance budgets
- [ ] Asset names follow the catalog naming convention
- [ ] No orphaned assets (every asset in catalog is referenced by a mechanic)

### AI role at this step:
AI can write asset specs from mechanic Game Content sections, but emotional intent
and artistic references should come from the designer. AI is good at technical
requirements and placeholder protocols.

---

## Step 6: Tuning Specs

**Input**: Mechanic Specs (Step 4) — specifically the `[TUNABLE]` parameters
**Output**: One `specs/tuning/{feature}.tune.md` per tunable feature group
**Schema**: `specs/tuning/_schema.md`

### What to do:
1. Collect all `[TUNABLE]` parameters from related mechanic specs
2. Define ranges, steps, and sensitivity for each
3. Map target metrics from aesthetic observable proxies
4. Document tuning constraints (coupled parameters, ordering requirements)
5. Document known trade-offs between parameters
6. Initialize the iteration log

### Validation checkpoint:
- [ ] Every `[TUNABLE]` parameter in a mechanic spec appears in a tuning spec
- [ ] Every tuning spec traces to mechanics, dynamics, AND aesthetics
- [ ] Ranges are reasonable (not [0, infinity])
- [ ] Coupled parameters are documented in constraints
- [ ] Target metrics match the aesthetic spec's observable proxies

---

## Step 7: Traceability

**Input**: All specs from Steps 1-6
**Output**: Updated `specs/traceability.md`

### What to do:
1. Add every new spec to the traceability matrix
2. Update the dependency graph
3. Verify all bidirectional links resolve

---

## Step 8: Validation

**Input**: All specs
**Output**: Validation report

Run `src/tools/validate-specs.luau` or manually check:

### Structural integrity:
- [ ] Every AES spec is referenced by at least one DYN spec
- [ ] Every DYN spec traces to at least one AES spec
- [ ] Every MEC spec traces to at least one DYN spec
- [ ] Every AST spec traces to at least one MEC AND one AES
- [ ] Every TUN spec traces to MEC, DYN, AND AES
- [ ] No orphaned specs (referenced but not existing, or existing but not referenced)

### Completeness:
- [ ] Every feature in the concept's feature map has a full spec chain (AES→DYN→MEC→TUN)
- [ ] Every mechanic has logger integration examples
- [ ] Every asset has a placeholder protocol
- [ ] Every dynamic has invariants
- [ ] Every aesthetic has observable proxies

### Consistency:
- [ ] Aesthetic vocabulary uses only the 8 categories (no "fun" or "gameplay")
- [ ] Spec IDs are unique and sequential within their layer
- [ ] Tuning parameter ranges don't conflict with dynamic invariants
- [ ] Asset names follow catalog naming convention

---

## When to Re-Spec

Specs are living documents. Re-spec when:

- **Playtesting reveals a broken aesthetic** → Start at Step 2, trace down
- **A new feature is added** → Start at Step 1 (update feature map), then Steps 2-7
- **Tuning can't fix a problem** → The mechanic design is wrong → revisit Step 4
- **A dynamic creates degenerate behavior** → Revisit Step 3, may cascade to Step 4
- **Scope changes** → Revisit Step 1 boundaries and feature map

Use the Player Perspective (A→D→M) to trace problems. Use the Designer Perspective
(M→D→A) to trace implementations. Both are necessary.
