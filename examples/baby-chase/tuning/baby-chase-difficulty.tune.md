---
id: TUN-001
name: Baby Chase — Pacing & Difficulty
traces_to_mechanics: [MEC-001, MEC-002]
traces_to_dynamics: [DYN-001]
traces_to_aesthetics: [AES-001]
---

# Baby Chase — Pacing & Difficulty

## Tuning Goal

The play session should feel like a gentle bedtime ritual, not a game to be optimized.
Discovery moments should come at a comfortable pace — frequent enough to sustain engagement,
spaced enough to build anticipation. The session should end naturally with the baby falling
asleep, feeling like a story that concluded rather than a game that stopped.

Target experience (from AES-001): Discovery as primary aesthetic, for ages 3-7.

## Parameters

### Player Walk Speed
- **Mechanic**: MEC-001, Rule 1
- **Current value**: 12 studs/s
- **Range**: [8, 18]
- **Step**: 1
- **Affects dynamic**: Search phase duration — faster = shorter search, less anticipation
- **Affects aesthetic**: Too fast breaks cozy pacing; too slow creates frustration
- **Sensitivity**: Medium — noticeable but not game-breaking

### Baby Run Speed
- **Mechanic**: MEC-001, Rule 3
- **Current value**: 20 studs/s
- **Range**: [14, 28]
- **Step**: 2
- **Affects dynamic**: Baby must reach hiding spot before player catches up visually
- **Affects aesthetic**: Too fast feels panicked (breaks Fantasy); too slow feels broken
- **Sensitivity**: Medium

### Hint Tier Timings
- **Mechanic**: MEC-001, Rule 4
- **Current value**: [15, 25, 35, 45] seconds
- **Range**: Tier 1 [10, 25], Tier 2 [18, 35], Tier 3 [25, 45], Tier 4 [35, 55]
- **Step**: 5s per tier
- **Affects dynamic**: Discovery Assistance negative feedback loop timing
- **Affects aesthetic**: Too early = no Discovery buildup; Too late = frustration (anti-pattern)
- **Sensitivity**: High — this is the primary pacing lever

### Discovery Range
- **Mechanic**: MEC-001, Rule 5
- **Current value**: 8 studs
- **Range**: [5, 15]
- **Step**: 1
- **Affects dynamic**: How close the player must get before discovery triggers
- **Affects aesthetic**: Too large = accidental discoveries (no Discovery moment); Too small = pixel-hunting frustration
- **Sensitivity**: High

### Sleepiness Threshold
- **Mechanic**: MEC-001, Rule 6
- **Current value**: 6 discoveries
- **Range**: [4, 10]
- **Step**: 1
- **Affects dynamic**: Session length — directly controls how many pursuit cycles occur
- **Affects aesthetic**: Too few = abrupt ending (no Narrative arc); Too many = overstays welcome (Submission without intent)
- **Sensitivity**: High — determines total session length

### Reaction Duration
- **Mechanic**: MEC-002, Rule 1
- **Current value**: 1.5s
- **Range**: [0.8, 3.0]
- **Step**: 0.2
- **Affects dynamic**: Pause between discovery and next search cycle
- **Affects aesthetic**: Too short = no time to enjoy the moment; Too long = momentum dies
- **Sensitivity**: Medium

### Idle Animation Interval
- **Mechanic**: MEC-002, Rule 2
- **Current value**: 4s
- **Range**: [2, 8]
- **Step**: 1
- **Affects dynamic**: How "alive" the baby feels while hiding
- **Affects aesthetic**: Too frequent = distracting; Too infrequent = baby feels static/dead
- **Sensitivity**: Low

### Max Sleepiness Slowdown
- **Mechanic**: MEC-002, Rule 4
- **Current value**: 0.4 (40%)
- **Range**: [0.2, 0.6]
- **Step**: 0.05
- **Affects dynamic**: How noticeably drowsy the baby becomes
- **Affects aesthetic**: Too subtle = no narrative wind-down cue; Too extreme = baby feels broken
- **Sensitivity**: Medium

## Target Metrics

| Metric | Target | Tolerance | Source |
|--------|--------|-----------|--------|
| Median discovery time | 25s | ± 10s | AES-001: Discovery rate proxy |
| Max discovery time | 50s | hard cap | DYN-001: INV-1 |
| Session duration | 3-5 minutes | ± 1 min | AES-001: Session completion proxy |
| Completion rate | >80% | — | AES-001: Session completion proxy |
| Unique spots per session | ≥ 5 distinct | — | DYN-001: INV-5 |

## Tuning Constraints

- Hint tier timings must be strictly ascending: Tier1 < Tier2 < Tier3 < Tier4
- Tier 4 time must be < 55s (hard cap from INV-1 with margin for relocation)
- Baby run speed must be > player walk speed * 1.3 (baby must outrun player to reach hiding spot)
- Sleepiness threshold * median discovery time ≈ target session duration (these parameters are coupled)
- Difficulty progression array length must equal sleepiness threshold

## Known Trade-offs

- **Hint timing vs Discovery quality**: Shorter hint timers prevent frustration but reduce the joy of self-directed discovery. Current bias: slightly longer timers, trusting the audience to explore
- **Session length vs Narrative satisfaction**: More cycles give a richer arc but risk losing young attention spans. Current bias: shorter sessions (6 cycles ≈ 3 min)
- **Discovery range vs Exploration reward**: Larger range means easier finds but less precise exploration. Current bias: moderate range (8 studs) — easy enough for young children, precise enough to feel intentional

## Iteration Log

### Iteration 0 — Initial Values
- **Changed**: All parameters set to initial values
- **Reason**: Starting point based on aesthetic analysis and target audience (ages 3-7)
- **Observed**: Not yet tested
- **Decision**: Baseline for first playtest
