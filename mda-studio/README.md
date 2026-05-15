# MDA Studio

The operator surface for the MDA Spec Framework. A pnpm workspace that exposes a small HTTP API
and a Postgres-backed data model for managing studios — the long-running workspaces in which
specs, asset plans, and runs accumulate.

The CLI in the repo root (`npx mda …`) authors and validates specs as files. The studio is
the *running service* that owns persistent state across those sessions: studio identity, issue
counters, pause state, and budget tracking.

## Status

The spec-tree-first operator UI ships through Phase U8 of
[`design/mda-studio/spec-tree-ui/plan.md`](../design/mda-studio/spec-tree-ui/plan.md).
**For day-to-day operator usage, read [`docs/operator-guide.md`](docs/operator-guide.md).**

Working today:

| Surface                              | Path                                                |
|--------------------------------------|-----------------------------------------------------|
| Spec tree home                       | `GET /api/games/:id/spec-tree`                      |
| Node drawer detail                   | `GET /api/games/:id/spec-tree/node/:specId`         |
| Force tree-cache rebuild             | `POST /api/games/:id/spec-tree/refresh`             |
| Issues (status state machine)        | `GET /api/issues/:id` · `PATCH /api/issues/:id`     |
| Cost-event ingestion                 | `POST /api/studios/:id/cost-events`                 |
| Chrome Costs detail (subtree-scoped) | `GET /api/games/:id/costs[?subtree=]`               |
| Org chart roster                     | `GET /api/games/:id/agents`                         |
| Asset-plan executor states           | `GET /api/games/:id/asset-plans`                    |
| Validator runs                       | `POST /api/games/:id/validator/runs` · `GET …/warnings` |
| Approvals queue                      | `GET /api/studios/:id/approvals` · `PATCH /api/approvals/:id` |
| Activity log                         | `GET /api/studios/:id/activity[?gameId=&since=&limit=]` |
| SSE live updates                     | `GET /api/studios/:id/events`                       |
| Health                               | `GET /api/health`                                   |

Persistence is in-memory today; the Drizzle tables that will back each
store (`spec_frontmatter_cache`, `issues`, `cost_events`, `validator_runs`,
`approvals`, `activity_log`) are scheduled once drizzle-kit wiring lands.

## Prerequisites

