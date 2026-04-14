# Examples

Reference implementations showing how to spec a game through all MDA framework layers.

## Baby Chase

A babysitting tag game based on the example from the original MDA paper (Hunicke, LeBlanc, Zubek).
Demonstrates all spec layers for a Discovery-primary game targeting ages 3-7.

```
baby-chase/
├── aesthetics/baby-chase.aes.md          # AES-001: Playful Discovery
├── dynamics/baby-chase-pursuit.dyn.md    # DYN-001: Playful Pursuit Cycle
├── mechanics/
│   ├── baby-chase-movement.mec.md        # MEC-001: Player & Baby Movement
│   └── baby-chase-expression.mec.md      # MEC-002: Baby Expression System
├── tuning/baby-chase-difficulty.tune.md  # TUN-001: Pacing & Difficulty
└── assets/
    ├── catalog.md                        # Asset registry
    ├── baby-character.asset.md           # AST-001/005: Model & Animations
    ├── house-environment.asset.md        # AST-002: Environment
    ├── baby-audio.asset.md               # AST-003/004: SFX & Music
    └── discovery-particles.asset.md      # AST-006: Particles
```

Use these as reference when writing your own specs — they show the expected level of detail
and how layers connect through traceability links.
