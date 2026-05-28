# MDA Studio

**Front door — hybrid.** The MDA Framework has two equally-valid entry points. The `mda`
CLI (`npx mda`, `npm run spec`) is the **authoring** path: solo developers writing concept →
aesthetic → dynamic → mechanic → tuning → asset → level at the keyboard. **MDA Studio**
(`mda-studio/`) is the **operating** path: a team-facing service that holds the state the
CLI can't — registered games, issues, costs, approvals, and (later) agent runs. Authoring
solo? Use the CLI. Coordinating with others, or driving long-running work? Use the studio.
See [`../design/decisions/2026-05-27-front-door.md`](../design/decisions/2026-05-27-front-door.md)
for the full rationale.

---

This package is the operator surface for the MDA Spec Framework — a pnpm workspace that
exposes an HTTP API, a SPA, and a CLI. The two front doors share one engine: the studio
drives the `mda` CLI as a subprocess (via the `mda-runner` service) and parses its JSON
output — it never re-implements validators, gates, or scaffolding.

## What works today

| Surface                              | Path                                                            |
|--------------------------------------|-----------------------------------------------------------------|
| **Register a game from the UI**      | `POST /api/games` · `GET /api/games` · `DELETE /api/games/:id` |
| **Validate via the runner**          | `POST /api/games/:id/validator/runs` (drives `mda validate --json`) |
| **Scaffold specs via the runner**    | `POST /api/games/:id/specs` (drives `mda new --json`)           |
| Spec tree home                       | `GET /api/games/:id/spec-tree`                                  |
| Node drawer detail                   | `GET /api/games/:id/spec-tree/node/:specId`                     |
| Force tree-cache rebuild             | `POST /api/games/:id/spec-tree/refresh`                         |
| Issues (status state machine)        | `GET /api/issues/:id` · `PATCH /api/issues/:id`                 |
| Cost-event ingestion                 | `POST /api/studios/:id/cost-events`                             |
| Chrome Costs detail (subtree-scoped) | `GET /api/games/:id/costs[?subtree=]`                           |
| Observed assignees roster            | `GET /api/games/:id/agents`                                     |
| Asset-plan executor states           | `GET /api/games/:id/asset-plans`                                |
| **Asset-plan generate/exec/import**  | `POST /api/games/:id/asset-plans/:assetId/{generate,exec,import}` |
| Approvals queue                      | `GET /api/studios/:id/approvals` · `PATCH /api/approvals/:id`   |
| Activity log                         | `GET /api/studios/:id/activity[?gameId=&since=&limit=]`         |
| SSE live updates                     | `GET /api/studios/:id/events`                                   |
| Health                               | `GET /api/health`                                               |

