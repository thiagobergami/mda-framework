---
id: MEC-001
name: Baby Chase — Player & Baby Movement
traces_to_dynamics: [DYN-001]
platform: roblox
language: luau
---

# Baby Chase — Player & Baby Movement

## Purpose

Provides the player with simple movement controls to explore the house, and gives the baby
autonomous movement to hide, peek, react, and run. This mechanic supports the Playful Pursuit
Cycle (DYN-001) which serves the Discovery aesthetic (AES-001).

The player's movement must feel smooth and non-threatening. The baby's movement must feel
alive and character-driven — not robotic pathfinding.

## Player Affordances

- **Walk**: Move through the house in any direction — Input: WASD / left stick / tap-to-move
- **Look around**: Rotate camera to survey rooms — Input: mouse / right stick / swipe
- **Approach**: Move toward the baby when spotted — Input: same as Walk (no special action)
- **Pick up**: Interact with sleepy baby to trigger bedtime — Input: proximity trigger (auto) or tap

Note: There is NO run, jump, or attack. The verb set is intentionally minimal for ages 3-7.

## Game Content

- **House**: A cozy, colorful 3D house with 4-6 rooms. Each room has distinct visual identity (kitchen = warm yellows, bedroom = soft blues, etc.)
- **Hiding spots**: 15-20 predefined positions tagged with `HidingSpot` CollectionService tag. Each has:
  - `difficulty`: Easy (partially visible) | Medium (behind furniture) | Hard (inside closet/under bed)
  - `peekAnimation`: How the baby peeks out from this spot
  - `revealAnimation`: How the baby is fully revealed
- **Baby character**: An animated NPC with expressive face rig and 8+ emotion animations
- **Props**: Furniture, toys, curtains — some are interactive (wiggle when baby is nearby)

## Rules

### Rule 1: Player Movement
- **Condition**: Player provides directional input
- **Effect**: Character moves in input direction at walk speed
- **Formula**: `position += direction * walkSpeed * deltaTime`
- **Parameters**:
  - `walkSpeed`: 12 studs/s [TUNABLE: TUN-001] — Range: [8, 18]

### Rule 2: Baby Hiding Selection
- **Condition**: Baby needs a new hiding spot (start of game, or after being found)
- **Effect**: Baby selects a hiding spot from the pool
- **Formula**: Weighted random selection favoring:
  - Spots NOT used in the last 3 cycles (weight: 3x)
  - Spots in rooms the player hasn't visited recently (weight: 2x)
  - Spots matching current difficulty tier (weight: 2x)
- **Parameters**:
  - `recentSpotMemory`: 3 cycles [TUNABLE: TUN-001] — Range: [2, 5]
  - `difficultyProgression`: [Easy, Easy, Medium, Medium, Hard, Medium, Easy] per cycle [TUNABLE: TUN-001]

### Rule 3: Baby Run-to-Hide
- **Condition**: Baby has selected a new hiding spot
- **Effect**: Baby runs to the spot using navmesh pathfinding, with playful animation (not panicked)
- **Formula**: `position += pathDirection * babyRunSpeed * deltaTime`
- **Parameters**:
  - `babyRunSpeed`: 20 studs/s [TUNABLE: TUN-001] — Range: [14, 28]
  - `runAnimationStyle`: "playful" (bouncy, giggly — not scared)

### Rule 4: Hint System
- **Condition**: Time since baby hid > hint threshold AND player has not found baby
- **Effect**: Escalating hints at time intervals
- **Formula**:
  ```
  if elapsed > hintTier1Time: play ambient sound from baby direction
  if elapsed > hintTier2Time: wiggle nearby prop
  if elapsed > hintTier3Time: baby peeks out briefly
  if elapsed > hintTier4Time: baby moves to easier spot
  ```
- **Parameters**:
  - `hintTier1Time`: 15s [TUNABLE: TUN-001] — Range: [10, 25]
  - `hintTier2Time`: 25s [TUNABLE: TUN-001] — Range: [18, 35]
  - `hintTier3Time`: 35s [TUNABLE: TUN-001] — Range: [25, 45]
  - `hintTier4Time`: 45s [TUNABLE: TUN-001] — Range: [35, 55]

