---
id: AES-003
name: Hiding Spot Discovery
primary_aesthetic: Discovery
secondary_aesthetics: [Fellowship]
target_audience: Repeat players within a session — the proxy targets only become meaningful from round 2 onwards
---

# Hiding Spot Discovery

## Experience Goal

Across a session, players should keep noticing *new* corners of the
small map and feel a small spark of the "Game as uncharted territory"
frame on each one. Discovery here is intentionally subordinate to
Fellowship — the map is tiny, the spots are knowable in a few sessions
— but the cumulative experience over a player's lifetime with the game
is a slow uncovering rather than a memorised drill.

## Aesthetic Profile

### Primary: Discovery — Why dominant

This feature exists to keep the *texture* of exploration alive on a
deliberately small map. Without it, the game collapses into one or
two "best" hiding spots after the first session and Fellowship has
nothing fresh to wrap itself around.

### Secondary: Fellowship — How it supports the primary

A new spot found by one player becomes social capital — the next
round, others notice that player's choice. Discovery feeds the
shared mental map the group accumulates together.

## Observable Proxies

- **unique_spots_per_player_per_session**: Mean count of distinct
  hiding spots used by a given player over the session. Target: ≥ 2.
- **novel_spot_rate_round_5**: Fraction of round-5 hiders who picked a
  spot they had not used in rounds 1–4 of the same session.
  Target: ≥ 0.4.
- **session_spot_diversity_index**: Shannon entropy across hiding-spot
  choices in the session (higher = more spread). Target: ≥ 0.7 of the
  theoretical max for the map.

## Anti-Patterns

- **One "best" spot dominates**: A single hiding spot is used in the
  majority of rounds across the session. Detection: any spot exceeds
  40% of total hides in a session.
- **Repeat-spot lock-in**: A player uses the same spot in three
  consecutive rounds. Detection: rolling-window check on hide events.
- **Map exhausted in one session**: After the first session, no novel
  spots appear. Detection: `novel_spot_rate_round_5 = 0` for a player
  with > 3 prior sessions on the same map. (Triggers level-design
  follow-up to add more affordances.)

## Audience Context

The proxy targets above only become meaningful from a player's second
round in the same session — round 1 is the calibration round where
every spot is novel by definition. The targets also assume the player
has > 1 prior session in the lobby; first-session players get
Discovery for free from the map's existence and are not the audience
for the proxies.
