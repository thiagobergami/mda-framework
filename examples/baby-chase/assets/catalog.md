# Asset Catalog

Master registry of all game assets. Every asset in the project is listed here with its MDA
tracing, Roblox location, and current status.

**AI must check this catalog before referencing any asset in code.** If an asset is `concept`
status, write code structure but mark runtime usage as needing a placeholder. If `placeholder`
or above, the asset can be used directly.

## Naming Convention

All asset instances in Roblox follow this pattern:

```
{Category}_{AssetName}_{Variant}
```

| Segment | Format | Examples |
|---------|--------|----------|
| Category | PascalCase singular noun | `Character`, `Prop`, `Sound`, `Music`, `Anim`, `Particle`, `UI` |
| AssetName | PascalCase descriptive name | `Baby`, `KitchenTable`, `Giggle`, `LullabyTheme` |
| Variant | PascalCase qualifier (optional) | `Shy`, `Excited`, `Tier1`, `Loop` |

Examples:
- `Character_Baby` — the baby character model
- `Sound_Baby_Giggle` — baby giggle sound effect
- `Sound_Baby_Yawn` — baby yawn sound effect
- `Anim_Baby_Surprise` — baby surprise animation
- `Particle_Discovery_Stars` — star burst on discovery
- `Music_Ambient_Cozy` — background music for the house

## Roblox Hierarchy

```
game
├── ReplicatedStorage
│   └── Assets
│       ├── Characters/      -- Character models (with animations inside)
│       ├── Props/           -- Furniture, interactive objects
│       ├── Particles/       -- ParticleEmitter templates
│       └── UI/              -- ScreenGui templates
├── SoundService
│   ├── SFX/                 -- Sound effects (short, event-driven)
│   └── Music/               -- Music tracks (long, ambient/looping)
└── Workspace
    └── World/               -- Placed environment instances
        ├── Rooms/           -- Room models with HidingSpot tags
        └── Lighting/        -- Lighting rigs per room
```

## Registry

### Characters

| ID | Name | Spec | Mechanic | Aesthetic | Location | Status |
|----|------|------|----------|-----------|----------|--------|
| AST-001 | Baby Character | [baby-character.asset.md](baby-character.asset.md) | MEC-001, MEC-002 | AES-001 (Fantasy, Sensation) | ReplicatedStorage.Assets.Characters.Character_Baby | concept |

### Environment

| ID | Name | Spec | Mechanic | Aesthetic | Location | Status |
|----|------|------|----------|-----------|----------|--------|
| AST-002 | Cozy House | [house-environment.asset.md](house-environment.asset.md) | MEC-001 | AES-001 (Fantasy, Discovery) | Workspace.World.Rooms | concept |

### Audio — Sound Effects

| ID | Name | Spec | Mechanic | Aesthetic | Location | Status |
|----|------|------|----------|-----------|----------|--------|
| AST-003 | Baby Audio Library | [baby-audio.asset.md](baby-audio.asset.md) | MEC-001, MEC-002 | AES-001 (Sensation) | SoundService.SFX | concept |

### Audio — Music

| ID | Name | Spec | Mechanic | Aesthetic | Location | Status |
|----|------|------|----------|-----------|----------|--------|
| AST-004 | Ambient Music | [baby-audio.asset.md](baby-audio.asset.md) | MEC-001 | AES-001 (Sensation, Submission) | SoundService.Music | concept |

### Animations

| ID | Name | Spec | Mechanic | Aesthetic | Location | Status |
|----|------|------|----------|-----------|----------|--------|
| AST-005 | Baby Expression Anims | [baby-character.asset.md](baby-character.asset.md) | MEC-002 | AES-001 (Sensation, Fantasy) | Character_Baby.Animations | concept |

### Particles

| ID | Name | Spec | Mechanic | Aesthetic | Location | Status |
|----|------|------|----------|-----------|----------|--------|
| AST-006 | Discovery Particles | [discovery-particles.asset.md](discovery-particles.asset.md) | MEC-002 | AES-001 (Sensation) | ReplicatedStorage.Assets.Particles | concept |

## Status Summary

| Status | Count | Meaning |
|--------|-------|---------|
| concept | 6 | Requirements defined, nothing created |
| placeholder | 0 | Temporary stand-in, code-compatible |
| draft | 0 | Created but not approved/optimized |
| final | 0 | Approved, performance-validated |

## Adding Assets

1. Assign the next `AST-{NNN}` ID
2. Create an asset spec file in `specs/assets/` following `_schema.md`
3. Add a row to the appropriate category table above
4. Ensure the asset traces to at least one mechanic AND one aesthetic
5. Set initial status to `concept`
6. Update the mechanic spec's Game Content section to reference the asset by ID
