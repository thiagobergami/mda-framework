---
id: PLAN-FEAT-mda-studio
spec: design/mda-studio/spec.md
title: Implementation Plan — MDA Studio Control Plane
status: draft
owner: thiago
created: 2026-05-12
branch: feature/mda-studio
format: spec-driven-development (plan.md)
---

# Implementation Plan — MDA Studio

> Companion to `spec.md`. The spec answers *what* and *why*; this answers *how* and
> *in what order*. The architectural blueprint behind these phases lives in
> [`system.md`](../../system.md) at the repo root.
>
> Each phase has a single shippable output and exits when its acceptance check passes.

## 1. Tech context

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript 5.7+, strict | Matches `tools/` and `design/pipeline/cli/` |
| Runtime | Node 20+, `tsx` for dev, esbuild for build | Same as existing CLIs |
| Package manager | **pnpm** for `mda-studio/` workspace | Paperclip-proven for this layout; root stays npm so existing `tools/` is untouched |
| Web framework | Express 4 | Smallest viable surface; ubiquitous |
| ORM | Drizzle | Codegen + raw SQL escape hatch; matches Paperclip |
| Database | PostgreSQL (embedded via `embedded-postgres@18.1.0-beta.16` for dev; external `DATABASE_URL` for prod) | Zero-config local; prod-ready via env |
| Auth | `lucia` (sessions) + bearer keys hashed with `argon2id` | Session for board users, hashed bearer for agents |
| UI | React 18 + Vite + native History API + native `fetch` | Vanilla wins until routing/cache complexity demands more (TanStack Router/Query deferred until then) |
| UI styling | Tailwind + shadcn/ui | Fast component scaffolding; matches modern board-app pattern |
| Schemas / validation | Zod | Reused across DB ↔ HTTP ↔ UI; lives in `packages/shared` |
| CLI lib | `commander` + `@inquirer/prompts` | Same libs as `mda` CLI |
| Tests | Vitest (server + ui) + `@vitest/coverage-v8` + Playwright (e2e, opt-in) | Single test framework; Playwright separate to keep `pnpm test` cheap. Coverage is enforced per package (see §6.1) |
| Coverage threshold | **≥ 80% lines / statements / branches / functions** per package | Enforced in `vitest.config.ts` per package; `pnpm test` fails below the floor |
| Test ordering | **Test-first (TDD).** Failing tests land first; implementation makes them pass | Tests *define* every phase's exit check (see §4 Testing rules) |
| Process management | Single Node process for V1 (scheduler + watchdog in-process) | No queue infra in V1, per spec |
| Embedded PG patching | Re-use Paperclip's `embedded-postgres@18.1.0-beta.16` patch | Known-good config |

## 2. Constitution check (existing-project conventions)

Each must be true at the end. Verified up front to avoid rework.

- [ ] **C1.** All new code lands under `mda-studio/` at the repo root. Nothing in
      `tools/`, `src/`, `specs/`, or `design/` (outside this `mda-studio/` doc folder)
      is modified except via additive integration points.
- [ ] **C2.** The `mda` CLI in `tools/` keeps working unchanged. MDA Studio invokes
      it via subprocess through the `mda` adapter — it does **not** fork or
      re-implement the CLI.
- [ ] **C3.** Specs/ and design/ remain the canonical content. MDA Studio reads them,
      validates them, and orchestrates work against them — it never authors new
      aesthetic/dynamic/mechanic/asset *primitive types*. (Per spec NG-10.)
- [ ] **C4.** TypeScript strict everywhere. No `any` in committed code. All HTTP
      payloads have a Zod schema in `packages/shared`.
- [ ] **C5.** Every business table carries `studio_id` and every mutating route
      enforces the studio boundary in middleware **before** touching the DB.
- [ ] **C6.** Every mutating service writes through the single
      `services/activity-log.ts` funnel — no scattered `db.insert(activityLog)`.
- [ ] **C7.** Drizzle migrations are the only source of truth for schema. No
      runtime `CREATE TABLE`. `pnpm db:generate` is the entry point.
- [ ] **C8.** `pnpm test` stays cheap (Vitest only). Playwright e2e is opt-in via
      `pnpm test:e2e`. Per-PR CI runs Vitest; release CI runs both.
- [ ] **C9.** No new top-level binary called `mda`. The new CLI is `mda-studio`.
- [ ] **C10.** **Test-first.** Every phase opens by writing the tests that describe
      its exit check. Implementation lands only after those tests exist and fail
      for the right reason. PRs that introduce production code without a
      corresponding failing-then-passing test are blocked.
- [ ] **C11.** **≥ 80% coverage floor.** Every package shipped in V1 holds
      ≥ 80% line / statement / branch / function coverage on its own source.
      `pnpm test` fails the build below the floor. Coverage gates are configured
      per-package in `vitest.config.ts` so a single weak package can't be hidden
      by a strong one.

## 3. Project structure (target end state)