- Node.js >= 20
- pnpm 9.x (the workspace pins `pnpm@9.11.0` via `packageManager`)
- Postgres 14+ if you want external DB mode (optional — see [Database modes](#database-modes))

```bash
corepack enable          # if pnpm isn't on PATH yet
corepack prepare pnpm@9.11.0 --activate
```

## Install

From this directory (`mda-studio/`):

```bash
pnpm install
```

Installs all three workspace packages (`@mda-studio/shared`, `@mda-studio/db`,
`@mda-studio/server`) and links the `workspace:*` dependencies.

## Run the server

```bash
pnpm dev                 # tsx watch — restarts on save
```

Default bind: `127.0.0.1:3100`. Override with environment:

| Variable      | Default       | Effect                                                  |
|---------------|---------------|---------------------------------------------------------|
| `PORT`        | `3100`        | TCP port the Express app listens on                     |
| `HOST`        | `127.0.0.1`   | Bind address — set to `0.0.0.0` to expose on the LAN    |

Verify it's up:

```bash
curl http://127.0.0.1:3100/api/health
# {"status":"ok"}
```

Every request gets an `X-Request-Id` header (echoed back from the client if provided, otherwise
generated). Logs are JSON, one line per event, written to stdout.

## Database modes

`@mda-studio/db` resolves its connection from the environment via `resolveDatabaseConfig`:

- **External mode** — set `DATABASE_URL` to a Postgres URL (must include a scheme, e.g.
  `postgres://user:pass@host:5432/mda`). The studio talks to that database directly.
- **Embedded mode** — leave `DATABASE_URL` unset. The studio expects a data directory at
  `~/.mda-studio/instances/{instance}/db`, where `{instance}` is `$MDA_STUDIO_INSTANCE` or
  `default`. Useful for local dev when you don't want to run Postgres yourself.

| Variable               | Default     | Effect                                                |
|------------------------|-------------|-------------------------------------------------------|
| `DATABASE_URL`         | *(unset)*   | If set, switches to external mode                     |
| `MDA_STUDIO_INSTANCE`  | `default`   | Picks which embedded instance directory to use        |

The driver factory is injected at the call site (`createClient`), so the choice of pg client
(`pg`, `postgres.js`, `pglite`, etc.) is application code, not library code.

### Schema

A single `studios` table is defined today (`packages/db/src/schema/studios.ts`):

| Column                  | Type        | Notes                                          |
|-------------------------|-------------|------------------------------------------------|
| `id`                    | `uuid`      | Primary key, defaults to `gen_random_uuid()`   |
| `name`                  | `text`      |                                                |
| `description`           | `text?`     |                                                |
| `status`                | `text`      | Defaults to `active`                           |
| `pause_reason`          | `text?`     |                                                |
| `paused_at`             | `timestamptz?` |                                             |
| `issue_prefix`          | `text`      |                                                |
| `issue_counter`         | `integer`   | Defaults to `0`                                |
| `budget_monthly_cents`  | `integer`   | Defaults to `0`                                |
| `spent_monthly_cents`   | `integer`   | Defaults to `0`                                |
| `created_at`            | `timestamptz` | Defaults to `now()`                          |
| `updated_at`            | `timestamptz` | Defaults to `now()`                          |

Migration plumbing is stubbed:

```bash
pnpm db:generate         # currently prints a notice — drizzle-kit wiring lands next
pnpm db:migrate          # same
```

## Workspace scripts

Run from `mda-studio/` unless noted.

| Script                    | What it does                                                |
|---------------------------|-------------------------------------------------------------|
| `pnpm dev`                | Run the server with hot reload (tsx watch)                  |
| `pnpm build`              | `tsc -b` across all packages                                |
| `pnpm typecheck`          | `tsc --noEmit` across all packages                          |
| `pnpm test`               | Vitest in run mode with v8 coverage, all packages           |
| `pnpm test:run`           | Vitest run, no coverage                                     |
| `pnpm test:coverage`      | Vitest with coverage                                        |
| `pnpm db:generate`        | Placeholder for drizzle-kit generate                        |
| `pnpm db:migrate`         | Placeholder for drizzle-kit migrate                         |

Per-package: `pnpm --filter @mda-studio/server test`, etc.

## Layout

```
mda-studio/
├── package.json                          # workspace root, scripts, pnpm pin
├── pnpm-workspace.yaml                   # globs: server, ui, cli, packages/*, …
├── tsconfig.base.json                    # shared TS compiler options
├── packages/
│   ├── shared/                           # @mda-studio/shared
│   │   └── src/
│   │       ├── constants.ts              # DEFAULT_PORT, heartbeat limits
│   │       └── api-paths.ts              # apiPath(), healthPath()
│   └── db/                               # @mda-studio/db
│       └── src/
│           ├── config.ts                 # resolveDatabaseConfig (external | embedded)
│           ├── client.ts                 # createClient(config, factory)
│           └── schema/studios.ts         # drizzle pgTable for `studios`
└── server/                               # @mda-studio/server
    └── src/
        ├── index.ts                      # entrypoint — listens on PORT/HOST
        ├── app.ts                        # Express app, mounts /api/health
        ├── logger.ts                     # JSON logger with debug/info/warn/error
        └── middleware/request-id.ts      # X-Request-Id assignment
```

The workspace globs in `pnpm-workspace.yaml` reserve room for `ui/`, `cli/`,
`packages/adapters/*`, and `packages/plugins/*` — none of those packages exist yet.

## Tests

Every package ships a vitest config and tests next to the source:

```bash
pnpm test                # all packages, with coverage
pnpm --filter @mda-studio/db test
pnpm --filter @mda-studio/server test
```

Coverage is collected via `@vitest/coverage-v8` and written to `<package>/coverage/`.

## Further reading

- [`docs/operator-guide.md`](docs/operator-guide.md) — day-to-day usage
  guide for operators: surfaces, lenses, command palette, deep links,
  troubleshooting
- [`docs/architecture.md`](docs/architecture.md) — developer-facing
  architecture: wire contracts, request lifecycle, state model, algorithms,
  extension points
- [`ui/README.md`](ui/README.md) — UI build / test commands and a
  phase-by-phase implementation log (U1 → U8)
- [`../design/mda-studio/plan.md`](../design/mda-studio/plan.md) — the
  parent implementation plan for the studio
- [`../design/mda-studio/spec-tree-ui/plan.md`](../design/mda-studio/spec-tree-ui/plan.md)
  — the UI architecture spec; the source of truth for any decision
  question about the operator surface
- [`../system.md`](../system.md) — the broader system architecture
  blueprint (DB, agents, adapters, costs, governance)

## How it relates to the spec framework

The repo root holds the spec authoring side of the framework — `specs/`, `design/`, the
`mda` CLI, the Luau runtime logger. The studio under `mda-studio/` is meant to run alongside
those, owning the operational data that doesn't belong in version-controlled markdown:

- Which studios exist and their pause/budget state
- Issue counters used to mint spec IDs
- Long-running asset-plan execution state (future)
- Run telemetry surfaced back to the spec gates (future)

Specs remain the source of truth for game design. The studio is the system of record for the
*work* of authoring and executing against those specs.
