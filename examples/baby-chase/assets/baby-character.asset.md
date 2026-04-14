---
id: AST-001, AST-005
name: Baby Character Model & Animations
type: model, animation
traces_to_mechanics: [MEC-001, MEC-002]
traces_to_aesthetics: [AES-001]
status: concept
---

# Baby Character Model & Animations

## Purpose

The baby is the central character — the object of every Discovery moment, the source of every
Sensation payoff, and the anchor of the Fantasy aesthetic. MEC-001 controls its movement and
hiding. MEC-002 controls its emotional expressions. Every dynamic in DYN-001 revolves around
the player's relationship with this character.

This is the most important asset in the game. The paper's first-pass babysitting game says
"the majority of game logic would be devoted to maneuvering the baby into view and creating
baby-like reactions." The character model and its animations ARE the game.

## Emotional Intent

- **Primary emotion**: Warmth, protectiveness — the player should want to care for this character
- **Energy level**: Medium — bouncy and lively when awake, slowly winding down to Low
- **Tone**: Playful, innocent, slightly mischievous — a baby who WANTS to play, not one who's scared
- **Reference**: Pixar-style baby characters (Jack-Jack from The Incredibles, baby from Storks). Rounded forms, oversized head, big expressive eyes. NOT realistic — stylized and approachable

## Technical Requirements

### Model (AST-001)

- **Poly count**: Max 5,000 triangles (Roblox mobile performance target)
- **Texture resolution**: 512x512 diffuse, no normal map needed for this art style
- **Rig**: R15 Roblox humanoid rig (compatible with standard Animator)
- **Collision**: Simple box collider on HumanoidRootPart (no precise mesh collision needed)
- **Scale**: ~2.5 studs tall (smaller than player character's ~5 studs — feels baby-sized)
- **Face rig**: Minimum 6 blendshapes or bone-based expressions:
  - `Neutral` — resting face
  - `Surprise` — wide eyes, open mouth
  - `Happy` — squinting eyes, big smile
  - `Shy` — eyes averted, slight frown
  - `Sleepy` — half-closed eyes, relaxed mouth
  - `Excited` — wide eyes, wide smile, raised brows

### Animations (AST-005)

All animations target the R15 rig and are loaded through Roblox's Animator system.

| Animation Name | Duration | Priority | Loop | Description |
|---------------|----------|----------|------|-------------|
| `Anim_Baby_Idle` | 2.0s | Idle | Yes | Gentle breathing, slight sway |
| `Anim_Baby_IdlePeek` | 1.5s | Idle | No | Peeks around, suppresses giggle |
| `Anim_Baby_IdleFidget` | 1.8s | Idle | No | Fidgets in hiding spot, restless |
| `Anim_Baby_Run` | 0.8s | Movement | Yes | Playful bouncy run (not panicked) |
| `Anim_Baby_Hide` | 1.0s | Action | No | Ducks into hiding spot |
| `Anim_Baby_Surprise` | 1.5s | Action | No | Jumps, wide eyes, hands to mouth |
| `Anim_Baby_Giggle` | 1.5s | Action | No | Covers mouth, shoulders shake |
| `Anim_Baby_Laugh` | 2.0s | Action | No | Full belly laugh, arms out |
| `Anim_Baby_Shy` | 1.5s | Action | No | Turns away, peeks over shoulder |
| `Anim_Baby_Excited` | 1.5s | Action | No | Bounces in place, arms waving |
| `Anim_Baby_Sleepy` | 2.0s | Action | No | Rubs eyes, head droops |
| `Anim_Baby_Yawn` | 2.5s | Action | No | Big yawn, stretches arms |
| `Anim_Baby_SitDown` | 1.5s | Action | No | Sits down, ready to be picked up |
| `Anim_Baby_PickedUp` | 2.0s | Action | No | Curls up, eyes close — bedtime |

**Blending rules** (implemented in MEC-002 Rule 4):
- All Action animations blend with sleepiness modifier: speed scales by `1.0 - (sleepiness/threshold * 0.4)`
- Idle animations can be interrupted by Action animations
- Run animation must blend smoothly from/to Idle

## Variants

| Variant | Trigger | Difference from base |
|---------|---------|---------------------|
| Awake | sleepiness 0-2 | Full animation speed, bright eyes, high energy |
| Drowsy | sleepiness 3-4 | 80% animation speed, half-lid eyes, slower movements |
| Sleepy | sleepiness 5+ | 60% animation speed, droopy eyes, yawning between actions |

## Roblox Integration

- **Model location**: `ReplicatedStorage.Assets.Characters.Character_Baby`
- **Instance type**: Model with Humanoid (R15)
- **Animations location**: `Character_Baby.Animations` (Folder containing Animation instances)
- **CollectionService tags**: `Baby`, `NPC`, `Expressive`
- **Attributes**:
  - `Sleepiness` (NumberValue): Current sleepiness level, read by MEC-002
  - `CurrentEmotion` (StringValue): Current expression state, set by MEC-002
  - `IsHiding` (BoolValue): Whether baby is in a hiding spot, set by MEC-001

## Placeholder Protocol

- **Placeholder description**: A Roblox R15 dummy (default blocky character) scaled to 2.5 studs, colored pastel yellow. No face rig — emotions logged to Output instead of visually displayed
- **Placeholder location**: Create via `Instance.new("Model")` with standard R15 rig in a setup script
- **Behavioral equivalence**:
  - Must have HumanoidRootPart at correct scale (for movement/collision)
  - Must have Animator (for animation playback — placeholder anims can be empty)
  - Must have all Attributes listed above (code reads these)
  - Must have CollectionService tags applied (code queries these)
- **Swap protocol**: Replace the Model in `ReplicatedStorage.Assets.Characters.Character_Baby`. All code references use CollectionService tags and Attribute names, NOT hard-coded paths below the model root. Animation IDs update in a single config table.