```
mda-studio/                                        ← NEW
├── pnpm-workspace.yaml
├── package.json                                   ← workspace root scripts
├── tsconfig.base.json
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                               app bootstrap
│       ├── app.ts                                 express app factory
│       ├── auth/                                  session + bearer + JWT
│       ├── middleware/                            studio-boundary, run-id, error
│       ├── routes/                                one file per resource
│       │   ├── studios.ts
│       │   ├── games.ts
│       │   ├── agents.ts
│       │   ├── issues.ts
│       │   ├── approvals.ts
│       │   ├── costs.ts
│       │   ├── routines.ts
│       │   ├── activity.ts
│       │   ├── dashboard.ts
│       │   └── mda.ts                             MDA-specific (specs, asset-plans)
│       ├── services/                              business logic
│       │   ├── activity-log.ts                    SINGLE funnel (C6)
│       │   ├── studios.ts
│       │   ├── agents.ts
│       │   ├── issues.ts
│       │   ├── checkout.ts                        atomic checkout
│       │   ├── approvals.ts
│       │   ├── budgets.ts
│       │   ├── costs.ts
│       │   ├── scheduler.ts                       per-agent heartbeat loop
│       │   ├── watchdog.ts                        stuck-run detector
│       │   ├── recovery.ts                        startup + non-terminal liveness
│       │   ├── routines.ts
│       │   └── workspaces.ts                      git worktree management
│       ├── adapters/
│       │   ├── registry.ts
│       │   ├── types.ts
│       │   └── shims/                             thin shims to packages/adapters/*
│       └── realtime/
│           └── live-events.ts                     SSE for dashboard updates
├── ui/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── lib/                                   api client, query keys
│       ├── components/                            shadcn primitives + app components
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── Studios.tsx
│       │   ├── StudioOverview.tsx
│       │   ├── Org.tsx
│       │   ├── Specs.tsx                          spec browser
│       │   ├── SpecDetail.tsx                     incl. "why this issue exists" trace
│       │   ├── Issues.tsx
│       │   ├── IssueDetail.tsx
│       │   ├── AgentDetail.tsx
│       │   ├── AssetPlans.tsx
│       │   ├── Costs.tsx
│       │   ├── Approvals.tsx
│       │   └── Activity.tsx
│       └── context/                               studio + game selector
├── packages/
│   ├── db/
│   │   ├── package.json
│   │   └── src/
│   │       ├── client.ts                          embedded + external PG
│   │       ├── migrate.ts
│   │       ├── seed.ts                            demo studio fixture
│   │       ├── schema/
│   │       │   ├── index.ts
│   │       │   ├── studios.ts
│   │       │   ├── games.ts
│   │       │   ├── agents.ts
│   │       │   ├── agent_api_keys.ts
│   │       │   ├── goals.ts
│   │       │   ├── projects.ts
│   │       │   ├── issues.ts
│   │       │   ├── issue_comments.ts
│   │       │   ├── issue_relations.ts
│   │       │   ├── issue_documents.ts
│   │       │   ├── documents.ts
│   │       │   ├── issue_work_products.ts
│   │       │   ├── approvals.ts
│   │       │   ├── issue_approvals.ts
│   │       │   ├── heartbeat_runs.ts
│   │       │   ├── heartbeat_run_events.ts
│   │       │   ├── agent_task_sessions.ts
│   │       │   ├── agent_wakeup_requests.ts
│   │       │   ├── cost_events.ts
│   │       │   ├── budget_policies.ts
│   │       │   ├── budget_incidents.ts
│   │       │   ├── routines.ts
│   │       │   ├── activity_log.ts
│   │       │   ├── workspaces.ts
│   │       │   ├── execution_workspaces.ts
│   │       │   ├── studio_secrets.ts
│   │       │   ├── studio_secret_versions.ts
│   │       │   ├── assets.ts
│   │       │   └── issue_attachments.ts
│   │       └── migrations/                        drizzle-kit output
│   ├── shared/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── api-paths.ts                       single source of truth for URLs
│   │       ├── types.ts                           HTTP types
│   │       ├── validators.ts                      Zod schemas (DB ↔ HTTP)
│   │       ├── state-machines.ts                  agent/issue/approval transitions
│   │       └── constants.ts
│   ├── adapters/
│   │   ├── process/
│   │   ├── http/
│   │   ├── mda/                                   wraps tools/ CLI non-interactively
│   │   ├── claude-local/
│   │   └── codex-local/
│   └── plugins/
│       └── sdk/                                   minimal plugin SDK for V1
├── cli/
│   ├── package.json
│   └── src/
│       ├── index.ts                               commander entry
│       └── commands/
│           ├── onboard.ts
│           ├── configure.ts
│           ├── doctor.ts
│           └── agent-local-cli.ts                 print env for manual agent runs
├── skills/
│   └── mda-studio/
│       └── SKILL.md                               agent heartbeat procedure
├── tests/
│   └── e2e/                                       Playwright (opt-in)
└── doc/
    ├── DEVELOPING.md
    ├── DATABASE.md
    └── DEPLOYMENT-MODES.md
```

Nothing in `tools/`, `src/`, `specs/`, or `design/` (besides this `design/mda-studio/`
doc folder) is touched by V1.

## 4. Phases

Phases are grouped into the **six milestones** declared in `spec.md §8`. Each phase
is independently shippable; you can pause after any one and still have a coherent
artifact. Time estimates are calendar days of focused work for one engineer.

### 4.0 Testing rules (apply to every phase below)

Per **C10** and **C11**, every phase follows the same TDD loop. The per-phase
"Deliverables" and "Exit check" lists below are written as the *behaviors to
deliver*; the **order of work** inside any phase is fixed:

1. **Write the tests first.** Translate the phase's exit check into concrete
   Vitest specs (`*.test.ts`). Tests live next to the code they cover —
   `src/foo.ts` ↔ `src/foo.test.ts`. They must compile and run, and must **fail
   for the right reason** (red bar) before any production code is written.
2. **Make them pass.** Land the minimum production code that turns the red bar
   green. Refactor under green only.
3. **Coverage gate.** Run `pnpm test --coverage` on the touched package(s) before
   merging. Coverage must be **≥ 80% on every metric** (lines, statements,
   branches, functions). The CI gate is the same threshold.
4. **No phase exits with red or skipped tests.** A test that can't run yet
   (e.g. needs a real MCP server) lives behind a `.skip` annotation with an
   explicit `TODO(phase-N):` comment and is **not** counted toward coverage —
   the underlying code path must be covered by a stub-backed unit test until
   the integration test can run.

The per-phase **Exit check** below is the *behavioral* gate. **In addition**,
every phase exit requires:

> ✅ All package tests green · ✅ Coverage ≥ 80% on every touched package ·
> ✅ No skipped tests without a `TODO(phase-N):` reference

### 4.1 Per-phase test scaffold (template)

Every phase's first commit lands a `*.test.ts` file per source file it will add,
shaped like this:

```ts
// e.g. server/src/services/checkout.test.ts (Phase 2.2)
import { describe, it, expect } from "vitest";
import { tryCheckout } from "./checkout";

describe("tryCheckout (spec FR-21..23)", () => {
  it.todo("rejects with 409 when assignee_agent_id is set to a different agent");
  it.todo("returns row count = 1 and sets started_at on first successful claim");
  it.todo("never retries — caller responsibility");
  // … one `it.todo` per behavior in the exit check
});
```

`it.todo` is the **planning step**: it makes the intent reviewable as a PR
*before* the production code exists. The next commit converts each `todo` into a
real assertion that **fails**, then the implementation commit makes them pass.

---

### Milestone V1-lite — Operator front door  *(~6 weeks — this plan's first cut)* — **SHIPPED 2026-05-28**

