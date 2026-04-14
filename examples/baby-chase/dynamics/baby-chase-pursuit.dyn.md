---
id: DYN-001
name: Playful Pursuit Cycle
traces_to_aesthetics: [AES-001]
---

# Playful Pursuit Cycle

## Behavior Description

The core play loop is a repeating cycle of search → discovery → reaction → re-hide.
The baby and player engage in a playful back-and-forth that feels like peek-a-boo, not
a hunt. The baby WANTS to be found (eventually) and gives escalating hints. Each cycle
produces a moment of delightful surprise, followed by the baby running away to hide again.

## Feedback System

### Loop: Discovery Assistance (Negative Feedback)
- **Type**: Negative (dampening)
- **Cycle**: Player searches longer → Baby gives stronger hints → Player finds baby faster → Hints reset
- **Effect on experience**: Prevents frustration by ensuring the player always finds the baby within the target window (15-45s). The longer you search, the more help you get — but it never feels like the game is "giving up"

### Loop: Escalating Expressiveness (Positive Feedback)
- **Type**: Positive (amplifying)
- **Cycle**: Player finds baby → Baby reacts expressively → Player is delighted → Player searches with more enthusiasm → Next discovery is more rewarding
- **Effect on experience**: Each discovery feels slightly more rewarding than the last because the baby's reactions escalate (from shy peek → giggle → full laughing run). This builds toward the Narrative arc climax

### Loop: Sleepiness Progression (Positive Feedback)
- **Type**: Positive (amplifying, gradual)
- **Cycle**: Time passes / discoveries accumulate → Baby gets sleepier → Reactions become drowsier → Player transitions from "finding" to "caring"
- **Effect on experience**: Transforms the Discovery aesthetic into Narrative resolution. The baby's energy winding down creates a natural endpoint

### Diagram

```
    Player                          Baby
      |                              |
      |--- searches room ----------->|
      |                              |--- hides (chooses spot)
      |                              |
      |    [if search > threshold]   |
      |<--- hint (sound/movement) ---|
      |                              |     ^
      |--- moves toward hint ------->|     | Negative
      |                              |     | feedback
      |--- discovers baby! --------->|     | (assists
      |                              |     |  player)
      |<--- emotional reaction! -----|     v
      |    (surprise/giggle/run)     |
      |                              |
      |    [+1 discovery count]      |--- runs to new spot
      |    [+sleepiness]             |
      |                              |
      v                              v
    [Search again]              [Hide again]
         \                         /
          \--- after N cycles ---/
                    |
              [Baby yawns]
                    |
              [Bedtime scene]
```

## Interaction Patterns

### Pattern: Peek-a-Boo Discovery
- **Trigger**: Player moves within discovery range of baby's hiding spot
- **Sequence**:
  1. Baby peeks out briefly (0.3s visual flash)
  2. Player moves closer
  3. Baby is fully revealed with expressive animation
  4. Sound effect + particle burst
  5. Baby laughs/reacts for 1-2 seconds
  6. Baby runs to new hiding spot
- **Duration**: 3-5 seconds from peek to run
- **Outcome**: Discovery count +1, baby relocates, player satisfaction

### Pattern: Hint Escalation
- **Trigger**: Player has not found baby within hint threshold time
- **Sequence**:
  1. At 15s: Ambient sound cue from baby's direction (soft giggle)
  2. At 25s: Visual cue (object near baby wiggles slightly)
  3. At 35s: Strong cue (baby peeks out from hiding spot briefly)
  4. At 45s: Baby moves to an easier hiding spot
- **Duration**: Gradual over 15-45 second window
- **Outcome**: Player finds baby (guaranteed within ~50s maximum)

### Pattern: Bedtime Wind-Down
- **Trigger**: Discovery count reaches sleepiness threshold
- **Sequence**:
  1. Baby's run speed decreases noticeably
  2. Baby yawns during reactions
  3. Baby hides in increasingly obvious spots
  4. Baby sits down instead of running away
  5. Player "picks up" baby → bedtime cutscene
- **Duration**: Final 2-3 cycles of play
- **Outcome**: Session ends with narrative resolution

## Invariants

- **INV-1**: Baby must ALWAYS be findable within 50 seconds (hint system guarantees this)
- **INV-2**: Baby must ALWAYS react expressively when found (never a silent/static discovery)
- **INV-3**: Discovery count must monotonically increase (player never "loses" a found baby)
- **INV-4**: Sleepiness must monotonically increase (the game always progresses toward ending)
- **INV-5**: No cycle should feel identical to the previous one (baby picks different spots, different reactions)

## Degenerate Dynamics

- **Camping**: Player stands still and waits for hints instead of exploring
  - Breaks: Discovery (no exploration happening)
  - Detection: Player movement < threshold for >10 seconds
  - Prevention: Hints require player to be moving; stationary players get weaker hints

- **Speed-running**: Player memorizes hiding spots and finds baby instantly every time
  - Breaks: Discovery (no surprise if you already know where to look)
  - Detection: Discovery time consistently <5 seconds
  - Prevention: Baby has a large pool of hiding spots, weighted toward unused ones

- **Infinite loop**: Player never triggers bedtime, session has no end
  - Breaks: Narrative (no resolution)
  - Detection: Session duration exceeds max time
  - Prevention: Sleepiness threshold is fixed; game always reaches bedtime
