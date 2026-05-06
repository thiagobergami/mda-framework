# MDA Spec Wizard (CLI)

A guided spec-authoring wizard, scoped to one game per session. Asks "which game?" up front,
then walks you through Concept → Aesthetics → Dynamics → Mechanics → Assets → Tuning → Levels
for that game by reading what already exists in `games/<game>/specs/` and branching its menu
accordingly.

## Usage

From the repo root:

```bash
npm run spec
```

First prompt: pick an existing game from `games/` or create a new one (which runs
`mda init game` for you). After that, the top-level menu reflects the chosen game's state —
if it has no concept yet, only "Start a new game concept" is offered; once a concept exists,
"Add an aesthetic" appears, and so on. Use the "Switch to a different game" menu item to
re-target without exiting.

## What it does (vs. `mda new`)

The `mda new <layer> <name>` CLI scaffolds an empty template. The wizard adds two things on top:

1. **Branched menus** that reflect the current state of `specs/` — you don't have to remember
   which layer comes next.
2. **Frontmatter pre-fill** — the wizard asks for high-level fields (primary aesthetic,
   platform, etc.) and patches them into the scaffolded file so you start with the body, not
   the metadata.

The wizard shells out to `mda new` for the actual file creation. Any change to `mda new`'s
templates flows through automatically.

## Status

- Phase 3 (MVP): concept + aesthetic prompts. ✓
- Phase 4 (full flow): dynamic, mechanic, asset, tuning, level prompts. Traceability
  auto-update via `mda new`. `--dry-run` flag. ✓
- Phase 6 (deferred): web UI with traceability graph view.

## Flags

- `--dry-run` — show what `mda` invocations would happen without scaffolding files.
- `--dir PATH` — run against an alternate project root (default: cwd).
- `--game NAME` — skip the "which game?" prompt and operate on this game directly.

See `../../plan.md` for the full plan.

## Architecture

```
design/pipeline/cli/
├── index.ts                # entry point, "which game?" prompt, top-level menu, --dry-run
├── prompts/
│   ├── concept.ts
│   ├── aesthetic.ts
│   ├── dynamic.ts
│   ├── mechanic.ts
│   ├── asset.ts
│   ├── tuning.ts
│   └── level.ts            # all prompts take (root, game, runMda)
├── lib/
│   ├── games.ts            # lists games/<slug>/ and runs `mda init game`
│   ├── existingSpecs.ts    # reads one game's specs/ + design/levels/
│   ├── extractIds.ts       # parses (id, name) pairs for trace prompts (per-game)
│   └── patchFrontmatter.ts # writes wizard answers into scaffolded files
├── tsconfig.json           # type-check only (run via tsx)
└── README.md
```

The wizard runs through `tsx` (no build step) so contributors can iterate without rebuilding.