Sanctioned by [`../decisions/2026-05-27-v1-lite.md`](../decisions/2026-05-27-v1-lite.md).
V1-lite delivers the **operator front door with persistent state but no agent runtime**.
It is what `plan.html` weeks 2–6 ship; M1–M6 below resume after V1-lite lands.

> **Status**: shipped. Every scope bullet below landed; see
> [`../../plan.html`](../../plan.html) for the per-task ID matrix and
> [`../decisions/2026-05-27-dogfood-log.md`](../decisions/2026-05-27-dogfood-log.md)
> for the friction the build surfaced.

**Scope** (full list in the ADR):

- CLI machine-readable flags on `mda new / validate / gate / asset-plan` (`--json`,
  `--no-prompt`, `--from-json`).
- `mda-runner` service in `server/src/services/` that spawns the CLI and parses its JSON
  output; per-command helpers (`runValidate`, `runGate`, `runNew`, `runAssetPlan*`).
- Chokidar-based spec-tree watcher with debounced cache invalidation, fanned out over the
  existing SSE bus.
- "Validate" button + per-row "Run gate" in the studio chrome.
- "Register a game" form on studio home (replaces env-var bootstrap as the primary path).
- "+" CTA on tree nodes creates real specs via `mda new` from the UI.
- Drizzle-kit wired with four tables — `games`, `issues`, `cost_events`, `approvals` —
  and the embedded driver default switched to **pglite** per
  [`../decisions/2026-05-27-embedded-db.md`](../decisions/2026-05-27-embedded-db.md).
- `mda-studio onboard --demo` single command from clean clone to populated studio in
  under 60 s.
- Asset-plan generate / exec / import surfaced in the UI with NDJSON streaming via SSE.

**Out of V1-lite** (deferred to M3+): agent runtime, scheduler, watchdog, cost budgets,
`claude_local` / `codex_local` adapters, log shipper plugin, multi-engine
(see [`../decisions/2026-05-27-multi-engine.md`](../decisions/2026-05-27-multi-engine.md)).

**Exit check.** Fresh `pnpm install` → `pnpm mda-studio onboard --yes --demo` → browser
opens on a populated home in under 60 s; an operator can register a game, create a spec,
log a cost event, restart the server, and find everything intact; asset-plan
generate/exec/import can be driven from the UI on a real AST spec; `npx mda validate
--json` and `npx mda gate <layer> --json` are driveable by an external program.

---

### Milestone 1 — Studio core + auth  *(~2 weeks)*

#### Phase 1.1 — Monorepo + DB skeleton  *(2 days)*

**Goal.** Bootable workspace with embedded Postgres, one empty `studios` table, and
a `/api/health` endpoint.

**Deliverables.**
- `mda-studio/pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`
- `packages/db/` with Drizzle config, `embedded-postgres` client at
  `~/.mda-studio/instances/default/db`, single `studios` table, first migration
- `packages/shared/` with empty Zod stubs + api-paths constants
- `server/` Express app with `/api/health` + structured logging + request-ID
  middleware
- Root scripts: `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm db:generate`, `pnpm db:migrate`
- Apply Paperclip's `embedded-postgres` patch (`patches/embedded-postgres@…patch`)

**Exit check.** `pnpm dev` from a clean clone spins up PG, runs migrations, serves
`GET /api/health → {status:"ok"}`. Killing and restarting persists data.

#### Phase 1.2 — Studios + studio-boundary middleware  *(1.5 days)*

**Goal.** Full Studio CRUD with the boundary middleware **C5** demands.

**Deliverables.**
- `studios` schema fields per spec FR-1
- Routes: `GET/POST /studios`, `GET/PATCH /studios/:sid`, `POST /studios/:sid/archive`
- `middleware/studio-boundary.ts` — extracts studio context from session/bearer/JWT,
  attaches to `req.studio`; any route under `/studios/:sid/*` validates that `:sid`
  matches the caller's allowed studios
- `services/activity-log.ts` — the single funnel (C6); all writes pass through it
- Zod schemas in `packages/shared` for create/update/list responses

**Exit check.** Curl: create studio A and studio B; verify a session scoped to A
cannot `PATCH /studios/B`. Returns `403`. Activity log shows the create/update entries.

#### Phase 1.3 — Games + concept-spec ingestion  *(1.5 days)*

**Goal.** Register a Game inside a Studio that points at an existing
`specs/concept/<name>.concept.md` and snapshots its feature map.

**Deliverables.**
- `games` schema, routes per spec FR-2
- `services/concept-ingest.ts` — uses `gray-matter` to parse concept frontmatter,
  extracts `primary_aesthetic` and a `feature_map_snapshot`
- `GET /games/:gid/feature-map` and `GET /games/:gid/traceability`
- File watcher (`chokidar`) that invalidates the snapshot when the concept file's
  mtime changes (OQ-8 resolution: cache + invalidate)

**Exit check.** Register `specs/concept/virus-hunter.concept.md` as a Game; the
returned record has the parsed primary aesthetic and feature-map array. Edit the
concept file; within 5 seconds a re-fetch shows the new content.

#### Phase 1.4 — Agents + API keys + secrets  *(2 days)*

**Goal.** Agent CRUD with org-tree validation, hashed API keys, and encrypted
studio secrets.

**Deliverables.**
- `agents`, `agent_api_keys`, `studio_secrets`, `studio_secret_versions` schemas
- Routes per spec FR-5..10: list/create/get/patch agent, pause/resume/terminate,
  `POST /agents/:aid/keys` (returns plaintext exactly once)
- `services/agents.ts` — cycle detection in `reports_to`, same-studio invariant
- `services/secrets.ts` — `local_encrypted` provider using libsodium sealed boxes
  (per spec FR-72 hashed-at-rest requirement); decryption only at heartbeat
  injection time
- Permissions matrix per spec FR-32 enforced in middleware

**Exit check.** Create agent → mint key → use key to hit `GET /agents/me` → returns
the agent. Try the key against another studio → `403`. Try to create a `reports_to`
cycle → `422` with a clear error.

#### Phase 1.5 — Auth + deployment modes  *(2 days)*

**Goal.** `local_trusted` (default) and `authenticated + private` modes ship; bind
is independent.

