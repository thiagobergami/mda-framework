# `design/` — Framework-Level Design Artifacts

This directory holds **framework-level** schemas and tools related to design composition.
Real per-game design artifacts (the actual level specs, flow specs, etc.) live under
`games/<slug>/design/`, not here.

## What lives here

```
design/
├── levels/
│   ├── _schema.md            # Schema for level specs — read this when authoring a level
│   └── _example.level.md     # Reference example (validator-skipped, not a real level)
└── pipeline/
    ├── cli/                  # The spec wizard — `npm run spec`
    └── web/                  # Web UI (deferred)
```

## What does NOT live here

- **Per-game level specs** → `games/<slug>/design/levels/{name}.level.md`
- **Game concepts, aesthetics, dynamics, mechanics, tuning, assets** → `games/<slug>/specs/`
- **Framework-tool specs** (e.g., the MDA Logger) → root `specs/`

Putting a real level under the framework's `design/levels/` is a bug — the validator's level
rules will run against it but its references won't resolve to any real game's specs.

## Why levels are split (schema here, instances per-game)

The MDA paper treats levels as content under Mechanics. In practice, a level orchestrates
all three layers per zone — geometry that affords a mechanic, pacing that drives a dynamic
feedback loop, and atmosphere that targets a specific aesthetic. The **schema** for that
arrangement is shared framework foundation; the actual **levels** are per-game data.

See `games/README.md` for the full per-game directory layout, and `levels/_schema.md` for
the level schema's 11 required sections and validation rules.
