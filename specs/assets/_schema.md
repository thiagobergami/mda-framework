# Asset Spec Schema

Asset specs define the **requirements for game content** — 3D models, animations, sounds, music,
textures, particles, and UI elements. They bridge the gap between the designer's aesthetic intent
and the artist's creative output, while giving AI enough context to implement code against assets
that may not exist yet.

The paper classifies assets as part of Mechanics: *"Together with the game's content (levels,
assets and so on) the mechanics support overall gameplay dynamics."* But assets also directly
serve Aesthetics — a sound effect delivers Sensation, a character model enables Fantasy. So
asset specs trace to BOTH the mechanic that uses them AND the aesthetic they serve.

## Template

```markdown
---
id: AST-{NNN}
name: {Descriptive name}
type: model | animation | sound | music | texture | particle | ui
traces_to_mechanics: [{MEC-NNN IDs that use this asset}]
traces_to_aesthetics: [{AES-NNN IDs this asset serves}]
status: concept | placeholder | draft | final
---

# {Name}

## Purpose

{Why does this asset exist? What mechanic uses it and what aesthetic does it deliver?
An asset without a purpose is bloat. Use the aesthetic vocabulary — "this sound delivers
Sensation during discovery reactions" not "this is a fun sound effect."}

## Emotional Intent

{What should the player FEEL when they see/hear this asset? This is the artistic
brief. It uses the 8 aesthetic categories but gets specific about mood, tone, and
energy level.}

- **Primary emotion**: {The dominant feeling — e.g., "warmth and safety"}
- **Energy level**: Low | Medium | High — {How intense/active the asset feels}
- **Tone**: {e.g., "playful", "mysterious", "tense", "cozy", "epic"}
- **Reference**: {Comparable assets from other games/media the artist can reference}

## Technical Requirements

{Constraints that the asset must satisfy for the game to function correctly.
These are hard limits — an asset that violates them cannot be used.}

### For Models:
- **Poly count**: {max triangles — consider mobile/Roblox performance}
- **Texture resolution**: {max pixels — e.g., 512x512, 1024x1024}
- **Rig**: {bone structure if animated — humanoid, custom, none}
- **Collision**: {does it need a collision mesh? Simple box, convex hull, precise}
- **Scale**: {size in studs — match the game's scale reference}

### For Animations:
- **Rig target**: {which model/rig this plays on}
- **Duration**: {seconds, or looping}
- **Priority**: {Roblox AnimationPriority — Idle, Movement, Action, Core}
- **Blending**: {can it blend with other animations? Which ones?}

### For Sounds:
- **Duration**: {seconds, or looping}
- **Format**: {ogg, mp3 — Roblox audio requirements}
- **Volume range**: {min-max, relative to other game sounds}
- **Spatial**: {3D positional or 2D ambient?}
- **RollOff**: {for 3D sounds — at what distance does it fade?}

### For Music:
- **Duration**: {seconds, looping behavior}
- **BPM**: {if rhythm matters}
- **Layers**: {can it be dynamically mixed? Which layers?}
- **Transitions**: {how does it crossfade with other tracks?}

### For Particles:
- **Rate**: {particles per second}
- **Lifetime**: {seconds per particle}
- **Performance budget**: {max concurrent particles}

## Variants

{Many assets have multiple states or variations. List each variant with its
trigger condition and how it differs from the base.}

| Variant | Trigger | Difference from base |
|---------|---------|---------------------|
| {name}  | {when used} | {what changes} |

## Engine Integration

{Where this asset lives in the game hierarchy and how code references it.
Engine-specific details (API calls, service references) go in binding specs
(specs/bindings/). This section covers the logical integration.}

- **Container**: {e.g., asset storage folder, prefab location}
- **Instance type**: {e.g., 3D model, sound clip, particle system}
- **Tags / markers**: {tags applied for runtime queries}
- **Attributes / properties**: {custom data set on the instance}
- **Binding**: {BIND-NNN — reference to engine-specific binding spec}

## Placeholder Protocol

{What to use as a placeholder until the final asset is ready. Placeholders must
be functional — the game must run correctly with them. They just won't look/sound
final.}

- **Placeholder description**: {What the placeholder looks/sounds like}
- **Placeholder location**: {Where to find or how to generate it}
- **Behavioral equivalence**: {What properties the placeholder MUST match for code to work}
- **Swap protocol**: {How to replace the placeholder with the final asset — which
  references need updating?}
```

## Rules

1. **Every asset traces to a mechanic AND an aesthetic** — If an asset isn't used by any mechanic, it's unused content. If it doesn't serve an aesthetic, it has no design purpose
2. **Emotional intent is required** — Artists need to know what feeling to target, and AI needs to know what experience the asset delivers. "A cute baby model" is vague; "a soft, rounded character that evokes protectiveness and warmth (Fantasy + Sensation)" is actionable
3. **Technical requirements are hard limits** — A 50k-tri model in a Roblox game targeting mobile will destroy performance. Constraints prevent this
4. **Placeholders must be behavioral equivalents** — Code written against a placeholder must work identically when the final asset is swapped in. Same hitbox, same animation names, same sound duration. Only the sensory quality changes
5. **Status tracking is mandatory** — The catalog must reflect whether each asset is concept, placeholder, draft, or final. AI implementations must handle placeholder status gracefully
6. **Naming conventions follow the catalog** — Asset instance names in Roblox must match the catalog naming convention so AI can find them programmatically

## Status Lifecycle

```
concept → placeholder → draft → final
   │          │           │        │
   │          │           │        └── Artist-approved, performance-validated
   │          │           └── Asset created but not yet approved/optimized
   │          └── Temporary stand-in, behaviorally equivalent
   └── Requirement defined, nothing created yet
```

AI can implement against any status from `placeholder` onward. At `concept` status,
the mechanic spec's Game Content section provides enough information to write code
structure, but runtime testing requires at least a placeholder.
