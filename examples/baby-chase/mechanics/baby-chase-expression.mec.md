---
id: MEC-002
name: Baby Chase — Baby Expression System
traces_to_dynamics: [DYN-001]
platform: roblox
language: luau
---

# Baby Chase — Baby Expression System

## Purpose

Gives the baby character a rich set of emotional expressions that make discoveries feel rewarding
and the baby feel alive. This mechanic is critical to the Sensation and Fantasy secondary
aesthetics in AES-001 — without expressive reactions, discoveries feel empty.

The paper emphasizes that in the first-pass babysitting game, "the majority of game logic would
be devoted to maneuvering the baby into view and creating baby-like reactions."

## Player Affordances

- **Observe**: See the baby's emotional reactions — Input: passive (visual/audio)
- **Approach**: Moving closer to the baby triggers contextual reactions — Input: proximity

The player doesn't directly control expressions — they emerge from game state. The player's
agency is in creating the situations that trigger expressions.

## Game Content

- **Emotion set**: Surprise, Giggle, Laugh, Shy, Sleepy, Excited, Peek, Yawn
- **Animation library**: One or more animations per emotion, blended based on sleepiness level
- **Sound library**: Matching sound effects per emotion (baby sounds, giggles, yawns)
- **Particle effects**: Small bursts on discovery (stars, sparkles — not aggressive)
- **Face rig**: Blendshapes or bone-based facial animation for the baby model

## Rules

### Rule 1: Discovery Reaction Selection
- **Condition**: DiscoveryEvent fires
- **Effect**: Baby plays a reaction from the pool, escalating with discovery count
- **Formula**:
  ```
  if discoveryCount <= 2: reaction = weightedRandom(Surprise, Shy, Peek)
  if discoveryCount <= 4: reaction = weightedRandom(Giggle, Laugh, Excited)
  if discoveryCount <= 6: reaction = weightedRandom(Giggle, Sleepy, Yawn)
  if discoveryCount > 6: reaction = weightedRandom(Sleepy, Yawn)
  ```
- **Parameters**:
  - `reactionDuration`: 1.5s [TUNABLE: TUN-001] — Range: [0.8, 3.0]
  - `escalationThresholds`: [2, 4, 6] [TUNABLE: TUN-001]

### Rule 2: Idle Expression
- **Condition**: Baby is hiding and undiscovered
- **Effect**: Baby plays subtle idle animations (peeking, fidgeting, suppressing giggles)
- **Formula**: Random idle every `idleInterval` ± 30% variance
- **Parameters**:
  - `idleInterval`: 4s [TUNABLE: TUN-001] — Range: [2, 8]

### Rule 3: Hint Expressions
- **Condition**: HintEvent fires at any tier
- **Effect**: Baby plays expression corresponding to hint tier
- **Formula**:
  ```
  tier 1: muffled giggle sound (no visual)
  tier 2: nearby prop wiggles (baby pushes it)
  tier 3: baby peeks out with Peek expression
  tier 4: baby stands up with Excited expression, runs to easier spot
  ```

### Rule 4: Sleepiness Blending
- **Condition**: sleepiness > 0
- **Effect**: All animations are blended with sleepiness modifier
- **Formula**: `animationSpeed *= 1.0 - (sleepiness / sleepinessThreshold * 0.4)`
- **Parameters**:
  - `maxSleepinessSlowdown`: 0.4 (40% slower at max sleepiness) [TUNABLE: TUN-001]

## Behavioral Contract

### Inputs
- `DiscoveryEvent`: Triggers reaction selection
- `HintEvent`: Triggers hint expression
- `sleepiness`: Current sleepiness counter (from MEC-001)
- `deltaTime`: Frame time

### Outputs
- `ExpressionStarted`: Event carrying { emotionType, animationId, duration }
- `ExpressionEnded`: Event carrying { emotionType }
- Visual/audio output to the player (animations, sounds, particles)

### Guarantees
- Every DiscoveryEvent produces EXACTLY ONE reaction (never silent)
- Reactions never overlap (queue if needed, but current design prevents this)
- Sleepiness blending is smooth (no sudden speed changes)
- Sound and animation are synchronized (within 1 frame)

## Acceptance Criteria

- [ ] All 8 emotions have at least one animation and one sound effect
- [ ] Discovery reaction matches escalation tier based on discovery count
- [ ] No two consecutive discoveries play the identical animation
- [ ] Idle animations play at configured interval while baby is hiding
- [ ] Hint tier expressions match the specification for each tier
- [ ] Animation speed decreases smoothly with sleepiness progression
- [ ] At max sleepiness, animations are 40% slower than baseline
- [ ] Sound and animation start within the same frame
- [ ] Particle effects fire on every discovery reaction

## Integration Points

- **Fires**: `ExpressionStarted`, `ExpressionEnded`
- **Listens**: `DiscoveryEvent` (from MEC-001), `HintEvent` (from MEC-001)
- **Reads**: `sleepiness`, `discoveryCount` (from MEC-001 state)
- **Writes**: Baby animation state, face rig blendshapes, active sound

## MDA Logger Integration (MEC-003)

```luau
local Log = require(path.to.MDALogger)

-- On discovery reaction (Rule 1) — reuse correlation ID from MEC-001
Log.info("M", "MEC-002", "EXPRESSION", {
    emotion = selectedEmotion, anim = animationId, sleepiness = sleepiness
}, cid)
-- Check that reaction is not identical to previous
Log.checkInvariant("DYN-001", "INV-5",
    selectedEmotion ~= previousEmotion or animationId ~= previousAnim,
    "reaction differs from previous", cid)

-- On idle expression (Rule 2)
Log.debug("M", "MEC-002", "IDLE_EXPRESSION", { emotion = idleEmotion, interval = elapsed })

-- On hint expression (Rule 3)
Log.info("M", "MEC-002", "HINT_EXPRESSION", { tier = hintTier, expression = hintExpression }, cid)

-- On sleepiness blend change (Rule 4)
Log.debug("M", "MEC-002", "SLEEPINESS_BLEND", {
    factor = blendFactor, animSpeed = currentSpeed
})
```