**Deliverables.**
- `auth/` directory: `lucia` sessions for board users, bearer-key middleware for
  agents, short-lived JWT minter for local-adapter runs
- Config-file loader at `~/.mda-studio/config.yaml` controlling `mode`, `bind`,
  `publicUrl`
- Doctor checks: warn on `lan` bind without `authenticated`, fail loud on `public`
  without `authenticated + public`
- CSRF protection on session endpoints
- Rate-limit on auth + key-mint endpoints

**Exit check.** Boot with `mode=local_trusted` on loopback — no login required.
Boot with `mode=authenticated bind=lan` — login required for `GET /api/studios`;
agent bearer keys still work without login.

#### Phase 1.6 — `mda-studio onboard` CLI  *(1 day)*

**Goal.** One command goes from "clean machine" to "open browser, see your Studio."

**Deliverables.**
- `cli/src/commands/onboard.ts` — interactive flow:
  1. Detect existing config; offer to reuse or recreate
  2. Choose bind preset (loopback default, lan, tailnet, custom)
  3. Initialize embedded PG if `DATABASE_URL` unset
  4. Run migrations
  5. Start server in background (or print start command)
  6. Open browser to UI
- `--yes` flag for non-interactive default (matches Paperclip convention)
- `cli/src/commands/doctor.ts` — health checks for embedded PG, port availability,
  spec directory existence

**Exit check.** Fresh `git clone` + `cd mda-studio && pnpm install && pnpm
mda-studio onboard --yes` → browser opens at `http://localhost:3100` showing the
empty studio list and a "Create Studio" CTA. Total: <60 seconds on a warm cache.

---

### Milestone 2 — Issues + governance  *(~2 weeks)*

#### Phase 2.1 — Issues schema + lifecycle  *(2 days)*

**Goal.** Full `issues` table with all MDA-specific fields and the state-machine
guard from spec FR-15.

**Deliverables.**
- `issues` schema (full field set per spec §6.2)
- `services/issues.ts` — create/update with state-machine validation; illegal
  transitions return `409` with the legal-next-state list
- Goals + projects schemas (spec FR-11..16); issue must trace to a goal at create
  time
- MDA validation hooks: when `mda_layer + spec_id` set, verify the spec file
  exists (read-only fs check; no parsing required at this phase)
- Auto-increment `issue_number` per studio (locked counter)

**Exit check.** Create a Game, a Goal under it, and an issue with
`mda_layer=M, spec_id=MEC-001` pointing at a non-existent file → `422`. Create a
file at the expected path, retry → `201` with `identifier: "STU-1"`.

#### Phase 2.2 — Atomic checkout  *(1 day)*

**Goal.** The single-SQL-update contract from spec FR-21..24, exhaustively tested.

**Deliverables.**
- `services/checkout.ts` — single `UPDATE` with `WHERE id AND status IN (?) AND (assignee IS NULL OR = ?)`
- Route: `POST /issues/:id/checkout`, `POST /issues/:id/release`,
  `POST /issues/:id/admin/force-release` (board only, logs prior lock IDs)
- Vitest race test: 100 concurrent `checkout` calls on one issue → exactly one
  `200`, 99 × `409`
- `X-Studio-Run-Id` header recorded into activity log entry

**Exit check.** The race test passes. `409` response body contains `{ currentOwner,
currentStatus }` so the agent skill can act on it.

#### Phase 2.3 — Comments, documents, work products  *(2 days)*

**Goal.** Three first-class child entities on issues, all with author-from-token
identity binding.

**Deliverables.**
- `issue_comments`, `documents`, `document_revisions`, `issue_documents`,
  `issue_work_products` schemas
- Routes per spec FR-25..27
- Document write creates an append-only revision; PUT is idempotent on no-change
- Work-product `kind` enum: `file | screenshot | preview-url | asset-ref | external-link`
- Multipart upload route for issue attachments → `assets` table (provider
  `local_disk` for V1)
- Incremental comment fetch: `GET /issues/:id/comments?after=<commentId>&order=asc`

**Exit check.** Agent posts a comment → activity-log entry shows `author_agent_id`
matches the bearer token's agent, regardless of any `author_*` field in the
request body. Posting an attachment ≤ `attachment_max_bytes` succeeds; over the
limit returns `413`.

#### Phase 2.4 — Approvals engine  *(2 days)*

**Goal.** The approval state machine + post-decision side effects for the six V1
approval types.

**Deliverables.**
- `approvals`, `issue_approvals` schemas
- `services/approvals.ts` — type-discriminated payload validation (e.g.
  `freeze_mec_spec` requires `dynIds: string[]` non-empty); transition guard
  (`pending → approved | rejected | cancelled`); post-decision hooks
- `hire_agent` approval on `approved` → creates the agent + optional initial key
- `approve_director_strategy` → unlocks Director's drafted issues
- `freeze_mec_spec` → server writes a stable `spec_frozen_at` marker on the issue;
  downstream API blocks edits requiring `freeze_unlock_override`
- Routes: list/create/approve/reject + `decision_note`

**Exit check.** Submit `freeze_mec_spec` without `dynIds` → `422`. Submit with
`dynIds: ["DYN-002"]` → `pending`. Approve from UI → activity log shows the
post-decision side effect (e.g. `agent.hired_via_approval=<approvalId>`).

#### Phase 2.5 — Minimal board UI  *(3 days)*

**Goal.** A board operator can manage Studios, Games, Agents, Issues, Approvals
from a browser.

**Deliverables.**
- Vite + React app served by the same server in dev (`/` routes); separate static
  build for prod
- Pages: Dashboard, Studios, Studio overview, Org chart (static layout), Issues
  list/detail, Approvals, Agent detail
- shadcn/ui components + a fixed sidebar with global Studio + Game selector
- Conflict toasts on `409` from checkout
- "Why does this issue exist?" trace panel — climbs `parent_id` → `project.goal_id`
  → game primary aesthetic → studio mission

**Exit check.** A reviewer who has never used the API can: create a studio, create
a game, hire an agent, file an approval, decide it. No 500s; no silent errors.

---

### Milestone 3 — Heartbeat + adapters  *(~2 weeks)*

#### Phase 3.1 — Adapter contract + registry  *(1.5 days)*

**Goal.** The interface contract from spec §7.4 lands, plus a registry that maps
`adapter_type` to a module.

