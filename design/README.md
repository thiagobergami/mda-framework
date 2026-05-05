# `design/` — Iterative Design Artifacts

This directory holds **iterative, visual, and tool-related artifacts** that *consume* the
canonical M/D/A specs in `specs/`. It is intentionally separate from `specs/` so the two
can evolve at different rates and be reviewed under different rules.

## Relationship to `specs/`

| `specs/` (canonical truth)                  | `design/` (iterative artifacts)                  |
|---------------------------------------------|---------------------------------------------------|
| Behavioral contracts                        | Visual / spatial / temporal compositions          |
| M/D/A definitions, tuning ranges            | Blockouts, beat charts, flow diagrams             |
| Reviewed in PRs as source-of-truth          | May change frequently; reviewed for direction     |
| Stable IDs (AES-NNN, DYN-NNN, MEC-NNN, …)   | References specs by ID — never defines new ones   |

**Rule:** every artifact under `design/` MUST reference one or more specs by ID. It must
never introduce a new aesthetic, dynamic, mechanic, or asset primitive — those belong in
`specs/`.

## Subdirectories

```
design/
├── levels/          # Level / environment design — blockouts, beat charts, encounter maps
├── flows/           # Player journey, onboarding, progression flows
└── pipeline/        # The guided spec-authoring tool (CLI + future web UI)
    ├── cli/         # Node.js CLI wizard — `npm run spec`
    └── web/         # Web UI (deferred — see plan.md Phase 6)
```

### `levels/`

Level specs describe **spatial and temporal composition** of a single level: geometry,
pacing, encounters, sightlines, optional content. A level orchestrates mechanics, dynamics,
and aesthetics per zone — it does not define them. See `levels/_schema.md`.

### `flows/`

Flow specs describe player journeys that span multiple levels or sessions: onboarding,
progression curves, retention loops. See `flows/_schema.md` (planned).

### `pipeline/`

The guided spec-authoring tool. Walks a user from concept → aesthetics → dynamics →
mechanics → assets → tuning → levels by reading existing specs and asking the right
questions in the right order. See `../plan.md` sections 3–4.

## When to add to `specs/` vs `design/`

Ask: *would the game still work if I deleted this artifact?*

- If **no** (the artifact defines behavior, balance, or experience goals) → `specs/`.
- If **yes** (the artifact composes existing specs into a particular spatial/temporal
  arrangement, or is a tool that generates specs) → `design/`.
