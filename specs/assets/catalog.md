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
| AssetName | PascalCase descriptive name | `Player`, `Enemy`, `Sword`, `BattleTheme` |
| Variant | PascalCase qualifier (optional) | `Idle`, `Attack`, `Tier1`, `Loop` |

## Roblox Hierarchy

```
game
├── ReplicatedStorage
│   └── Assets
│       ├── Characters/      -- Character models (with animations inside)
│       ├── Props/           -- Furniture, interactive objects, pickups
│       ├── Particles/       -- ParticleEmitter templates
│       └── UI/              -- ScreenGui templates
├── SoundService
│   ├── SFX/                 -- Sound effects (short, event-driven)
│   └── Music/               -- Music tracks (long, ambient/looping)
└── Workspace
    └── World/               -- Placed environment instances
```

## Registry

### Characters

| ID | Name | Spec | Mechanic | Aesthetic | Location | Status |
|----|------|------|----------|-----------|----------|--------|
| *Add rows as assets are created* | | | | | | |

### Environment

| ID | Name | Spec | Mechanic | Aesthetic | Location | Status |
|----|------|------|----------|-----------|----------|--------|
| | | | | | | |

### Audio — Sound Effects

| ID | Name | Spec | Mechanic | Aesthetic | Location | Status |
|----|------|------|----------|-----------|----------|--------|
| | | | | | | |

### Audio — Music

| ID | Name | Spec | Mechanic | Aesthetic | Location | Status |
|----|------|------|----------|-----------|----------|--------|
| | | | | | | |

### Animations

| ID | Name | Spec | Mechanic | Aesthetic | Location | Status |
|----|------|------|----------|-----------|----------|--------|
| | | | | | | |

### Particles & Effects

| ID | Name | Spec | Mechanic | Aesthetic | Location | Status |
|----|------|------|----------|-----------|----------|--------|
| | | | | | | |

### UI

| ID | Name | Spec | Mechanic | Aesthetic | Location | Status |
|----|------|------|----------|-----------|----------|--------|
| | | | | | | |

## Status Summary

| Status | Count | Meaning |
|--------|-------|---------|
| concept | 0 | Requirements defined, nothing created |
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