**Deliverables.**
- `packages/adapters/types.ts` — `AgentAdapter` interface + `InvocationContext`,
  `InvokeResult`, `RunStatus`, `EnvironmentCheck`, `AdapterConfigSchema`
- `server/adapters/registry.ts` — registers built-in modules by type string;
  unknown types throw at agent-create time, not invoke time
- `packages/adapters/process/` and `packages/adapters/http/` package skeletons
- `getConfigSchema()` per adapter so the UI can render a typed form

**Exit check.** Create an agent with `adapter_type=process` and a config that
validates against the process adapter's config schema → `201`. Invalid config →
`422` citing the failing schema path.

#### Phase 3.2 — `process` + `http` adapters  *(2 days)*

**Goal.** Two real adapters that exercise every part of the contract.

**Deliverables.**
- `process/` — spawn child, stream stdout/stderr to `heartbeat_run_events`,
  SIGTERM → grace → SIGKILL on cancel; timeout enforcement
- `http/` — outbound HTTP with templated payload (`{{agent.id}}`, `{{run.id}}`),
  callback endpoint that completes the run on POST from the agent
- Both: `testEnvironment` returning a list of pass/fail checks
- Adapter env-var injection per spec FR-42

**Exit check.** Manual smoke: a `process` agent runs `echo hello > /tmp/out.txt &&
exit 0`; the run finishes with `status=succeeded`. Cancel a long-running echo loop
→ run finishes `status=cancelled` within `graceSec`.

#### Phase 3.3 — Scheduler + watchdog  *(2 days)*

**Goal.** Per-agent heartbeat firing with the rules from spec FR-36..38.

**Deliverables.**
- `services/scheduler.ts` — single in-process loop driven by `setInterval`;
  per-agent next-fire timestamp; skip rules (paused/budget/active/blocked-only-queue)
- `services/watchdog.ts` — periodic scan over `heartbeat_runs.started_at`;
  cancel runs idle longer than `runTimeoutSec` and record a watchdog decision
- `heartbeat_runs`, `heartbeat_run_events`, `agent_wakeup_requests` schemas
- `POST /agents/:aid/heartbeat/invoke` (manual wake) writes to wakeup queue

**Exit check.** Create an agent with `intervalSec=30`; observe two consecutive
fires 30s apart. Pause the agent → next fire is skipped. Hit the agent's hard
budget → fires are skipped + `budget_incident` written.

#### Phase 3.4 — Agent session state + scoped wakes  *(1.5 days)*

**Goal.** Heartbeats resume context; wake reasons + payloads land at the agent.

**Deliverables.**
- `agent_task_sessions` schema; adapters with a `sessionCodec` round-trip state
- `agent_wakeup_requests` with `wake_reason` enum per spec FR-41
- Scoped wake payload (`MDA_STUDIO_WAKE_PAYLOAD_JSON`) for assignment / comment /
  approval / mention / blocker-resolved triggers
- Recovery service phase 1: startup scan for orphaned `in_progress` issues;
  open recovery-origin issues with clear `next_action` text (spec FR-54)

**Exit check.** Wake an agent twice on the same issue with `claude_local` (stubbed
in this phase); the second wake's adapter context contains the prior session ID.
Kill server mid-run → restart → a recovery issue surfaces in the dashboard.

#### Phase 3.5 — Agent-facing API + heartbeat skill  *(2 days)*

**Goal.** The contract from spec §11 — what agents call.

**Deliverables.**
- `GET /agents/me`, `GET /agents/me/inbox-lite`, `GET /issues/:id/heartbeat-context`
  (compact: state + ancestor summaries + cursor)
- `skills/mda-studio/SKILL.md` — the heartbeat procedure (port of Paperclip's
  paperclip skill, adapted to MDA Studio env vars + the scoped-fast-path)
- `X-Studio-Run-Id` header validation on every agent mutation
- Mention extraction in comments (`@agent-id`) → wakeup with `wake_reason=mention`

**Exit check.** A `process` adapter that runs `claude` headlessly with the new
`SKILL.md` mounted can: identify itself, fetch inbox, checkout, comment, release.
Tracked end-to-end in activity log.

---

### Milestone 4 — Cost + budget  *(~1 week)*

#### Phase 4.1 — Cost ingestion + rollups  *(2 days)*

**Goal.** Agents report; rollups serve dashboards.

**Deliverables.**
- `cost_events` schema + indexes
- `POST /studios/:sid/cost-events` with validators per spec FR-45
- Read-time rollup queries: `GET /studios/:sid/costs/{summary,by-agent,by-game}`
- Cost attribution upstream via `billing_code` (spec FR-50)

**Exit check.** Ingest 1000 cost events across 5 agents; rollup latency under
250 ms p95 on a warm cache (acceptance against the 250 ms target in `system.md
§15.4`).

#### Phase 4.2 — Budget policies + hard-stop  *(2 days)*

**Goal.** Soft alerts + hard auto-pause.

**Deliverables.**
- `budget_policies`, `budget_incidents` schemas
- Threshold evaluator runs on every cost-event ingest (cheap; per-studio agent set
  is small)
- Hard-stop side effects (spec FR-48): pause agent, block new checkout/invocation,
  emit activity event, write incident row linking trigger cost event
- Soft-warn surfaces on dashboard but does not block

**Exit check.** Set a $1 monthly budget on an agent; ingest a $1.01 cost event →
agent transitions `running → paused`, dashboard shows incident with link to the
$1.01 event. Resume agent via UI → scheduler resumes firing.

#### Phase 4.3 — Cost dashboard UI  *(1 day)*

**Goal.** Operators can see spend at every layer.

**Deliverables.**
- Costs page with stacked charts (`recharts`) by day × agent
- Budget setting forms (studio / agent levels)
- Incidents panel with click-through to the activity entry

**Exit check.** Visually verify the rollup totals match `SELECT SUM` from the DB.

---

### Milestone 5 — `mda` adapter + MDA routes  *(~2 weeks)*

#### Phase 5.1 — `mda` adapter (the killer integration)  *(2 days)*

**Goal.** Drive the existing `tools/` CLI from heartbeats, non-interactively.

**Deliverables.**
- `packages/adapters/mda/` package
- Subprocess wrappers for `mda new`, `mda validate`, `mda asset-plan
  generate|exec|import`