### Rule 5: Discovery Trigger
- **Condition**: Player is within discovery range of hiding baby AND has line of sight
- **Effect**: Discovery sequence begins (baby reacts, count increments, sleepiness increases)
- **Formula**: `distance(player, baby) <= discoveryRange AND raycast(player, baby) == clear`
- **Parameters**:
  - `discoveryRange`: 8 studs [TUNABLE: TUN-001] — Range: [5, 15]

### Rule 6: Sleepiness Progression
- **Condition**: Baby is found (discovery event)
- **Effect**: Sleepiness counter increments. When threshold reached, baby enters wind-down behavior
- **Formula**: `sleepiness += 1; if sleepiness >= sleepinessThreshold then enterWindDown()`
- **Parameters**:
  - `sleepinessThreshold`: 6 discoveries [TUNABLE: TUN-001] — Range: [4, 10]

## Behavioral Contract

### Inputs
- `playerInput`: Vector3 direction from input system (Roblox UserInputService / ContextActionService)
- `deltaTime`: Frame time from RunService.Heartbeat
- `hidingSpots`: Array of HidingSpot instances from CollectionService

### Outputs
- `DiscoveryEvent`: Fired when player finds baby — carries: { spotId, discoveryTime, sleepiness }
- `HintEvent`: Fired when hint tier activates — carries: { tier, hintType }
- `BedtimeEvent`: Fired when sleepiness threshold reached — carries: { totalDiscoveries, sessionTime }

### Guarantees
- Player can ALWAYS move (no stun, root, or movement lock states)
- Baby ALWAYS has a valid hiding spot (spot pool is never exhausted)
- Hint system ALWAYS activates if discovery hasn't occurred within tier 1 time
- Discovery range check runs every frame (no missed discoveries due to frame skip)

## Acceptance Criteria

- [ ] Player moves smoothly in all 4 directions at configured walk speed
- [ ] Baby selects from 15+ unique hiding spots with weighted randomization
- [ ] Baby never selects the same spot as the previous cycle
- [ ] Hint tier 1 (sound) fires at exactly hintTier1Time after hiding
- [ ] Hint tier 4 (relocation) guarantees baby moves to Easy spot
- [ ] Discovery triggers within 1 frame of player entering range with line of sight
- [ ] DiscoveryEvent fires with correct metadata on every discovery
- [ ] Sleepiness increments by exactly 1 per discovery
- [ ] BedtimeEvent fires when sleepiness reaches threshold
- [ ] No movement verbs exist beyond walk/look/approach/pickup

## Integration Points

- **Fires**: `DiscoveryEvent`, `HintEvent`, `BedtimeEvent`
- **Listens**: `PlayerInput` (from UserInputService), `RunService.Heartbeat`
- **Reads**: `HidingSpot` tags from CollectionService, room visit history
- **Writes**: Player position, baby position, sleepiness counter, discovery history

## MDA Logger Integration (MEC-003)

Every game event in this mechanic must emit structured logs. Example integration:

```luau
local Log = require(path.to.MDALogger)

-- On game start
Log.info("M", "MEC-001", "GAME_START", { spots = #hidingSpots, difficulty = currentDifficulty })

-- On hint fired (Rule 4)
Log.info("M", "MEC-001", "HINT_FIRED", { tier = tier, elapsed = elapsed, babySpot = spotName }, cid)

-- On discovery (Rule 5) — correlate with expression and dynamic events
local cid = Log.correlate()
Log.info("M", "MEC-001", "DISCOVERY", {
    spot = spotName, time = searchDuration, sleepiness = sleepiness
}, cid)
-- Track for aesthetic proxy validation
Log.trackMetric("AES-001", "discovery_rate", searchDuration, 25, 10)
-- Check dynamic invariant
Log.checkInvariant("DYN-001", "INV-1", searchDuration < 50,
    string.format("discovery in %.1fs < 50s cap", searchDuration), cid)

-- On bedtime (Rule 6)
Log.info("M", "MEC-001", "BEDTIME", { totalDiscoveries = sleepiness, sessionTime = elapsed })
Log.summary()  -- Emit full session summary
```
