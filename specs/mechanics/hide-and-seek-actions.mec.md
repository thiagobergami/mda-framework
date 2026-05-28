---
id: MEC-005
name: Hide And Seek Actions
traces_to_dynamics: [DYN-001, DYN-002, DYN-003]
---

# Hide And Seek Actions

## Purpose

Owns the per-player verbs that produce hiding behavior, seeking
behavior, and the find event. Without this mechanic the round
lifecycle (MEC-004) has no triggers, the spot-novelty loop (DYN-003)
has no choices to observe, and the find-to-handoff rule (DYN-002) has
no input.

## Player Affordances

- **Hide at spot**: When a hider stands within the trigger volume of a
  Hiding Spot and presses the interact key, they enter `hidden` state
  and become invisible/silent to seekers. — Input: keyboard E / touch
  tap on contextual prompt / gamepad south face button.
- **Cancel hide**: A hider can press the same interact key to leave
  the spot at any time. — Input: same as Hide at spot.
- **Look around (seeker)**: Standard Roblox camera. No special verb;
  the seeker explores the map using existing movement controls. — Input:
  keyboard/mouse, virtual joystick, gamepad stick.
- **Declare found**: When a seeker is within `findRange` studs of a
  hider AND has line-of-sight, they press interact to register a find.
  — Input: keyboard E / touch tap / gamepad south face button.

## Game Content

- **Hiding Spot**: A tagged Instance with a trigger volume and a
  `HidingCapacity` Attribute (default 1). The Spot Hint on Repeat
  pattern (DYN-003) reads from this collection. — Asset: AST-001 (cozy
  hiding-spot variants) — Status: concept.
- **Seeker reticle**: HUD element showing the seeker their current
  find range and current line-of-sight target. — Asset: AST-002 (cozy
  palette) — Status: concept.

## Rules

### Rule 1: Hide Eligibility
- **Condition**: Player role is `hider`, player is within the trigger
  volume of a Hiding Spot, the spot's current occupancy is
  `< HidingCapacity`, and the round state is `round_in_progress`.
- **Effect**: Player enters `hidden` state. Player's collision is
  preserved (so they cannot stack) but their renderer is hidden to
  seekers and their footsteps are muted.

### Rule 2: Hide Persistence
- **Condition**: Player is in `hidden` state.
- **Effect**: State persists until (a) the player cancels (Rule 3),
  (b) a seeker successfully finds them (Rule 4), or (c) the round
  ends (MEC-004 Rule 4).

### Rule 3: Hide Cancel
- **Condition**: Player is `hidden` and presses interact, OR walks
  outside the trigger volume.
- **Effect**: Player exits `hidden` state and becomes visible to
  seekers immediately. (No grace period — this prevents griefing
  hiders from hopping in/out as decoys.)

### Rule 4: Find Detection
- **Condition**: Player role is `seeker`, target player is `hidden`,
  target is within `findRange` studs (TUN-001), seeker has clear
  line-of-sight to the target's spot, and seeker presses interact.
- **Effect**: Find event fires `{seeker_id, hider_id, ts, spot_id}`.
  Target hider exits `hidden` state. Per DYN-002 Found-To-Seeker
  Handoff, this hider is recorded as a candidate for next-round
  seeker (first found is chosen).

### Rule 5: Spot Novelty Tracking
- **Condition**: Player enters `hidden` state at a Spot they have not
  used before in the current session.
- **Effect**: Add Spot to player's session spot-set. The Map-Exhausted
  Trigger pattern (DYN-003) reads this set.

## Behavioral Contract

### Inputs
- **interact_events**: Per-player `{player_id, ts}` from the
  context-action service.
- **player_positions**: Per-player position stream at heartbeat rate.
- **round_state**: From MEC-004; gates whether Hide/Find can fire.
- **role_assignment**: From MEC-004; tells which players are hiders
  vs seeker.

### Outputs
- **hide_events**: `{player_id, spot_id, ts, novel: boolean}` published when
  Rule 1 fires.
- **find_events**: `{seeker_id, hider_id, spot_id, ts}` published when Rule 4
  fires. Consumed by MEC-004 to drive the role-swap.
- **player_hidden_state**: Per-player boolean replicated to all clients
  (visible to other hiders, hidden from seekers — security boundary).

## Acceptance Criteria

- [ ] A hider standing in a Spot's trigger volume that already has
  `occupancy == HidingCapacity` cannot enter `hidden` (Rule 1).
- [ ] A find event never fires for a target that is not in `hidden`
  state.
- [ ] A find event never fires across a wall (line-of-sight check
  uses Roblox `Raycast` against `findRange` from MEC-006 cue position).
- [ ] On round end, all `hidden` players are forcibly exited from
  `hidden` state before the round summary renders.
- [ ] The session spot-set (Rule 5) is cleared when the session ends
  per DYN-003 INV-1.
- [ ] `findRange` is sourced exclusively from TUN-001 — no hard-coded
  numeric literal in the mechanic implementation.

## MDA Logger Integration

```luau
local Log = require(game.ReplicatedStorage.Shared.MDALogger)

local function onHide(playerId, spotId, isNovel)
  local cid = Log.correlate()
  Log.info("M", "MEC-005", "HIDE", {
    player_id = playerId, spot_id = spotId, novel = isNovel,
  }, cid)
end

local function onFind(seekerId, hiderId, spotId)
  local cid = Log.correlate()
  Log.info("M", "MEC-005", "FIND", {
    seeker_id = seekerId, hider_id = hiderId, spot_id = spotId,
  }, cid)
  -- AES-001 proxy: chat message count in 5s window after find
  Log.trackMetric("AES-001", "post_find_chat_messages",
    countChatIn(5), 0.5, 0.2)
end
```
