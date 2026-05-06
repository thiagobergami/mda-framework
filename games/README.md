# `games/` — User Game Directories

Each subdirectory here is **one game**. A game has its own specs, design artifacts, and
traceability — fully isolated from other games and from the framework foundation.

```
games/
├── README.md                       (this file)
├── lantern-woods/
│   ├── README.md
│   ├── specs/
│   │   ├── traceability.md         (this game's M/D/A traceability)
│   │   ├── concept/
│   │   ├── aesthetics/
│   │   ├── dynamics/
│   │   ├── mechanics/
│   │   ├── tuning/
│   │   ├── assets/
│   │   └── bindings/
│   └── design/
│       └── levels/
└── another-game/
    └── ...
```

## Why per-game isolation

The repo root's `specs/` holds the **framework foundation** (schemas, glossary, workflow,
framework-tool specs like `MEC-003 MDA Logger`). User game data — concepts, aesthetics,
mechanics, levels — would otherwise pile up in those framework directories and pollute the
framework's own traceability.

Splitting by game also means:

- IDs (`AES-001`, `MEC-001`, …) are **namespaced per game** — your `MEC-001` doesn't conflict with another game's.
- `mda validate --scope game:<name>` runs only that game's checks.
- Each game can be archived, copied, or contributed back as an example without dragging in others.

## Creating a new game

```bash
npx mda init game "My Game"
# → games/my-game/ with empty specs/{layer}/ dirs and a fresh traceability.md
```

Or use the wizard, which handles this automatically when you pick "+ Create a new game":

```bash
npm run spec
```

## Working in a game

All `mda new` calls require `--game <slug>`:

```bash
npx mda new concept "My Game" --game my-game
npx mda new aesthetic "Forest Discovery" --game my-game
npx mda new level "Tutorial Forest" --game my-game
```

Validation can target one game or run across all of them:

```bash
npx mda validate --scope game:my-game     # one game
npx mda validate                          # framework + all games + examples
```

## Framework-tool specs (the exception)

If you're contributing a spec that's part of the framework itself (not a user game) — for
example, a new logger or validator helper — scaffold with `--framework`:

```bash
npx mda new mechanic "Some Framework Tool" --framework
```

These land in the repo root's `specs/mechanics/` and must carry `scope: framework-tool` in
their frontmatter so the validator exempts them from per-game rules. This is rare; almost
all real work happens inside `games/<name>/`.
