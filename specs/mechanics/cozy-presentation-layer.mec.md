---
id: MEC-006
name: Cozy Presentation Layer
traces_to_dynamics: [DYN-001]
---

# Cozy Presentation Layer

## Purpose

Owns the audio-visual surface that produces the AES-002 (Cozy Register)
experience. Concretely: the pastel palette applied to the round-state
HUD, the ambient music bed during rounds, the "pop" find cue, and the
timer-display rules. This mechanic is the cap on DYN-001's Seeker
Confidence Build loop — by refusing to escalate audio or visual
intensity as the timer drains, it prevents the loop from sliding into
a tense register.

## Player Affordances

- **Adjust master volume**: Standard Roblox volume slider; this
  mechanic does not introduce its own. — Input: client-side OS-level audio.
- **Mute toggle**: Standard Roblox mute. The `mute_rate` proxy on
  AES-002 measures usage of this affordance. — Input: client.

## Game Content

- **Cozy palette swatch**: Centralized color tokens used by the HUD,
  lobby UI, and ambient lighting. — Asset: AST-002 (Cozy Palette) — Status: concept.
- **Ambient music bed**: Looping 90-bpm string + harp pad under a
  3 kHz low-pass filter. — Asset: AST-003 (Cozy Ambient Bed) — Status: concept.
- **Find pop SFX**: 200 ms positive-register "pop" played on every
  find event from MEC-005. — Asset: AST-004 (Find Pop) — Status: concept.
- **Round-end horn**: Soft warm horn played at round_end. — Asset: AST-005 (Round-End Horn) — Status: concept.

## Rules

### Rule 1: Audio Register Lock
- **Condition**: Round state is `round_in_progress`.
- **Effect**: Ambient music bed plays at constant volume and tempo for
  the entire 60 s. No tempo ramp, no key change, no escalation in
  intensity as the timer drains. This is the DYN-001 Timer-Cap Damper
  expressed at the audio layer.

### Rule 2: Find Cue Constraint
- **Condition**: A find event fires (from MEC-005 Rule 4).
- **Effect**: Play the "pop" SFX at exactly the find position. Do NOT
  trigger an alarm tone, sting, or musical accent. The cue is the
  find's only audio acknowledgment.

### Rule 3: Timer HUD Calm
- **Condition**: Round state is `round_in_progress`.
- **Effect**: The timer display uses the cozy palette throughout —
  no red tint, no flash, no enlargement, even at single-digit seconds.
  The number simply counts down.

### Rule 4: Round Boundary Soundscape
- **Condition**: Round state transitions to `round_summary`.
- **Effect**: Crossfade ambient bed to silence (1 s), play round-end
  horn once, hold silence for the duration of the round summary, then
  fade ambient bed back in on lobby return.

## Behavioral Contract

### Inputs
- **round_state**: From MEC-004; gates ambient music start/stop and
  timer display.
- **find_events**: From MEC-005; triggers Rule 2.
- **client_volume**: Client-side audio setting (for AES-002 proxy
  collection, not for behavioral input).

### Outputs
- **audio_bus_routing**: Music bed, find pop, round-end horn routed to
  the appropriate channels at the volumes specified in TUN-002.
- **hud_render_tokens**: Color and typography tokens published to the
  HUD; consumed by the round-timer display and round-summary card.
- **proxy_telemetry**: `mute_rate`, `avg_session_volume_setting`, and
  `find_to_lobby_pause_duration` measurements published per AES-002.

## Acceptance Criteria

- [ ] Ambient music tempo and volume are constant for the entire round
  (Rule 1 — measurable via audio analysis on a recorded session).
- [ ] No HUD element changes color, size, or animation rate as the
  round timer crosses 10 s remaining (Rule 3).
- [ ] The find cue (Rule 2) is exactly one short pop with no overlay.
- [ ] `mute_rate` is collected and reported per AES-002 cadence.
- [ ] Audio tokens, palette tokens, and SFX paths are sourced from
  TUN-002 — no hard-coded asset IDs or volume numbers in the
  mechanic implementation.

## MDA Logger Integration

```luau
local Log = require(game.ReplicatedStorage.Shared.MDALogger)

-- On find event: confirm cozy cue fired correctly
Log.info("M", "MEC-006", "FIND_CUE_PLAYED", {
  sfx = "find_pop",
  duration_ms = 200,
  volume = state.findPopVolume,
})

-- AES-002 proxy collection at session end
Log.trackMetric("AES-002", "mute_rate", sessionMuteRate(), 0.05, 0.05)
Log.trackMetric("AES-002", "avg_session_volume_setting",
  sessionAvgVolume(), 0.6, 0.1)
```
