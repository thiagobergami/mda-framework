---
id: MEC-004
name: Round Lifecycle
traces_to_dynamics: [DYN-001, DYN-002]
---

# Round Lifecycle

## Purpose

Owns the state machine that takes a session from lobby through a round
to find-or-timeout and back to lobby. Implements the 60-second cap
(DYN-001 INV-1) and the find-to-seeker handoff (DYN-002). Without this
mechanic neither dynamic can hold its invariants — the timer would
have nowhere to live and the role-rotation rule would have no trigger.

## Player Affordances

- **Ready up**: Player presses "ready" in the lobby to indicate they
  will play the next round. — Input: lobby UI button (keyboard / touch / gamepad confirm).
- **Leave session**: Player can disconnect cleanly at any time. — Input: standard Roblox leave-game.
- **Acknowledge round summary**: Player dismisses the per-round summary
  card to return to the lobby. — Input: any input.

## Game Content

- **Round timer display**: HUD element bound to the round-state clock.
  — Asset: AST-002 (cozy palette + readable timer) — Status: concept.
- **Round summary card**: Lobby-screen UI element showing the round's
  outcome (who hid, who was found, who's seeking next). — Asset: AST-002 — Status: concept.

## Rules

### Rule 1: Lobby → Round
- **Condition**: All connected players have pressed "ready" OR 30 seconds have elapsed since the first "ready" press AND at least 2 players are ready.
- **Effect**: State transitions to `round_in_progress`. The seeker is assigned per MEC-005 First-Round Seeker Selection. Round timer starts at 60.000 s.

### Rule 2: Round Timer Drain
- **Condition**: State is `round_in_progress`.
- **Effect**: Round timer decrements at wall-clock rate. The timer is the system source of truth — no client-side speculation.

### Rule 3: Find → Role Swap
- **Condition**: Seeker successfully triggers a find on a hider (per MEC-005 Rule 3).
- **Effect**: Found hider is recorded. Round may continue (if other hiders remain) or end (if last hider found). On round end, next-round seeker is set to the *first* hider found in this round (DYN-002 INV-1, INV-3).

### Rule 4: Timer Expiration (No Find)
- **Condition**: Round timer reaches 0 and at least one hider remains unfound.
- **Effect**: State transitions to `round_summary`. Per DYN-002 Tie-Breaker pattern: first no-find → seeker stays; second consecutive → co-seeker assigned; third → forced rotation.

### Rule 5: Round Summary → Lobby
- **Condition**: All present players have pressed "ack" OR 10 seconds have elapsed in `round_summary`.
- **Effect**: State transitions to `lobby`. Next-round seeker assignment is published. Per DYN-001 Pre-Round Doom Loop prevention: lobby pause is capped at 10 s.

## Behavioral Contract

### Inputs
- **player_ready_events**: Stream of `{player_id, ready: boolean}` from the lobby UI.
- **find_events**: Stream of `{seeker_id, hider_id, ts}` from MEC-005.
- **timer_tick**: Server clock pulse at ≥ 10 Hz for the round-state clock.
- **player_disconnect_events**: Standard Roblox player-removing signal.

### Outputs
- **round_state**: Replicated enum `{lobby, round_in_progress, round_summary}` visible to all clients.
- **seeker_assignment**: Replicated `{seeker_id, round_number}` published on every lobby → round transition.
- **round_outcome**: Per-round record `{round_number, seeker_id, hiders_found: [id], hiders_escaped: [id], duration_s}` written to the session log.

## Acceptance Criteria

- [ ] Rule 1 never fires with fewer than 2 ready players, even after the 30 s ready-wait timeout.
- [ ] The round timer never exceeds 60.000 s wall-time, even if the client tab is backgrounded (server-authoritative clock).
- [ ] On a successful find, the found hider's id is recorded *before* the role-swap calculation runs.
- [ ] DYN-002 INV-3 holds: if the prior round's first-found-hider has disconnected, the next seeker falls back to the next-found, then to a random remaining player.
- [ ] The lobby pause in `round_summary` is capped at 10 s wall-clock.
- [ ] No round produces a `round_outcome` with an empty `hiders_found` array AND an empty `hiders_escaped` array (every round has at least one outcome row).

## MDA Logger Integration

```luau
local Log = require(game.ReplicatedStorage.Shared.MDALogger)

-- On round start
local cid = Log.correlate()
Log.info("M", "MEC-004", "ROUND_START", {
  round_number = state.roundNumber,
  seeker_id = state.seekerId,
  hider_count = #state.hiderIds,
}, cid)

-- On round end
Log.info("M", "MEC-004", "ROUND_END", {
  round_number = state.roundNumber,
  duration_s = state.elapsed,
  found_count = #state.hidersFound,
}, cid)

-- Invariant check for DYN-001 INV-1
Log.checkInvariant("DYN-001", "INV-1", state.elapsed <= 60.0,
  string.format("round %d duration %.2f s", state.roundNumber, state.elapsed))
```