**Persistence**: switchable via `MDA_STUDIO_PERSISTENCE`. `memory` (default) keeps tests
fast; `db` writes through to the embedded pglite (or external Postgres, see
[Database modes](#database-modes)). On startup, the server calls `rehydrateAll()` to
repopulate the in-process shadow Maps from whichever store is active.

**Liveness**: every registered game gets a chokidar `spec-watcher` that publishes
`node-changed` events on the SSE bus whenever a file under `specs/**/*.md` or
`design/levels/**/*.md` changes. The UI re-renders the spec tree without F5.

**No env-var dance for onboarding**: the home screen has a **Register a game** form. The
legacy `MDA_STUDIO_GAME_*` env-var bootstrap still works for CI scripts but moved to the
appendix of the operator guide.

For day-to-day operator usage, read [`docs/operator-guide.md`](docs/operator-guide.md).

## Prerequisites

- Node.js ≥ 20
- pnpm 9.x (the workspace pins `pnpm@9.11.0` via `packageManager`)
- Postgres 14+ only if you want external DB mode (optional — see [Database modes](#database-modes))

```bash
corepack enable          # if pnpm isn't on PATH yet
corepack prepare pnpm@9.11.0 --activate
```

## Install

From this directory (`mda-studio/`):

```bash
pnpm install
```

Installs all five workspace packages (`@mda-studio/shared`, `@mda-studio/db`,
`@mda-studio/server`, `@mda-studio/ui`, `@mda-studio/cli`) and links the `workspace:*`
dependencies.

## First-run housekeeping

```bash
pnpm mda-studio onboard --yes
```

What it does:

1. Resolves the embedded instance directory (`~/.mda-studio/instances/{instance}`) and
   creates it if missing.
2. Opens a pglite database under the instance and runs a smoke query.
3. Prints the next-step commands.

Flags: `--yes` skips prompts (CI-friendly); `--demo` echoes the env hint to seed fixture
data. The CLI is intentionally short — it doesn't fork the dev servers itself so the
operator stays in control of which terminals run what.

## Run the server + UI

```bash
# terminal 1 — API at 127.0.0.1:3100
pnpm --filter @mda-studio/server dev

# terminal 2 — UI at 127.0.0.1:3101 (proxies /api → 3100)
pnpm --filter @mda-studio/ui dev
```

Default API bind: `127.0.0.1:3100`. Override with environment:

| Variable      | Default       | Effect                                                  |
|---------------|---------------|---------------------------------------------------------|
| `PORT`        | `3100`        | TCP port the Express app listens on                     |
| `HOST`        | `127.0.0.1`   | Bind address — set to `0.0.0.0` to expose on the LAN    |

Verify the API is up:

```bash
curl http://127.0.0.1:3100/api/health
# {"status":"ok"}
```

Every request gets an `X-Request-Id` header (echoed back from the client if provided,
otherwise generated). Logs are JSON, one line per event, written to stdout.

## Database modes

`@mda-studio/db` resolves its connection from the environment via `resolveDatabaseConfig`:

- **External Postgres** — set `DATABASE_URL` to a Postgres URL (must include a scheme, e.g.
  `postgres://user:pass@host:5432/mda`). The studio talks to that database directly.
- **Embedded pglite** (default) — leave `DATABASE_URL` unset. The studio opens an in-process
  Postgres-on-Wasm database at `~/.mda-studio/instances/{instance}/db`, where `{instance}`
  is `$MDA_STUDIO_INSTANCE` or `default`. No native compilation; works on WSL/Windows/macOS
  identically.
- **embedded-postgres** (opt-in, advanced) — `MDA_STUDIO_DB_DRIVER=embedded-postgres` is
  reserved for native-Postgres fans. Not yet wired; it throws a descriptive error today
  so the code path stays visible.

| Variable                  | Default     | Effect                                                |
|---------------------------|-------------|-------------------------------------------------------|
| `DATABASE_URL`            | *(unset)*   | If set, switches to external mode                     |
| `MDA_STUDIO_INSTANCE`     | `default`   | Picks which embedded instance directory to use        |
| `MDA_STUDIO_DB_DRIVER`    | `pglite`    | `pglite` or `embedded-postgres` (latter is opt-in)    |
| `MDA_STUDIO_PERSISTENCE`  | `memory`    | `memory` or `db`. `db` writes-through to the resolved driver |
| `MDA_STUDIO_DEMO`         | *(unset)*   | `1` to seed demo issues/costs/approvals on boot       |

See `design/decisions/2026-05-27-embedded-db.md` for the embedded-driver decision.

### Schema

Five tables today (`packages/db/src/schema/`):

| Table         | What it holds                                                              |
|---------------|----------------------------------------------------------------------------|
| `studios`     | Studio identity + issue counter. Pause/budget columns removed in V1-lite. |
| `games`       | One row per registered workspace (gameId, workspaceRoot, conceptPath, …)  |
| `issues`      | Subset of system.md §6.2 — status, priority, assignee handle              |
| `cost_events` | Per-event cost rows, indexed by `game_id` and (optional) `billing_code`   |
| `approvals`   | Approval queue with `kind`, `payloadJson`, status state machine           |

Each child table cascades on `game_id` so removing a game cleanly removes its operational
state. Migrations are generated from the schema:

```bash
pnpm --filter @mda-studio/db db:generate    # drizzle-kit generate
pnpm --filter @mda-studio/db db:migrate     # apply
```

The contract tests in `server/src/services/stores/stores.contract.test.ts` run every store
behavior against both the memory and DB impls.

## Workspace scripts

Run from `mda-studio/` unless noted.

| Script                    | What it does                                                |
|---------------------------|-------------------------------------------------------------|
| `pnpm mda-studio onboard` | First-run housekeeping (creates pglite instance, smoke query) |
| `pnpm dev`                | Run the server with hot reload (tsx watch)                  |
| `pnpm build`              | `tsc -b` across all packages                                |
| `pnpm typecheck`          | `tsc --noEmit` across all packages                          |
| `pnpm test`               | Vitest in run mode with v8 coverage, all packages           |
| `pnpm test:run`           | Vitest run, no coverage                                     |
| `pnpm test:coverage`      | Vitest with coverage                                        |

Per-package: `pnpm --filter @mda-studio/server test`, etc. The `db:generate` and
`db:migrate` scripts live on the `db` package only.

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
│   │       ├── api-paths.ts              # apiPath(), healthPath()
│   │       └── schemas/mda-cli.ts        # zod for `mda <cmd> --json` outputs
│   └── db/                               # @mda-studio/db
│       ├── drizzle.config.ts             # drizzle-kit config
│       ├── drizzle/                      # generated migrations
│       └── src/
│           ├── config.ts                 # resolveDatabaseConfig (external | pglite | embedded-postgres)
│           ├── client.ts                 # createClient — returns Drizzle over pglite or pg
│           └── schema/                   # studios, games, issues, cost-events, approvals
├── server/                               # @mda-studio/server
│   └── src/
│       ├── index.ts                      # entrypoint — listens on PORT/HOST, rehydrates stores
│       ├── app.ts                        # Express app factory, mounts all routes
│       ├── logger.ts                     # JSON logger with debug/info/warn/error
│       ├── middleware/request-id.ts      # X-Request-Id assignment
│       ├── routes/                       # one file per resource (games, specs, validator-runs, …)
│       └── services/
│           ├── mda-runner.ts             # subprocess driver for `mda <cmd> --json`
│           ├── spec-watcher.ts           # per-game chokidar watcher (SSE node-changed)
│           ├── games-registry.ts         # legacy facade — shadow + async write to store
│           ├── issues-store.ts           # legacy facade
│           ├── cost-events-store.ts      # legacy facade
│           ├── approvals-store.ts        # legacy facade
│           └── stores/                   # interfaces + memory + db impls + factory
├── ui/                                   # @mda-studio/ui — React 18 + Vite SPA
└── cli/                                  # @mda-studio/cli — `mda-studio onboard`
    ├── bin/mda-studio.cjs                # tsx shim (mirrors tools/bin/mda.cjs)
    └── src/cli.ts
```

The workspace globs in `pnpm-workspace.yaml` reserve room for `packages/adapters/*` and
`packages/plugins/*` — those packages don't exist yet but will host the agent adapter
interface (M3) and integration plugins (M6).

## Tests

Every package ships a vitest config and tests next to the source:

```bash
pnpm test                            # all packages, with coverage
pnpm --filter @mda-studio/db test
pnpm --filter @mda-studio/server test
```

Coverage is collected via `@vitest/coverage-v8` and written to `<package>/coverage/`.

Two fs-event integration tests in `server/src/services/spec-watcher.test.ts` are
**skipped by default**. They rely on chokidar firing within seconds, which doesn't hold
on the 9P-backed temp filesystem under WSL2+vitest. Enable them on a host with native
inotify by setting `VITEST_FS_WATCHER_INTEGRATION=1`.

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
  parent implementation plan for the studio (V1-lite cut shipped; M1–M6 follow)
- [`../design/mda-studio/spec-tree-ui/plan.md`](../design/mda-studio/spec-tree-ui/plan.md)
  — the UI architecture spec; the source of truth for any decision
  question about the operator surface
- [`../system.md`](../system.md) — the broader system architecture
  blueprint (DB, agents, adapters, costs, governance)
- [`../tools/README.md`](../tools/README.md) — the machine-readable JSON contracts
  the studio's `mda-runner` depends on

## How it relates to the spec framework

The repo root holds the spec authoring side of the framework — `specs/`, `design/`, the
`mda` CLI, the Luau runtime logger. The studio under `mda-studio/` runs alongside those,
owning the operational data that doesn't belong in version-controlled markdown:

- Which games are registered and where their workspaces live
- Issue counters and the issues themselves
- Cost events and their per-game/per-spec rollups
- Approvals waiting on a human
- Activity timeline mixing user actions and (future) agent events
- Long-running asset-plan execution state (now driveable from the UI)
- Run telemetry surfaced back to the spec gates (future, M3+)

Specs remain the source of truth for game design. The studio is the system of record for the
*work* of authoring and executing against those specs.
