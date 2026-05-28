---
id: AES-002
name: Cozy Register
primary_aesthetic: Sensation
secondary_aesthetics: [Fellowship]
target_audience: Players who describe their preferred Roblox experiences as "chill", "soft", or "wholesome"
---

# Cozy Register

## Experience Goal

The game's audio-visual texture should produce the felt sensation of
*being inside a warm, small, soft space*. Pastel palette, ambient
strings and gentle harp under a low-pass filter, "pop"-style find
cues rather than alarm tones, no jump-scares, no chase music. A
player should pause after their first round and notice that the
register relaxed them — Sensation here is the room you walked into,
not a thing you actively pursue.

## Aesthetic Profile

### Primary: Sensation — Why dominant

This feature delivers the "Game as sense-pleasure" frame. The texture
is the second pillar after Fellowship and the one most likely to
collapse first under pressure to add tension. The game must feel
*cosy* even mid-round, even on the find — the find sound is a "pop",
not a "buzzer".

### Secondary: Fellowship — How it supports the primary

The cozy register protects Fellowship: a tense audio bed would make
the find feel like a defeat, breaking the social frame. Sensation
here is the soft surface on which the Fellowship loop runs.

## Observable Proxies

- **cozy_descriptor_rate**: Fraction of post-session survey responses
  using words in the set {soft, cozy, warm, gentle, sweet, chill}.
  Target: ≥ 0.5.
- **avg_session_volume_setting**: Mean in-client volume across players.
  Target: ≥ 0.6 (if the register were tense, players would mute or
  reduce volume).
- **mute_rate**: Fraction of players who mute audio within the first
  60 seconds. Target: ≤ 0.05.
- **find_to_lobby_pause_duration**: Mean seconds players linger in the
  lobby after a find before pressing "ready" for the next round.
  Target: 3–8 seconds (a too-short pause indicates the register did
  not produce a relaxation moment; a too-long pause indicates the
  pacing has gone flat).

## Anti-Patterns

- **Players mute the game audio**: The register has tipped into
  irritation or tension. Detection: `mute_rate > 0.10`.
- **"Tense" / "stressful" descriptors in feedback**: The Sensation
  goal has inverted. Detection: tag-frequency of {tense, stressful,
  intense, scary} ≥ 0.10 in post-session surveys.
- **Volume creep downward across the session**: Players turn the
  game down round by round. Detection: monotonic decrease in
  `avg_session_volume_setting` across rounds 1 → N within a session.

## Audience Context

Same audience as AES-001 (8–14, mixed-skill friend groups), with an
additional filter: this feature is aimed at the subset of Roblox
players who self-describe their preferred experiences as "chill" or
"cosy". For players who specifically seek out competitive or
high-tension experiences, this register will read as boring — that's
acceptable; they are not the target audience.