- **Non-interactive flags** must exist on the `tools/` side. **Coordinate with
  C2:** if they don't already exist, this phase ships `--no-prompt`, `--from-json
  <file>`, and `--json` output to the `mda` CLI in a small additive PR; *not* a
  rewrite. This is a coordinated cross-tree change explicitly permitted because
  the spec.md requires it (FR-35) and it's additive.
- Structured progress events written to `heartbeat_run_events` per CLI step
- Adapter `configSchema` exposes mode (`new | validate | asset-plan`) and per-mode
  args

**Exit check.** A `mda` adapter agent invoked with `mode=validate` runs the
validator across the repo and reports per-rule warnings as `heartbeat_run_events`
that the UI displays as a structured list.

#### Phase 5.2 — MDA-specific routes  *(1.5 days)*

**Goal.** First-class endpoints for spec authoring and asset-plan ops, on top of
the `mda` adapter.

**Deliverables.**
- `POST /games/:gid/specs/new`, `POST /games/:gid/specs/validate`
- `GET /games/:gid/specs` (listing across the `specs/` tree)
- `GET /games/:gid/specs/:specId` (parsed content + traceability chain)
- `POST /games/:gid/asset-plans/:assetId/{generate,exec,import}` — proxies to the
  `mda` adapter for the configured Asset Lead agent
- Each writes `activity_log` with `entity_type=mda_spec | mda_asset_plan | mda_validation`

**Exit check.** From the UI: create a new MEC spec via the API → file appears in
`specs/mechanics/` → `mda validate` route reports green.

#### Phase 5.3 — `mda validate` routine + dedup  *(1.5 days)*

**Goal.** The integrity validator is always-on.

**Deliverables.**
- `routines` schema (spec §5.11) with cron + webhook + manual triggers
- Built-in `mda-validate` routine template; one instance per Game on first run
- Webhook endpoint for `git push` (GitHub Actions integration doc)
- Recovery-issue dedup keyed by `(game_id, rule_id, spec_id)` (spec FR-62)
- Resolution: re-run that finds the warning cleared closes the recovery issue
  automatically

**Exit check.** AC-8 from spec: synthetic warning → exactly one recovery issue;
re-fire → no duplicate; fix the underlying spec → re-fire closes the issue.

#### Phase 5.4 — Asset-plan executor as a tracked issue  *(1.5 days)*

**Goal.** The existing `mda asset-plan exec` lifecycle becomes a long-running issue
with milestone-keyed comments + work-products.

**Deliverables.**
- One issue per asset (`mda_layer=AST`) auto-created when an AST spec gets
  `tool: <real-tool>` frontmatter
- `agent_task_sessions` carries milestone executor state across heartbeats
- Each milestone transition writes a comment + work-product (spec FR-63)
- Wizard hand-off reassigns to `assignee_user_id` (spec FR-64); heartbeat stops
  until the human acts

**Exit check.** Run a 6-milestone Blender plan through the Asset Lead agent;
each milestone produces a tracked comment + work-product; rejecting M3 in the UI
re-runs from M3 and leaves M1/M2 work-products intact.

#### Phase 5.5 — Spec browser + trace panel UI  *(2 days)*

**Goal.** Operators can browse the MDA stack from the UI.

**Deliverables.**
- Specs page: tree view across A/D/M/AST/TUNE/LEVEL with status badges
- Spec detail page: parsed body + traceability chain + linked issues + recent
  activity
- "Why this issue exists" panel polish — full ancestor walk with spec links
- Issues page gets a "by MDA layer" view in addition to status kanban

**Exit check.** Click any spec → see every issue it traces from/to. Click any
issue → trace panel resolves all the way up to the studio mission with clickable
spec IDs.

---

### Milestone 6 — `claude_local` adapter + polish  *(~2 weeks)*

#### Phase 6.1 — `claude_local` adapter  *(3 days)*

**Goal.** Real local Claude Code sessions with resume.

**Deliverables.**
- `packages/adapters/claude-local/` package; spawns `claude` CLI (or `claude-code`)
  in headless mode with the MDA Studio skill mounted via `--skills-dir`
- Session ID persisted to `agent_task_sessions`; next wake passes `--resume <id>`
- Skills sync (`syncSkills`) installs `skills/mda-studio/SKILL.md` into the agent's
  runtime skill directory
- Quota / rate-limit detection from CLI exit codes; mapped to graceful retries
  with backoff
- Model list (`models`) returns the current Opus/Sonnet/Haiku family

**Exit check.** AC-3 + AC-4: hire a Game Director on `claude_local`; it produces
a strategy proposal as a document on its first issue; on subsequent heartbeats it
resumes the same session rather than cold-starting.

#### Phase 6.2 — MDALogger shipper plugin  *(2 days)*

**Goal.** Roblox playtest logs feed the audit timeline.

**Deliverables.**
- `packages/plugins/sdk/` — minimum plugin SDK: `definePlugin`, host services
  (issue create, comment, work-product), capability declarations
- Example plugin `mda-logger-shipper`: tails a log file (configurable path),
  parses the `[A:AES-XXX] [LEVEL] [EVENT_TYPE]` format, materializes `[FAIL]`
  events as recovery-origin issues, correlates `cid=N` chains into issue threads,
  writes `[SUMMARY]` as work-products (spec FR-65)
- Plugin lifecycle UI: install/configure/uninstall under
  `/studios/:sid/plugins`

**Exit check.** Drop a sample `mda.log` with one `[FAIL]` event; within 5s a
recovery issue appears on the Dynamics Analyst's queue with the failing
`DYN-XXX` cited and a link back to the raw log line.

#### Phase 6.3 — Routines UI + webhook triggers  *(1.5 days)*

**Goal.** Operators can create, edit, and watch routines fire from the UI.

**Deliverables.**
- Routines page: list, detail, fire-history
- Cron expression input with human-readable preview
- Webhook URL generation + HMAC verification
- Manual-fire button for testing

**Exit check.** Create a cron routine with `*/5 * * * *`; observe firings every
5 minutes in the history view. Hit the webhook with a valid HMAC → routine fires.

#### Phase 6.4 — Hardening + e2e tests  *(2 days)*

**Goal.** The release-gate checklist from spec §9 passes.

**Deliverables.**
- Playwright e2e suite (`tests/e2e/`) covering AC-1..14 — one spec per criterion
- Vitest integration tests for: atomic checkout race, hard-budget stop, agent
  pause/resume, crash recovery
- Load smoke: 10 agents × 100 issues × 1k cost events; dashboard stays under
  250 ms p95
- Security pass: secret redaction in logs, CSRF on session endpoints, rate-limit
  on `/auth/*` and `/agents/:id/keys`

**Exit check.** `pnpm test:e2e` green from a fresh `pnpm install`. Manual run of
the AC checklist on the demo studio.

#### Phase 6.5 — Demo studio template + docs  *(2 days)*

**Goal.** First-run experience is "magical" — under 5 minutes to a running studio.

**Deliverables.**
- Seed: a "Demo Studio" with one Game pointed at the framework's own
  `virus-hunter.concept.md`, one Game Director (`process` adapter using
  `echo` as a no-op for the dry run), one Mechanics Engineer (`mda` adapter)
- `mda-studio onboard --demo` flag that opts into the seed
- `doc/DEVELOPING.md`, `doc/DATABASE.md`, `doc/DEPLOYMENT-MODES.md` (ported from
  Paperclip with MDA terminology)
- `mda-studio/README.md` at the workspace root pointing at the docs

**Exit check.** Clean clone → `pnpm install` → `pnpm mda-studio onboard --yes
--demo` → browser opens at populated dashboard within 5 minutes. New operator
who hasn't read this plan can name the next action.

---

## 5. Sequencing & critical path

```
V1-lite (operator front door, ~6 weeks)
  │
  ▼
M1 ──► M2 ──► M3 ──► M4 ──► M5 ──► M6
                              │
        Phase 5.1 (mda adapter) ◄── coordinated additive
                              │     change to tools/ CLI
                              │     (--json, --no-prompt) — landed during
                              │     V1-lite week 2
                              │
        Phase 6.1 (claude_local) — only true blocker for AC-3, AC-4
```

V1-lite ships first and stands alone; M1 picks up against a CLI that already speaks
`--json` and a server that already has the `mda-runner`, spec watcher, and four core
tables. The original M1–M6 timeline assumes those exist.

- **Critical path:** straight M1 → M6 (≈ 10–11 weeks).
- **Parallelizable:** Phase 2.5 (UI) can start during 2.1–2.4 with mock data;
  Phase 4.3 (cost UI) can overlap with 4.1–4.2; Phase 5.5 (spec browser) can
  start during 5.2–5.4.
- **Coordinated change:** Phase 5.1 adds `--no-prompt`, `--from-json`, `--json`
  to the existing `tools/` CLI. Permitted by C2 because it's additive and required
  by spec FR-35. Ship the CLI flags first (small, reviewable PR), then the adapter.
- **Demo studio (Phase 6.5)** is the last gate — if any AC fails on it, the
  release is held.

## 6. Test strategy

Tests are not an afterthought — per **C10** they are the first artifact of every
phase. This section is the toolbox.

### 6.1 Coverage tooling and thresholds

Coverage is enforced per package via Vitest's V8 provider:

```ts
// vitest.config.ts (per package)
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      thresholds: {
        lines: 80, statements: 80, branches: 80, functions: 80,
      },
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/__fixtures__/**",
        "src/**/index.ts",      // pure re-exports
        "src/**/types.ts",      // type-only declarations
        "src/migrations/**",    // generated by drizzle-kit
        "src/**/*.gen.ts",      // any generated code
      ],
    },
  },
});
```

| Package | Floor | Notes |
|---|---|---|
| `packages/db` | 80% | Excludes generated migrations; covers schema validators + client wrappers |
| `packages/shared` | 80% | Zod schemas + state machines |
| `packages/adapters/*` | 80% per adapter | Each adapter is self-contained |
| `server` | 80% | Routes + services + middleware; per-file gate so a weak service can't hide |
| `ui` | 80% | Components + pages; Testing Library |
| `cli` | 80% | Onboard / doctor / configure |

`pnpm test` runs the per-package gate. CI fails on the first sub-80% number.

### 6.2 Test layers

| Layer | What | How |
|---|---|---|
| Schema | Drizzle migration round-trip | `pnpm db:generate` + `pnpm db:migrate` clean run |
| Service | State-machine guards, boundary checks, atomic checkout | Vitest, in-memory PG via `pglite` |
| Routes | Per-route happy / 4xx / 5xx | Vitest + supertest |
| Adapters | `process`/`http` lifecycle | Vitest with adapter stubs |
| Recovery | Orphaned-run scan, dedup, liveness contract | Vitest, fixture DB states |
| Approval engine | Type-discriminated payloads, post-decision hooks | Vitest, exhaustive over all six types |
| UI | Component smoke, page-level happy path | Vitest + Testing Library |
| E2E | Spec AC-1..14 | Playwright (opt-in `pnpm test:e2e`) |
| Load | Dashboard p95, atomic-checkout race | Manual script in `tests/load/` |
| Security | Secret redaction, CSRF, rate-limit | Vitest + targeted Playwright |

`pnpm test` runs Vitest only (per C8). Playwright is gated behind `pnpm test:e2e`
and runs in release-CI, not per-PR CI.

### 6.3 What does *not* count toward the 80% floor

To keep the threshold honest:

- **Generated code** (Drizzle migrations, OpenAPI types) is excluded from the
  denominator.
- **Type-only files** (no runtime statements) are excluded.
- **`it.todo` and `it.skip`** entries contribute *zero* coverage. If a code path
  exists only because a real test is skipped, it must be backed by a stub-driven
  unit test that *does* run, or the code shouldn't be there yet.
- **UI visual polish** (animations, colors, layout) is exempt — the coverage gate
  on `ui` covers behavior (`onClick`, data fetching, conditional rendering), not
  appearance.

### 6.4 What we do when 80% genuinely costs more than it's worth

A phase can lower its per-file threshold below 80% **only** with an explicit
override comment citing the reason. Example: an adapter shim that's 90% I/O
glue to an external process. The override must:

1. Drop the floor only on the specific file, not the whole package.
2. Leave a `// coverage-floor: 60% — reason: external-process IO glue` comment.
3. Be called out in the PR description.

Total overrides in V1 are budgeted at **≤ 5 files**. If we're hitting 5, the
design is wrong, not the floor.

## 7. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **R1.** Embedded Postgres flakiness on Windows / WSL | High | High | Pin Paperclip's patched version (`patches/embedded-postgres@18.1.0-beta.16.patch`). If still flaky, allow opt-out via `DATABASE_URL=postgres://...localhost`. Document Docker fallback. |
| **R2.** TS monorepo build complexity (cross-package types, watch mode) | Medium | Medium | Use `tsc --build` references + pnpm workspaces, not raw `tsx`. Build server depends on `packages/*` builds. Start with one shared `tsconfig.base.json`. |
| **R3.** Claude Code CLI session API drift across versions | High | High | Pin a known-good `claude` version in `cli/doctor.ts`; fail with a useful message on mismatch. Treat session resume as best-effort — fall back to cold-start with the issue context if `--resume` fails. |
| **R4.** Single-process scheduler can't handle >100 active agents | Low | Medium | Out of V1 scope — 1k issues / 50 agents is the target. If hit before V1, shard scheduler by `agent_id % N` with N=1 default. |
| **R5.** Studio-boundary leak via a missed middleware | Medium | Critical | Centralize boundary check in one middleware (C5). Add a fuzz test that creates studio A + B, then hits every mutating route with mismatched IDs; expects `403` on every one. |
| **R6.** Time estimate way off — 10 weeks becomes 20 | High | Medium | Each phase is independently shippable; pause after any milestone leaves a coherent product. Cut Phase 6.2 (MDALogger shipper) and Phase 6.3 (Routines UI) first if pressed. |
| **R7.** UI ambition creep (graphs, real-time, animations) | Medium | Medium | Spec FR-73..77 lists the **only** required UI behaviors. Anything not in that list is post-V1. |
| **R8.** Coordinated `tools/` CLI changes (Phase 5.1) break existing solo flow | Low | High | All CLI flag additions are strictly additive (`--no-prompt`, `--from-json`, `--json`). Existing interactive flow unchanged. Smoke `mda new mechanic test` after the PR. |
| **R9.** Plugin system half-shipped — SDK exists but no plugin ships in core | Medium | Low | Phase 6.2 ships `mda-logger-shipper` as the reference plugin. If it slips, mark plugins as "experimental" in V1 docs and defer to V1.1. |
| **R10.** `lucia` auth library deprecation / replacement noise | Low | Medium | Wrap session writes in `services/auth/sessions.ts`. Swap library at the wrap. |
| **R11.** TDD friction on inherently stateful surfaces (atomic checkout, scheduler loop, embedded PG, MCP/Claude CLI integrations) | Medium | Medium | Layer the tests: unit tests against an in-memory `pglite` for the SQL behavior, integration tests against a real embedded PG, manual smoke against the real Claude CLI behind `BLENDER_MCP=1` / `CLAUDE_LIVE=1` env gates. The unit + integration layers cover the 80% floor; the manual gate covers reality. |
| **R12.** Coverage gaming — devs write trivial tests just to clear the gate | Medium | Low | Code review reads tests *first*. PR template requires "behaviors covered" bullet list. Mutation-test spot-checks (`stryker-mutator`) on the highest-leverage modules (`checkout.ts`, `approvals.ts`, `studio-boundary.ts`) — not gating, but published in CI for visibility. |

## 8. Open questions resolved during planning

- **Which package manager at the `mda-studio/` workspace root?** **pnpm**. Adds
  no dependency on the root `package.json`; cleaner for the multi-package layout.
  Document in `doc/DEVELOPING.md`.
- **Where does the Studio DB live?** `~/.mda-studio/instances/default/db` —
  outside the repo. Repo stays a clean spec/code artifact (resolves spec OQ-2).
- **Do we need a separate task-queue process?** No (resolves spec implicit
  question). Single-Node-process scheduler is fine for V1; revisit only if R4 fires.
- **One concept spec → one game, or many?** One-to-one for V1. The concept spec's
  ID is the Game's natural key. Revisit only if portfolios become real.
- **Should `mda` CLI gain flags in this plan, or as a separate PR?** **Separate
  PR**, landed first, then Phase 5.1 depends on it. Keeps the change reviewable.
- **How does the agent-side skill get into the agent's runtime?** `claude_local`
  uses `--skills-dir` on the CLI; `process` adapters bake-mount via the user's
  adapter config; HTTP adapters get the skill text in the wake payload.
- **Plugin trust model in V1?** Trusted-local only — no sandboxing. Per the
  Paperclip plugin-spec caveat: V1 plugins run as same-origin JS in the host.

## 9. Out of plan (deferred to spec §11 / future work)

Everything in spec §11 stays out: public template marketplace, multi-board RBAC,
cloud/sandbox agents, first-class artifacts subsystem, agent memory/knowledge,
enforced outcomes, maximizer mode, full realtime push, desktop app, plugin
marketplace. Each is its own plan.

Also explicitly out, as scope-control:

- Hot plugin reload (post-V1)
- Plugin DB namespace migrations (post-V1)
- Org chart drag-and-drop editor (post-V1)
- Workflow-state customization per game (post-V1)
- Mobile-responsive UI polish (V1.1)

## 10. Acceptance: when is this feature "done"?

V1 is complete when **all spec acceptance criteria AC-1 through AC-14 pass** on
a fresh clone after running through phases M1.1 through M6.5. Specifically:

- **AC-1, AC-2** ⇐ Phase 1.6
- **AC-3, AC-4** ⇐ Phase 6.1 (the only milestone gated on `claude_local`)
- **AC-5** ⇐ Phase 2.2 (race-tested earlier; surfaced in UI in 2.5)
- **AC-6** ⇐ Phase 4.2
- **AC-7** ⇐ Phase 2.4
- **AC-8** ⇐ Phase 5.3
- **AC-9** ⇐ Phase 3.4 (recovery service phase 1) + Phase 6.4 hardening
- **AC-10** ⇐ Phase 5.1 + 5.4
- **AC-11** ⇐ Phase 5.5
- **AC-12** ⇐ Phase 1.2 (single-funnel activity log) + every later phase honors it
- **AC-13** ⇐ Phase 1.5 + 6.4
- **AC-14** ⇐ Phase 4.1 + 4.3

The release is held until the Phase 6.5 demo studio passes the AC checklist
end-to-end on a clean machine — no manual setup beyond `pnpm install && pnpm
mda-studio onboard --yes --demo`.
