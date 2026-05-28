---
id: DYN-003
name: Spot Novelty Loop
traces_to_aesthetics: [AES-003]
---

# Spot Novelty Loop

## Behavior Description

A player who tries a hiding spot they have not used before — and either
gets found or escapes — adds that spot to their personal repertoire and
becomes incrementally more likely to try yet another new spot next
round. The cumulative effect across a session is the
`unique_spots_per_player_per_session` proxy from AES-003 climbing
toward its target.

## Feedback System

Two competing loops shape spot diversity:

- **Loop: Novelty Reinforcement** — *Positive*. Cycle: player picks new spot → outcome (found or escape) → mental tag "I tried that one" → next round picks another new spot → repeat → eventually the map's spot set is exhausted → reset on next session. Effect: drives AES-003 (Discovery) — the player's mental map grows across the session.
- **Loop: Comfort-Spot** — *Positive* (failure mode). Cycle: player picks favorite spot → escapes → confirms favorite → picks same spot next round → repeats forever. Effect: a failure loop the design must counter; the "One best spot dominates" anti-pattern from AES-003 maps to a runaway Comfort-Spot.

### Diagram

```
   pick novel spot ──(+)──▶ outcome
         ▲                    │
         │                    ▼
         │              add to "known" set
         │                    │
         └────────────────────┘
                  amplifies

   pick comfort spot ──(+)──▶ escape (likely)
         ▲                       │
         │                       ▼
         │                  confirm preference
         │                       │
         └───────────────────────┘
                FAILURE MODE — competes with above
```

## Interaction Patterns

### Pattern: Spot Hint on Repeat
- **Trigger**: Player picks the same hiding spot for the third consecutive round.
- **Sequence**: Lobby UI shows a soft hint ("3 of 5 hiding spots on this map are unused — explore!") → no enforcement, just visibility.
- **Duration**: Visible during the next lobby pause, dismissable.
- **Outcome**: Nudges Comfort-Spot players back toward Novelty Reinforcement without forcing.

### Pattern: Map-Exhausted Trigger
- **Trigger**: All hiding spots on a map have been used at least once by the same player.
- **Sequence**: At round end, a celebratory toast fires: "You've found every nook!" → unlocks a small cosmetic in the lobby (no game-mechanical effect).
- **Duration**: One-time per map per player.
- **Outcome**: Caps the Novelty Reinforcement loop with a graceful exit, then signals to level design that this player needs a bigger map (informs map-size tuning).

## Invariants

- **INV-1**: The set of hiding spots a player has used is persisted per (player, map) tuple for the lifetime of the session. Cleared on session end.
- **INV-2**: Every hiding spot on the map must be reachable from the lobby spawn within the round's 60-second budget. (If a spot is unreachable in time, it cannot participate in Novelty Reinforcement.)
- **INV-3**: The Spot Hint on Repeat pattern fires at most once per session per player.

## Degenerate Dynamics

- **Comfort-Spot Runaway**: A single favorite spot dominates a player's session. Breaks: AES-003 (Discovery proxies fail). Detection: per-player single-spot use ≥ 60% within a session of 4+ rounds. Prevention: Spot Hint on Repeat pattern plus level design that ensures no single spot is dominantly survivable.
- **Map Exhausted, No Refresh**: A repeat-player has used every spot and the game offers no map rotation. Breaks: AES-003 over the player's lifetime. Detection: `novel_spot_rate_round_5 = 0` for a player with > 3 prior sessions on the same map. Prevention: a map rotation system (post-V1) or an explicit "new map added" event.

## Audience Context

Discovery's audience here is the *repeat player* on a specific map.
First-session players get Discovery for free; the proxies kick in from
session 2 onward, when the player's prior spot set is non-empty.
