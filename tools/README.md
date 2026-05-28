# `mda` CLI

Spec-authoring and validation CLI for the MDA framework. Invoked via `npx mda`
from the repository root, or through the `npm run spec` / `npm run asset-plan`
wrappers.

The CLI is the **authoring** front door (solo, terminal-based). The
**operating** front door is `mda-studio/`, which drives this CLI as a
subprocess via the `mda-runner` service in `mda-studio/server/`.

## How it runs

There is **no build step**. The `bin` field in `tools/package.json` points at
`tools/bin/mda.cjs`, a tiny shim that runs `src/cli.ts` through
[`tsx`](https://tsx.is/). One entry point — `npx mda`, `npm run spec`, and
`npm run asset-plan` all dispatch through the same shim.

If you previously ran `tsc` to populate `tools/dist/`, that directory is no
longer needed; delete it. `npm run typecheck` (alias for `tsc --noEmit`) is
still available for type-only validation. `npm test` runs the scaffold suite
through `tsx --test`.

## Commands

| Command                                    | Purpose                                              |
|--------------------------------------------|------------------------------------------------------|
| `mda validate`                             | Run all rules across every scope                     |
| `mda gate <layer>`                         | Run a quality gate for one M/D/A layer               |
| `mda new <layer> <name>`                   | Scaffold a new spec file                             |
| `mda asset-plan generate <asset-id>`       | Produce a milestone plan for an asset                |
| `mda asset-plan exec <asset-id>`           | Walk a plan's milestones, persisting state           |
| `mda asset-plan import <asset-id>`         | Land an executed plan's artefact into the engine     |
| `mda asset-plan list`                      | List every asset and its plan status                 |

## Machine-readable output

Every command that runs in CI or under the studio supports `--json`. The
`mda-runner` service relies on the contracts below — keep them stable. Other
output (chalk-formatted text, progress chatter) is suppressed when `--json`
is set, so the **last non-empty stdout line is always parseable JSON**.

### `mda validate --json`

One compact JSON object per scope (NDJSON when more than one). For a
single-scope workspace there is exactly one line.

```json
{ "scope": "specs", "passed": true, "diagnostics": [ /* ... */ ] }
```

| Field         | Type                  | Notes                                       |
|---------------|-----------------------|---------------------------------------------|
| `scope`       | string                | `"specs"` for the canonical tree            |
| `passed`      | boolean               | False if any diagnostic has level `error`   |
| `diagnostics` | `Diagnostic[]`        | All rule violations, including warnings     |

Each `Diagnostic`:

```json
{ "level": "warn", "rule": "no-orphans", "specId": "TUN-001",
  "file": "specs/tuning/round-and-actions.tune.md",
  "message": "TUN-001 is never referenced by any other spec" }
```

`mda validate` exits 0 if every scope passed, 1 otherwise.

### `mda gate <layer> --json`

One compact JSON array — the gate may run for multiple subjects (e.g.
`gate aesthetic` runs once per AES spec) so the output is always an array.

```json
[
  { "gate": "concept:GAME-001", "passed": true, "overridden": false,
    "overrideReason": null,
    "checks": [ { "name": "vision-clarity", "passed": true,
                  "message": "Vision section is present and substantive" } ] }
]
```

| Field            | Type     | Notes                                                |
|------------------|----------|------------------------------------------------------|
| `gate`           | string   | `"<layer>:<spec-id>"`                                |
| `passed`         | boolean  | True only if every check in the gate passed         |
| `overridden`     | boolean  | True if `--override <reason>` was supplied          |
| `overrideReason` | string?  | Free-text reason given on the CLI                   |
| `checks`         | `Check[]`| Per-rule outcomes                                   |

`mda gate` exits 0 by default. With `--strict`, exits 1 if any gate failed.

### `mda new <layer> <name> [--from-json <path>] [--json] [--no-prompt]`

Scaffolds one spec file under the appropriate `specs/<layer>/` directory and
appends a row to `specs/traceability.md`.

- `--from-json <path>` — Loads a JSON object whose keys are frontmatter
  fields to set on the new spec. Values overwrite the template placeholders
  except for `id`, which is always assigned by the scaffolder. Example:
  ```json
  { "traces_to_aesthetics": ["AES-001", "AES-002"] }
  ```
- `--no-prompt` — Currently advisory; `mda new` is already non-interactive.
  Reserved so callers can declare they cannot answer prompts.
- `--json` — Suppresses all non-JSON output. Emits a single compact line
  to stdout describing the result:
  ```json
  { "ok": true, "id": "DYN-001",
    "file": "specs/dynamics/foo.dyn.md", "layer": "dynamic", "name": "Foo" }
  ```
  On failure, exits 1 and emits:
  ```json
  { "ok": false, "error": "Unknown layer: bogus. Valid layers: ..." }
  ```

### `mda asset-plan {generate,exec,import} --json`

NDJSON event stream. One compact JSON object per line; each represents a
single milestone transition or terminal event. Documented in
[`design/asset-plans/spec.md`](../design/asset-plans/spec.md); subset
relevant to the studio:

```
{"event":"milestone-start","milestone":"M1","ts":"2026-05-27T12:00:00Z"}
{"event":"milestone-complete","milestone":"M1","ts":"2026-05-27T12:01:00Z"}
{"event":"plan-saved","path":"design/asset-plans/AST-001/AST-001.v1.plan.md"}
```
