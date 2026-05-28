---
id: AES-001
name: Round Fellowship
primary_aesthetic: Fellowship
secondary_aesthetics: [Sensation]
target_audience: Mixed-skill friend groups of 2-4 players, ages 8-14
---

# Round Fellowship

## Experience Goal

A round of cozy hide-and-seek should produce the sensation of *playing
together as a single social unit*. Even though the surface mechanic is
competitive (one seeker, several hiders), the felt experience is shared
mischief — a giggle on the find, a relieved exhale on the time-out, a
brief swap of roles, then we start again. No player should ever feel
removed from the group.

## Aesthetic Profile

### Primary: Fellowship — Why dominant

This feature exists to deliver the "Game as social framework" frame from
the MDA paper. Every rule that surrounds the round — its 60-second cap,
the no-elimination handoff, the lobby pause between rounds — is shaped
to keep the social unit intact. When Fellowship tensions with Challenge
(e.g., a dominant seeker), the design favors Fellowship: the role
rotates next round, the dominant player becomes a hider, balance
restores itself.

### Secondary: Sensation — How it supports the primary

The soft pastel register, the gentle "pop" feedback on a find, and the
warm ambient bed during a round are the *texture* of Fellowship. They
remove the dread that a tenser register would inject into hide-and-seek
and protect the social frame.

## Observable Proxies

- **rounds_per_session_before_leave**: Mean number of consecutive rounds
  a given player stays for before disconnecting. Target: ≥ 4 (the
  feature works when players want to keep playing together).
- **role_rotation_balance**: Standard deviation of "rounds spent as
  seeker" across players in a session. Target: ≤ 1.0 (no one is locked
  into one role for the whole session).
- **post_find_chat_messages**: Mean chat messages per find event within
  5 seconds. Target: ≥ 0.5 (silence on a find indicates the social
  frame has collapsed into competition).
- **session_persistence_at_round_4**: Fraction of starting players still
  present at round 4. Target: ≥ 0.8.

## Anti-Patterns

- **One player seeks every round**: The role-handoff rule is broken or
  the seeker is winning so cleanly that the swap never happens.
  Detection: `role_rotation_balance > 1.5` for two consecutive
  sessions.
- **Silence on the find**: Players treat the find as a competitive
  outcome rather than a shared moment. Detection:
  `post_find_chat_messages < 0.1` averaged over a session.
- **Group dissolves mid-session**: Players leave individually before
  round 4. Detection: `session_persistence_at_round_4 < 0.5`.
- **Player avoidance of role-swap**: Players found early in a round
  quit before the next round starts to avoid becoming the seeker.
  Detection: disconnect spike in the 5-second window after a find
  event.

## Audience Context

Designed for *friend groups*, not strangers. The aesthetic depends on
players already having a baseline social context (voice chat, shared
lobby, or co-located play). With pure strangers the Fellowship signal
weakens — the proxies above can be used to detect that case and the
matchmaking layer (not in V1) would route those players elsewhere.
