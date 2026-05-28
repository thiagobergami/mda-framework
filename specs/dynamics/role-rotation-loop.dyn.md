---
id: DYN-002
name: Role Rotation Loop
traces_to_aesthetics: [AES-001]
---

# Role Rotation Loop

## Behavior Description

When a seeker finds a hider, the found hider becomes the next round's
seeker. Across the session this rotates the seeker role through the
group, so no single player is locked into seeking and no player is
locked out of it. The dynamic should produce a near-uniform
distribution of "rounds spent as seeker" across players over 4–8
rounds.

## Feedback System

Two loops shape role distribution:

- **Loop: Found-To-Seeker Handoff** — *Negative*. Cycle: player A is seeker → A finds B → B becomes seeker → B finds C → C becomes seeker → ... → role distribution evens out. Effect: dampens the tendency for the dominant seeker to dominate; preserves AES-001 (Fellowship) by keeping everyone cycling through both sides of the game.
- **Loop: Avoidance-Quit Damper** — *Negative* (failure mode). Cycle: player B is found near round end → about to become seeker → quits before next round → handoff broken → role distribution drifts. Effect: a failure loop the design must counter via a "rejoin and you keep your spot" rule (V1.1) or an explicit social norm communicated by the lobby UI.

### Diagram

```
   seeker A ─(finds)──▶ hider B
        ▲                 │
        │                 ▼
   round N+1: B is seeker
        │
        └─(distributes across group over N rounds)
```

## Interaction Patterns

### Pattern: Tie-Breaker on No Find
- **Trigger**: Round ends with no hider found (all hiders survived 60 s).
- **Sequence**: Seeker remains seeker for the next round → on the second consecutive no-find, a random hider becomes co-seeker → on the third, the current seeker swaps out with a randomly-picked hider.
- **Duration**: Resolved at round boundary, no in-round effect.
- **Outcome**: Prevents a single skilled seeker from being stuck losing forever.

### Pattern: First-Round Seeker Selection
- **Trigger**: Session start.
- **Sequence**: Seeker is the first player to press "ready" in the lobby (low-friction, opt-in).
- **Duration**: Instant.
- **Outcome**: A player who *wants* to seek gets the role; if no one volunteers, random pick after 5 s.

## Invariants

- **INV-1**: Exactly one seeker per round (unless the Tie-Breaker pattern's "co-seeker" branch fires, in which case exactly two).
- **INV-2**: A player cannot be seeker in two consecutive rounds *unless* they survived a no-find round (Tie-Breaker case).
- **INV-3**: If the previously-found hider has disconnected, the handoff falls to the next-most-recently-found hider in the round; if none, to a random remaining player.

## Degenerate Dynamics

- **Stuck Seeker**: One player is good enough that they find everyone every round → they never get found → they stay seeker forever. Breaks: AES-001 (the role distribution proxy fails). Detection: `role_rotation_balance > 1.5` across rounds 1–6. Prevention: Tie-Breaker pattern after the second no-find; the no-find streak forces a rotation.
- **Quitter Cascade**: Each player quits the instant they become seeker, breaking the handoff chain. Breaks: AES-001 (session persistence fails). Detection: spike in disconnects during the 5 s after a find event, sustained across rounds. Prevention: lobby UI explicitly frames the handoff as "your turn next" with a 5 s opt-out timer; on opt-out, role goes to next eligible player without penalty.

## Audience Context

Same as AES-001 — friend groups of 2–4 where the social context makes
the handoff feel like passing the talking stick, not a punishment.
