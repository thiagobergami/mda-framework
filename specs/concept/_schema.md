# Game Concept Schema

The Game Concept is the **starting point** of the entire framework. Before any MDA breakdown
happens, you need a clear picture of: what is this game, who is it for, and what experience
does it deliver?

This is the document you hand to AI and say: "Build this." Everything else — aesthetics,
dynamics, mechanics, tuning, assets — flows from what's defined here.

## Template

```markdown
---
id: GAME-{NNN}
name: {Game title or working title}
version: {Spec version — increment on major changes}
---

# {Game Title}

## Vision

{2-4 sentences that capture the essence of the game. This is the elevator pitch —
what makes this game worth playing? A reader should immediately understand what kind
of experience this is.}

## Aesthetic Profile

{Rank the 8 aesthetic categories by importance for THIS game. This profile drives
every design decision downstream — dynamics are shaped to produce these aesthetics,
mechanics are built to support those dynamics.}

| Priority | Aesthetic | Role in this game |
|----------|-----------|-------------------|
| Primary  | {category} | {How this aesthetic manifests — be specific} |
| Secondary | {category} | {How it supports or amplifies the primary} |
| Secondary | {category} | {How it supports or amplifies the primary} |
| Tertiary | {category} | {Present but not a design driver} |
| Absent   | {category} | {Explicitly NOT pursued — and why} |

**Conflicts and resolutions**: {If any aesthetics tension each other (e.g., Challenge
vs Submission), state which wins and when. This prevents design drift.}

## Core Loop

{The repeating cycle of player activity that forms the backbone of the game. Most
games have one core loop (the thing you do most of the time) and supporting loops.

Describe the core loop as a cycle: action → feedback → decision → action.}

### Primary Loop
```
{Action} → {System Response} → {Player Decision} → {repeat}
```
- **Frequency**: {How often this cycle repeats — seconds, minutes, per session}
- **Serves aesthetic**: {Which primary/secondary aesthetic this loop delivers}

### Secondary Loops (if any)
```
{Action} → {System Response} → {Player Decision} → {repeat}
```
- **Frequency**: {How often}
- **Serves aesthetic**: {Which aesthetic}
- **Relationship to primary**: {How it intersects — feeding into, branching from, etc.}

## Target Audience

- **Age range**: {e.g., 8-14, 18+, all ages}
- **Player archetype**: {e.g., Explorers, Achievers, Socializers, Killers — Bartle taxonomy or freeform}
- **Experience level**: {e.g., casual mobile, core gamer, Roblox native}
- **Session length**: {How long a typical play session lasts}
- **Social context**: {Solo, co-op, competitive, MMO}

## Platform Constraints

- **Runtime**: {e.g., Roblox}
- **Language**: {e.g., Luau}
- **Target devices**: {e.g., PC, mobile, console — affects input methods and performance budgets}
- **Performance budget**: {e.g., 60fps on mobile, max draw calls, poly budgets}
- **Input methods**: {e.g., keyboard/mouse, touch, gamepad}
- **Network model**: {e.g., Roblox client-server, singleplayer, P2P}

## Feature Map

{High-level list of game features, each of which will become one or more spec chains
(AES → DYN → MEC → TUN + AST). This is the roadmap — not detailed specs, just what
needs to be specified.}

| Feature | Primary Aesthetic | Priority | Status |
|---------|------------------|----------|--------|
| {name} | {aesthetic it serves} | Must-have / Should-have / Nice-to-have | Not started / In progress / Specced / Implemented |

## Boundaries

{What this game is NOT. Explicit exclusions prevent scope creep and help AI make
judgment calls when something isn't specced.}

- **Not a {genre/feature}**: {Why this is excluded}
- **No {mechanic/element}**: {Why this would undermine the aesthetic profile}

## Reference Games

{Games that share aspects of the target experience. For each, state what specifically
to learn from — not "it's like Minecraft" but "Minecraft's Discovery loop: the feeling
of cresting a hill and seeing a new biome for the first time."}

| Game | What to learn from | What to avoid |
|------|-------------------|---------------|
| {name} | {Specific aspect to emulate} | {What doesn't apply or goes wrong} |

## Success Criteria

{How do you know the game is achieving its goals? These are high-level metrics that
map to the aesthetic profile. They become the source of truth for aesthetic spec
observable proxies.}

- {Criterion}: {How to measure it}
```

## Rules

1. **Write the concept FIRST** — Before any AES, DYN, MEC, TUN, or AST spec. The concept is the root of the entire trace tree
2. **Rank aesthetics explicitly** — "Primary" means design trade-offs favor this aesthetic. "Absent" means actively avoid it. Ambiguity here cascades into confused specs downstream
3. **One core loop** — If you have two equally important loops, you either have two games or you haven't found the real core loop yet. Secondary loops are fine but they serve the primary
4. **Boundaries prevent scope creep** — It's easier for AI to implement "a Discovery game that is NOT a combat game" than "a Discovery game" (which AI might add combat to)
5. **Reference games are specific** — "Like Zelda" is useless. "Zelda BotW's emergent physics interactions where fire spreads to grass and creates updrafts" is actionable
6. **Feature map becomes the spec backlog** — Each row generates a full AES→DYN→MEC→TUN chain. Track status here as the source of truth for what's specced vs not
