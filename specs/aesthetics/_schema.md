# Aesthetic Spec Schema

Aesthetic specs define the **player experience goals** for a feature. They answer: "What should the
player FEEL when interacting with this part of the game?"

The paper states: *"In describing the aesthetics of a game, we want to move away from words like
'fun' and 'gameplay' towards a more directed vocabulary."*

## Template

```markdown
---
id: AES-{NNN}
name: {Descriptive name}
primary_aesthetic: {One of the 8 categories}
secondary_aesthetics: [{List of supporting categories}]
target_audience: {Who is this experience designed for}
---

# {Name}

## Experience Goal

{2-3 sentences describing the desired player experience. Use the aesthetic vocabulary
from glossary.md. Never use "fun" or "gameplay" — be specific about which emotions
and engagement types are targeted.}

## Aesthetic Profile

### Primary: {Category} — {Why this is dominant}

{Explain why this aesthetic is the primary goal. What does it feel like? Reference
the "Game as..." frame from the glossary.}

### Secondary: {Category} — {How it supports the primary}

{Each secondary aesthetic gets a brief explanation of how it serves or amplifies
the primary. If secondaries conflict, explain how they're balanced.}

## Observable Proxies

{Aesthetics are subjective, but we validate them through observable player behavior.
Each proxy is a measurable signal that the aesthetic is working.}

- **Proxy name**: {What to measure} — Target: {range or threshold}
- **Proxy name**: {What to measure} — Target: {range or threshold}

## Anti-Patterns

{Behaviors or states that indicate the aesthetic is FAILING. These are red flags
that should trigger investigation via the Player Perspective (A → D → M).}

- {Anti-pattern}: {Why it breaks the aesthetic}
- {Anti-pattern}: {Why it breaks the aesthetic}

## Audience Context

{Who is the target player? Age range, experience level, play style preferences.
The same mechanics produce different aesthetics for different audiences — the paper's
babysitting game example shows a tag game feels like Discovery for toddlers but
Challenge for adults.}
```

## Rules

1. **Use the 8 categories** — Every aesthetic spec must classify using the glossary vocabulary
2. **One primary** — There is always exactly one dominant aesthetic. If you can't choose, the feature is too broad; split it
3. **Observable proxies are required** — If you can't define how to observe the aesthetic, it's too vague to implement
4. **Anti-patterns prevent drift** — They catch when a mechanic change breaks the experience
5. **Audience matters** — The same system produces different aesthetics for different players. Be explicit about who this is for
6. **No implementation details** — Aesthetic specs describe WHAT the player feels, never HOW the system achieves it. That's what dynamics and mechanics are for
