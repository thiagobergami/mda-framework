---
id: LVL-001
name: Sunlit Den
status: blockout
references:
  aesthetics: [AES-001, AES-002, AES-003]
  dynamics:   [DYN-001, DYN-002, DYN-003]
  mechanics:  [MEC-004, MEC-005, MEC-006]
  assets:     [AST-001, AST-002]
estimated_duration: 75
---

# Sunlit Den

## Player Goal

Play a single 60-second round of hide-and-seek in a small, sunlit one-room
home with 4–5 reachable hiding spots, then rotate roles in the lobby beat
before the next round.

## Aesthetic Targets

| Beat   | Target aesthetic       | Reasoning                                                  |
|--------|------------------------|------------------------------------------------------------|
| Entry  | AES-002 (Sensation)    | First impression sets the cozy register before play starts |
| Mid    | AES-001 (Fellowship)   | Round is the group's social peak — the shared minute       |
| Exit   | AES-003 (Discovery)    | Summary card draws attention to which new spot was used    |

## Critical Path

The "critical path" for a round-based party game is the trip from lobby
spawn into a hiding spot (hider) or the lobby-to-room transition (seeker),
not a level-traversal route. The diagram below traces a single hider's path
from spawn to a hidden state.

```
[LobbyPad] → (Foyer) → [Den] → (HidingSpot) → [Hidden]
                ↑                    ↑
             ready up           any of AST-001
                                variants placed
                                in the Den
```

## Blockout

```
┌──────────────────────────────────────────┐
│  L  L  .  .  .  .  .  .  .  .  .  .  .   │  L  = LobbyPad (ready-up)
│  L  L  .  .  .  .  .  .  .  .  .  .  .   │  F  = Foyer (transition)
│  .  .  F  F  .  .  .  .  .  .  .  .  .   │  D  = Den (play room)
│  .  .  F  F  .  .  .  .  .  .  .  .  .   │  H1 = Hiding spot, Basket
│  .  .  .  .  D  D  D  D  H2 .  .  .  .   │  H2 = Hiding spot, Wardrobe
│  .  .  .  .  D  H1 D  D  D  H3 .  .  .   │  H3 = Hiding spot, Curtain
│  .  .  .  .  D  D  D  D  D  D  .  .  .   │  H4 = Hiding spot, TableSkirt
│  .  .  .  .  D  H4 D  D  D  H5 .  .  .   │  H5 = Hiding spot, WindowSeat
│  .  .  .  .  D  D  D  D  D  D  .  .  .   │  .  = empty floor
└──────────────────────────────────────────┘
```

The Den is roughly 8 × 5 stud-tiles. Five spots use all five AST-001
variants so the level reads as five distinct corners (AES-003).

## Beat Chart

| Time   | Zone         | Tension | Active mechanic | Target aesthetic     | Notes                                         |
|--------|--------------|---------|-----------------|----------------------|-----------------------------------------------|
| 0:00   | LobbyPad     | 1       | MEC-004 R1      | AES-002 (Sensation)  | Pastel calm; ready button reads as soft chip  |
| 0:05   | Foyer        | 1       | MEC-004 R1      | AES-001 (Fellowship) | Players gather, role announce; group beat     |
| 0:10   | Den          | 2       | MEC-005 R1/2    | AES-003 (Discovery)  | Hiders move in, scan for novel spots          |
| 0:30   | Den          | 3       | MEC-005 R4      | AES-001 (Fellowship) | Seeker enters the Den; first finds happen     |
| 0:50   | Den          | 4       | MEC-005 R4      | AES-001 (Fellowship) | Late-round small spike per DYN-001            |
| 1:00   | Den → Foyer  | 1       | MEC-004 R4/5    | AES-002 (Sensation)  | Horn, warm pulse, found-card transition       |
| 1:08   | LobbyPad     | 1       | MEC-004 R5      | AES-001 (Fellowship) | Summary card; banter beat before next round   |

## Encounters

### First-Round Find

- **Location**: Den (any spot).
- **Mechanic mix**: MEC-005 Rule 4 (Find Detection), MEC-004 Rule 3
  (Find → Role Swap), MEC-006 (Hint surface, suppressed during first find).
- **Expected dynamic**: DYN-002 — the first found hider becomes next
  round's seeker; the round may continue if other hiders remain.
- **Success state**: A find event fires, the found hider exits `hidden`,
  the seeker visibly registers the find (AST-002 Reticle/Lock variant).
- **Fail state**: Timer reaches 0 with no finds — DYN-002 Tie-Breaker
  fires; same seeker keeps the role next round (first no-find).

### Spot-Novelty Nudge

- **Location**: Den, fired by MEC-006.
- **Mechanic mix**: MEC-006 Rule 1 (presentation-layer hint), reading
  the session spot-set from MEC-005 Rule 5.
- **Expected dynamic**: DYN-003 — the hint nudges a repeat hider to try a
  spot they have not used yet this session.
- **Success state**: The Hint/Spot variant of AST-002 surfaces for ≤ 4 s
  pointing at an unused spot. The next hide event lands on a novel spot.
- **Fail state**: The hint surfaces but the hider repeats their previous
  spot. Logged but not corrected — repetition is allowed, just not
  encouraged.

## Affordances

| Geometry                       | Player action                      | Teaches spec |
|--------------------------------|------------------------------------|--------------|
| LobbyPad (raised disc)         | Stand to ready up                  | MEC-004      |
| Foyer doorway                  | Walk through to enter the Den      | MEC-004      |
| AST-001 trigger volume         | Press interact to enter `hidden`   | MEC-005      |
| AST-001 cracked-open silhouette| Read as "I can fit in there"       | MEC-005      |
| Window sun-shaft (lighting)    | Read as warm/safe (no shadows)     | AES-002      |
| AST-002 Timer band (top)       | Read remaining round time          | MEC-004      |
| AST-002 Reticle (Lock variant) | See that a hider is in range + LOS | MEC-005      |

## Sightline Notes

- **From LobbyPad**: A full diagonal view through the Foyer into the Den.
  All five hiding spots are *partially* visible — players can see that the
  Den has many corners without seeing the specific occupancy.
- **From Foyer**: The Den's open floor reads first; the spots tuck around
  the edges so a player must actively scan to enumerate them.
- **From any AST-001 stand point**: The hider can see the Foyer doorway
  but only a narrow arc into the Den, so the seeker's approach is felt
  as audio + intermittent silhouette, not full visual.
- **Hidden until commit**: The contents of the WindowSeat lid (whether it
  opens away from or toward the seeker) is not telegraphed from outside
  the spot.

## Optional Content

- **Window perch** (off Den): cosmetic — players can stand on the window
  seat outside of `hidden` state for a view of the foyer. No mechanical
  reward; it exists to give a non-hider somewhere to look at the room.

## Open Questions

- Does the seeker's reticle (AST-002 Reticle/Lock) read as confirmation
  *before* the seeker presses interact, or do players still feel
  uncertain and over-press? Playtest with the placeholder.
- At hider capacity = 1 (TUN-001 default), do players queue politely at
  popular spots or rush, breaking the cozy register?
- Does the late-round AST-002 Timer/Pulse variant register as gentle
  (AES-002 preserved) or anxious (AES-002 broken)?

## Iteration Log

| Date       | Change                                          | Why                                  | Observed effect      |
|------------|-------------------------------------------------|--------------------------------------|----------------------|
| 2026-05-27 | Initial blockout — 5 spots, one of each variant | Dogfood D1.S2; satisfy AES-003 spec  | Pending first playtest |
