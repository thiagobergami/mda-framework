# MDA Spec Wizard (CLI)

A guided spec-authoring wizard. Walks you through Concept → Aesthetics → Dynamics → Mechanics
→ Assets → Tuning → Levels by reading what already exists in `specs/` and asking the right
questions in the right order.

## Usage

From the repo root:

```bash
npm run spec
```

The wizard branches its top-level menu based on what's already in `specs/`. If the project
has no concept yet, only "Start a new game concept" is offered. After a concept exists,
"Add an aesthetic" appears, and so on.

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

See `../../plan.md` for the full plan.

## Architecture

```
design/pipeline/cli/
├── index.ts                # entry point, top-level menu, --dry-run
├── prompts/
│   ├── concept.ts
│   ├── aesthetic.ts
│   ├── dynamic.ts
│   ├── mechanic.ts
│   ├── asset.ts
│   ├── tuning.ts
│   └── level.ts
├── lib/
│   ├── existingSpecs.ts    # reads what's already in specs/ + design/levels/
│   ├── extractIds.ts       # parses (id, name) pairs for trace prompts
│   └── patchFrontmatter.ts # writes wizard answers into scaffolded files
├── tsconfig.json           # type-check only (run via tsx)
└── README.md
```

The wizard runs through `tsx` (no build step) so contributors can iterate without rebuilding.
