---
id: TUN-001
name: Round And Actions Tuning
traces_to_mechanics: [MEC-004, MEC-005, MEC-006]
traces_to_dynamics: [DYN-001, DYN-002, DYN-003]
traces_to_aesthetics: [AES-001, AES-002, AES-003]
---

# Round And Actions Tuning

## Tuning Goal

A cozy hide-and-seek round must produce the small, contained pressure spike
described in DYN-001 (Round Tension Loop) while preserving the warm
Fellowship register (AES-001) and never tipping into horror or grind. The
parameters below set the boundary conditions: how long the round runs, how
far the seeker reaches, how long the lobby pause lasts, and how aggressively
the spot-novelty signal nudges hiders toward new corners.

"Balanced" for this game means: ≥ 80% group retention per session (AES-001
primary proxy), ≥ 50% post-session "cozy" descriptor rate (AES-002 primary
proxy), and ≥ 2 unique hiding spots per player per session (AES-003 primary
proxy) — all simultaneously.

## Parameters

### roundDurationSeconds
- **Mechanic**: MEC-004, Rule 1
- **Current value**: 60
- **Range**: [45, 90]
- **Step**: 5
- **Affects dynamic**: DYN-001 — duration directly controls the timer-drain
  curve. Below 45 s the late-round spike fires too early; above 90 s the
  round drifts and the hider's calm doesn't recover before the horn.
- **Affects aesthetic**: AES-002 Cozy Register — long rounds turn cozy into
  tedium; short rounds clip the warm beat at the end.
- **Sensitivity**: High — a 15 s swing changes the felt rhythm of the round.

### lobbyPauseMaxSeconds
- **Mechanic**: MEC-004, Rule 5
- **Current value**: 10
- **Range**: [5, 15]
- **Step**: 1
- **Affects dynamic**: DYN-001 — pre-round doom loop prevention; the cap is
  what keeps players from spiralling about being seeker.
- **Affects aesthetic**: AES-001 Fellowship — too short, the group doesn't
  re-form between rounds; too long, energy bleeds out.
- **Sensitivity**: Medium.

### readyWaitTimeoutSeconds
- **Mechanic**: MEC-004, Rule 1
- **Current value**: 30
- **Range**: [15, 45]
- **Step**: 5
- **Affects dynamic**: DYN-001 — controls how long the lobby will wait for
  stragglers before starting with whoever's ready.
- **Affects aesthetic**: AES-001 — too short forces people in mid-bio-break;
  too long lets early-readys lose patience.
- **Sensitivity**: Low.

### findRangeStuds
- **Mechanic**: MEC-005, Rule 4
- **Current value**: 8
- **Range**: [5, 12]
- **Step**: 1
- **Affects dynamic**: DYN-002 — small range = seeker has to commit and look
  closely; large range = finds happen passively as the seeker walks.
- **Affects aesthetic**: AES-001 — at the high end finds feel cheap and rob
  the hider of the small-victory moment; at the low end seekers can fail
  even on a clear sight-line, which feels unfair.
- **Sensitivity**: High — this is the most-iterated value.

### hidingCapacityDefault
- **Mechanic**: MEC-005, Rule 1
- **Current value**: 1
- **Range**: [1, 3]
- **Step**: 1
- **Affects dynamic**: DYN-003 — higher capacity flattens the spot-novelty
  pressure (everyone can pile into the best spot). Default 1 forces hiders
  to diversify.
- **Affects aesthetic**: AES-003 — directly governs whether the map's spot
  surface area is "used up" within a session.
- **Sensitivity**: Medium — individual spots can override the default via
  their `HidingCapacity` Attribute.

### spotNoveltyHintThreshold
- **Mechanic**: MEC-006, Rule 1
- **Current value**: 0.6
- **Range**: [0.3, 0.9]
- **Step**: 0.05
- **Affects dynamic**: DYN-003 — fraction of session spots a player must
  have used before the presentation layer surfaces a "try a new corner"
  hint. Lower fires hints earlier; higher delays them.
- **Affects aesthetic**: AES-003 — too eager, the game nags; too late, the
  hint never fires before the session ends.
- **Sensitivity**: Medium.

### roundSummarySeconds
- **Mechanic**: MEC-004, Rule 5
- **Current value**: 8
- **Range**: [5, 12]
- **Step**: 1
- **Affects dynamic**: DYN-001 — the resolution beat after the horn. Holds
  the warm Sensation pulse before returning to lobby.
- **Affects aesthetic**: AES-002 — the cozy "phew, that was nice" beat lives
  here.
- **Sensitivity**: Low.

## Target Metrics

| Metric                          | Target | Tolerance | Source   |
|---------------------------------|--------|-----------|----------|
| Round completion rate           | 0.95   | ± 0.03    | GAME-001 |
| Group retention (rounds played) | 4      | ± 1       | AES-001  |
| Unique spots used per player    | 2      | ± 0.5     | AES-003  |
| Post-find chat density (5 s)    | 0.5    | ± 0.2     | AES-001  |
| Late-round tension peak (≤10s)  | 1      | ± 0       | DYN-001  |
| Cozy-descriptor survey rate     | 0.5    | ± 0.1     | AES-002  |

## Tuning Constraints

- `lobbyPauseMaxSeconds + roundSummarySeconds ≤ roundDurationSeconds / 2` —
  Why: dead air between rounds must stay below active round time or the
  session's pace collapses (DYN-001 doom-loop risk).
- `findRangeStuds ≤ min(spot.triggerRadius) + 2` per level — Why: if find
  range exceeds the spot's trigger plus a small margin, the seeker can find
  hiders before the spot even reads as "occupied", breaking MEC-005 Rule 4's
  contract.
- `hidingCapacityDefault × spotCount ≥ 2 × maxPlayers` — Why: there must be
  more hider-slots than hiders, or DYN-003's spot novelty signal collapses.
- `spotNoveltyHintThreshold` cannot rise above 0.9 — Why: above that, hints
  effectively never fire, and AES-003's "encouraged exploration" promise
  becomes a lie.

## Known Trade-offs

- **roundDurationSeconds vs AES-001 Fellowship**: Longer rounds give finds
  more breathing room (good for Fellowship beats) but degrade AES-002
  cozy-register (too long, the warm bath turns tepid). 60 s sits at the
  sweet spot in playtesting.
- **findRangeStuds vs Fellowship-vs-Challenge balance**: Larger range
  pushes the round toward Challenge (the seeker dominates); smaller range
  pushes toward Discovery (hiders win more often). Fellowship is preserved
  best in the middle of the range, around 7–9 studs.
- **hidingCapacityDefault vs DYN-003 spot novelty**: Capacity 2+ flattens
  the novelty pressure (any spot can absorb the whole hider group) but
  reduces social friction at popular spots, which AES-001 actually likes.
  Default 1 with per-spot overrides for "cozy nooks" is the compromise.

## Iteration Log

### Iteration 1 — 2026-05-27
- **Changed**: Initial values committed from the dogfood walkthrough.
- **Reason**: First pass — values chosen from the WORKFLOW.md example and
  the cozy hide-and-seek concept's success criteria. No playtest data yet.
- **Observed**: N/A — values still to be tested against the LVL-001
  blockout in a 4-player session.
- **Decision**: Keep — re-evaluate after first internal playtest.
