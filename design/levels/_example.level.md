# Example Level — Tutorial Forest

> **This is reference documentation, not a validatable spec.** The file is prefixed with `_`
> so the validator skips it. When authoring a real level, copy this content into a file like
> `tutorial-forest.level.md`, restore the frontmatter block below, and replace placeholder
> spec IDs with real ones.
>
> Frontmatter that a real level would have:
>
> ```yaml
> ---
> id: LVL-001
> name: Tutorial Forest
> status: blockout
> references:
>   aesthetics: [AES-001]
>   dynamics:   [DYN-001]
>   mechanics:  [MEC-001]
>   assets:     []
> estimated_duration: 180
> ---
> ```

## Player Goal

Find the lost firefly hidden in the forest and follow it back to its tree.

## Aesthetic Targets

| Beat   | Target aesthetic         | Reasoning                                              |
|--------|--------------------------|--------------------------------------------------------|
| Entry  | AES-001 (Discovery)      | Open clearing invites exploration without instruction  |
| Mid    | AES-001 (Discovery)      | Branching paths reward curiosity                       |
| Exit   | AES-001 (Sensation)      | Firefly trail returns home — payoff is visual, not verbal |

## Critical Path

```
[Entry] → (Clearing) → [Stream Crossing] → (Hollow) → [Firefly] → (Trail Home) → [Exit]
                              │
                              └─→ optional: (Berry Patch)
```

## Blockout

```
┌────────────────────────────────────────┐
│  E  .  .  T  T  .  .  .  .  .  .  .   │   E = entry
│  .  .  .  .  T  .  .  .  .  .  .  .   │   T = trees (cover)
│  .  .  C  .  .  .  ~  ~  .  .  .  .   │   C = clearing center
│  .  .  .  .  .  .  ~  ~  .  H  .  .   │   ~ = stream
│  .  .  .  .  B  .  .  .  .  .  F  .   │   B = berry patch (optional)
│  .  .  .  .  .  .  .  .  .  .  .  .   │   H = hollow (checkpoint)
│  .  .  .  .  .  .  .  .  .  X  .  .   │   F = firefly
└────────────────────────────────────────┘                                       X = exit (firefly's tree)
```

## Beat Chart

| Time | Zone             | Tension | Active mechanic    | Target aesthetic     | Notes                            |
|------|------------------|---------|--------------------|----------------------|----------------------------------|
| 0:00 | Entry            | 1       | MEC-001 (move)     | AES-001 (Discovery)  | Wide clearing, no UI prompt      |
| 0:20 | Clearing         | 1       | MEC-001 (move)     | AES-001 (Discovery)  | First branch decision            |
| 0:45 | Stream           | 2       | MEC-001 (jump)     | AES-001 (Discovery)  | First skill check — gap is small |
| 1:15 | Hollow           | 2       | MEC-001 (look)     | AES-001 (Discovery)  | Firefly partially visible        |
| 1:45 | Firefly approach | 3       | MEC-001 (approach) | AES-001 (Discovery)  | Firefly reacts to proximity      |
| 2:30 | Trail home       | 1       | MEC-001 (follow)   | AES-001 (Sensation)  | Firefly leads — pacing rest      |
| 3:00 | Exit             | 1       | —                  | AES-001 (Sensation)  | Tree lights up on arrival        |

## Encounters

### Stream Crossing

- **Location**: middle band of blockout, splits clearing from hollow
- **Mechanic mix**: MEC-001 (jump)
- **Expected dynamic**: DYN-001 — first commitment moment, no fail state large enough to punish
- **Success state**: player crosses to hollow side
- **Fail state**: player falls in shallow water, repositions back at near bank — no death, no penalty

### Firefly Approach

- **Location**: near far edge of map at (col=10, row=5)
- **Mechanic mix**: MEC-001 (move at slow speed)
- **Expected dynamic**: DYN-001 — proximity feedback teaches "approach gently" without text
- **Success state**: player slows within 4 studs, firefly attaches and starts trail
- **Fail state**: player sprints in, firefly flees ~8 studs further; resets after 5s

## Affordances

| Geometry            | Player action                    | Teaches spec |
|---------------------|----------------------------------|--------------|
| Open clearing       | Move freely — no constraint      | MEC-001      |
| Stream (1.5 studs)  | Jump — single press              | MEC-001      |
| Hollow lip          | Step down — no input             | MEC-001      |
| Berry patch entry   | Optional detour — visible reward | MEC-001      |

## Sightline Notes

- **From Entry**: Player sees the open clearing and trees framing two paths. The firefly is NOT visible. Hollow and exit are hidden behind trees on the right.
- **From Stream**: Player sees the hollow ahead. Glints of light hint at firefly without revealing it.
- **From Hollow**: Firefly silhouette visible against darker background. Exit is hidden behind firefly's tree.
- **From Exit looking back**: Player can see the entire critical path lit by the firefly's trail — visual reward.
- **Hidden**: Berry patch is hidden until player approaches the clearing's left edge.

## Optional Content

- **Berry Patch** (off Clearing, west): cosmetic — picking berries adds a visual flourish to the firefly's trail at the end. Rewards observant players without gating progression.

## Open Questions

- Does the stream gap read as jumpable from the clearing approach, or do players hesitate?
- Do players naturally slow on the firefly approach, or does the flee behavior frustrate them?
- Is the berry patch noticed on first traversal, or only on replays?

## Iteration Log

| Date       | Change                          | Why                                | Observed effect |
|------------|---------------------------------|------------------------------------|-----------------|
| 2026-05-05 | Initial blockout                | Reference example for LVL schema   | n/a             |
