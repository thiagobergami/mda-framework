---
id: FEAT-mda-studio
title: MDA Studio — Control Plane for an AI Game Studio
status: draft
owner: thiago
created: 2026-05-12
branch: feature/mda-studio
format: spec-driven-development (spec.md)
companion: ../../system.md
---

# MDA Studio

## 1. Overview

The MDA framework today is a **solo-author pipeline**: one designer + AI walks the Concept → AES → DYN → MEC → AST → TUNE → LEVEL ladder, with the `mda` CLI as the only orchestrator. It works for a single hand. It does not work for *a studio of AI agents working in parallel against a shared game vision*.

MDA Studio adds a **control plane** that hires AI agents, gives them roles in an org tree, assigns them MDA work items, runs them on heartbeats, tracks their costs, gates governed actions behind board approval, and writes an auditable trail of every mutation. It does **not** run AI itself — agents run wherever they run (Claude Code, Codex, a bash script) and phone home through adapters.

The full architectural blueprint — including the rationale, the Paperclip → MDA-Studio concept translation, the complete data model, REST surface, state machines, and 6-milestone delivery plan — lives in **[`system.md`](../../system.md)** at the repo root. This spec.md is the **requirements contract**: the testable FRs, ACs, and user stories that say "you have shipped V1."

**Design boundary.** MDA Studio is a peer to `tools/` and `src/`, not a replacement. The `mda` CLI keeps working for solo and CI flows. The framework's specs/ and design/ trees remain the canonical content; MDA Studio is the orchestrator that operates on them.

## 2. Goals

1. **G1.** Run many AI agents in parallel against one game, each owning a slice of the MDA stack, without double-work or lost state across restarts.
2. **G2.** Trace every unit of work to a goal that traces to the game's primary aesthetic — no work exists "in vacuo."
3. **G3.** Give the human operator a board-level dashboard: who's working on what, how much it costs, what needs approval, and what broke.
4. **G4.** Enforce control-plane invariants atomically: single-assignee work items, conflict-safe checkout, budget hard-stops, governed actions behind approvals.
5. **G5.** Integrate the existing `mda` CLI (`new`, `validate`, `asset-plan generate|exec|import`) as a first-class adapter so agents can drive the pipeline non-interactively.
6. **G6.** Surface the existing `MDALogger` runtime stream into the same audit timeline as control-plane events — one timeline, two log sources.
7. **G7.** Local-first with zero-config DB; cloud-ready when the operator opts in.

## 3. Non-Goals

- **NG-1.** *Not* an agent framework. MDA Studio orchestrates agents; it doesn't tell you how to build one.
- **NG-2.** *Not* a chatbot. Communication is tasks + comments, not free-form chat.
- **NG-3.** *Not* a level editor. Roblox Studio remains the level editor.
- **NG-4.** *Not* a replacement for the `mda` CLI — MDA Studio invokes it through an adapter.
- **NG-5.** *Not* a public studio template marketplace in V1 (deferred to post-V1).
- **NG-6.** *Not* multi-board governance in V1 — one human operator per install.
- **NG-7.** *Not* fine-grained enterprise RBAC in V1.
- **NG-8.** *Not* a memory / knowledge subsystem beyond the activity log in V1.
- **NG-9.** *Not* responsible for hosting cloud/sandbox agents (e2b, Cursor cloud) in V1.
- **NG-10.** *Not* introducing new aesthetic, dynamic, mechanic, or asset primitives. MDA Studio is design-layer infrastructure; it consumes specs/, it never authors new primitive *types*.

## 4. User Stories

### US-1 — First-run onboarding
> As a new operator, I run `mda-studio onboard` once. It creates an embedded Postgres under `~/.mda-studio/`, boots the server at `http://localhost:3100`, opens the board UI, and asks me to create my first Studio. Five minutes later I have a Studio, a Game pointed at `specs/concept/virus-hunter.concept.md`, and a Game Director agent drafting top-level goals.

### US-2 — Hire a Mechanics Engineer
> As a board operator, I open the Game Director's strategy proposal, approve it, and the Director files a `hire_agent` approval for a Mechanics Engineer. I approve the hire from the UI; the agent is created with a `claude_local` adapter pointed at `specs/mechanics/`. On the next heartbeat it picks up `MEC-001` and starts authoring.

### US-3 — Parallel spec authoring without collisions
> As a board operator, two engineers are assigned `MEC-002` and `MEC-003` simultaneously. They check out their own issues atomically. When a third agent tries to grab `MEC-002` mid-flight, it gets a `409 Conflict` and immediately moves on — no retry, no double-edit.

### US-4 — Budget hard-stop
> As a board operator, my Tuner agent runs a long parameter-sweep that hits its monthly token budget. The agent auto-pauses, the dashboard surfaces a budget incident, and no new heartbeats fire for that agent until I raise the budget or resume it explicitly.

### US-5 — Spec freeze approval
> As a board operator, the Mechanics Engineer wants to mark `MEC-007` as implementation-ready. It files a `freeze_mec_spec` approval citing the dynamic invariants it traces to. I review the spec diff, the linked AES, and the validator report, then approve. The spec is locked; downstream Asset Lead can now schedule work against it.

### US-6 — `mda validate` as a routine
> As a board operator, I configure a routine that fires `mda validate` on every git push and nightly. Each warning becomes a `recovery`-origin issue assigned to the spec's owning agent. Stale warnings are deduplicated by spec ID across runs.

### US-7 — Asset-plan executor across heartbeats
> As a board operator, the Asset Lead checks out `AST-007`. The first heartbeat runs `mda asset-plan generate`, the second runs milestone M1 of the executor, the third runs M2. Executor state persists via `agent_task_sessions`; the agent does not cold-start each wake.

### US-8 — Runtime failure becomes an issue
> As a board operator, during a Roblox playtest the runtime `MDALogger` emits `[FAIL] INVARIANT DYN-002`. The log-shipper plugin materializes this as a recovery issue on the Dynamics Analyst's queue. The activity timeline shows the runtime event next to the resulting issue checkout — A → D → M debugging at the board level.

### US-9 — Why does this issue exist?
> As a board operator, I open `MEC-001`. The detail panel walks the trace upward: `MEC-001 → fulfills DYN-003 invariant → serves AES-001 (Fellowship) → primary aesthetic of virus-hunter → the studio mission`. I never have to read four specs to remember why a task matters.

### US-10 — Crash recovery
> As a board operator, the server restarts mid-heartbeat. On startup, the watchdog finds an `in_progress` issue with a dead `execution_run_id`, opens a recovery issue naming the owner and action, and surfaces it on the dashboard. Nothing is silently marked done.

## 5. Functional Requirements

Requirements are grouped by subsystem. Every FR has a stable ID; downstream tests and PR descriptions cite these IDs.

### 5.1 Studios & Games

- **FR-1.** A board user can `POST /api/studios` to create a Studio with name, description, monthly budget, and issue prefix.
- **FR-2.** A board user can `POST /api/studios/:sid/games` to register a Game inside a Studio, pointing at a `specs/concept/{name}.concept.md` path. The server parses the concept frontmatter and stores `primary_aesthetic` and a `feature_map_snapshot`.
- **FR-3.** Studios are isolated: every business entity carries `studio_id`; routes/services enforce the boundary on every fetch and mutation.
- **FR-4.** A Studio can be archived (`POST /api/studios/:sid/archive`); archived studios reject new heartbeat invocations but remain readable.

### 5.2 Agents & Org tree

- **FR-5.** An agent has: `studio_id`, `name`, `role`, optional `reports_to` (another agent in the same studio, no cycles), `adapter_type`, `adapter_config jsonb`, `status`, `capabilities` text, `permissions jsonb`, `budget_monthly_cents`.
- **FR-6.** The agent and its manager (`reports_to`) must belong to the same studio.
- **FR-7.** A board user can pause/resume/terminate any agent. `terminated` is irreversible.
- **FR-8.** Each agent can have one or more `agent_api_keys`. Plaintext shown once at creation; only the hash is stored.
- **FR-9.** Local-adapter agents (`claude_local`, `codex_local`, `mda`) receive short-lived JWTs minted per run instead of long-lived bearer keys.
- **FR-10.** An agent can have a `capabilities` description so other agents can discover who's relevant for which work.

### 5.3 Goals

- **FR-11.** Goals are hierarchical with `level ∈ {studio, game, team, agent, task}` and a `parent_id`.
- **FR-12.** Each goal can carry a `traces_to_spec_ids text[]` linking it to AES/DYN/MEC IDs.
- **FR-13.** A Game must have at least one root goal at `level=game` before its agents can transition draft work items to active states.

### 5.4 Issues (work items)

- **FR-14.** An issue has at most one assignee — exactly one of `assignee_agent_id` or `assignee_user_id` (or neither).
- **FR-15.** Status follows the state machine in `system.md §7.2`. Illegal transitions return `409`.
- **FR-16.** Every issue traces upward to a goal — directly via `goal_id` or transitively through `project.goal_id`.
- **FR-17.** MDA-specific fields: `mda_layer ∈ {A,D,M,AST,TUNE,LEVEL}` (nullable), `spec_id text?`, `aesthetic_target text?`.
- **FR-18.** When `mda_layer = M` and `spec_id` is set, the server validates that `specs/mechanics/<spec_id>.mec.md` exists at issue create/update time. Same rule for the other layers and their spec directories.
- **FR-19.** Parent/child (`parent_id`) is **structural** — work breakdown only. Blockers (`issue_relations.blocked_by_issue_id`) are **dependency** — explicit waiting relationships. The two are never conflated.
- **FR-20.** `done` and `cancelled` are terminal.

### 5.5 Atomic checkout

- **FR-21.** `POST /api/issues/:id/checkout` runs a single SQL update with `WHERE id = ? AND status IN (?) AND (assignee_agent_id IS NULL OR assignee_agent_id = :agentId)`.
- **FR-22.** If 0 rows are updated, return `409` with `{ currentOwner, currentStatus }`. Agents must not retry 409s.
- **FR-23.** Successful checkout sets `assignee_agent_id`, `status = in_progress`, `started_at` (if null), `checkout_run_id`, `execution_locked_at`.
- **FR-24.** `POST /api/issues/:id/admin/force-release` is board-only. It clears the lock fields, optionally clears the assignee, and writes an `issue.admin_force_release` activity entry containing the previous lock IDs.

### 5.6 Comments, documents, work products

- **FR-25.** `POST /api/issues/:id/comments` accepts an `author_agent_id` xor `author_user_id`. Author identity is taken from the auth token, not the request body.
- **FR-26.** Each issue has a set of keyed documents (`plan`, `design`, `notes`, …) writable via `PUT /api/issues/:id/documents/:key`. Updates create an append-only revision in `document_revisions`.
- **FR-27.** `POST /api/issues/:id/work-products` records first-class outputs — file path, screenshot, preview URL, generated asset reference, or external link.

### 5.7 Approvals & governance

- **FR-28.** The system supports approval types: `hire_agent`, `approve_director_strategy`, `freeze_aes_spec`, `freeze_mec_spec`, `promote_asset_status`, `tuning_override`, plus a generic `request_board_approval` escape hatch.
- **FR-29.** The Game Director may only draft work items until its `approve_director_strategy` is approved. Transitioning a drafted item to an active state before approval returns `422`.
- **FR-30.** An agent that requests `freeze_mec_spec` must cite the dynamic invariant(s) the mechanic satisfies in the approval payload. The server rejects the approval submission if no DYN IDs are cited.
- **FR-31.** A `tuning_override` approval is required when a TUNE change moves a parameter outside the declared range in the tuning spec. The server validates the range before accepting the change.
- **FR-32.** The board can always override: pause/resume/terminate, reassign, cancel, force-release, edit budgets, decide approvals — no approval flow gates a board action.

### 5.8 Heartbeats & adapters

- **FR-33.** Adapters implement the contract in `system.md §10`: `invoke`, `status`, `cancel` (required), plus optional `testEnvironment`, `sessionCodec`, `syncSkills`, `models`, `configSchema`.
- **FR-34.** V1 ships built-in adapters: `process`, `http`, `claude_local`, `codex_local`, and `mda`.
- **FR-35.** The `mda` adapter wraps the existing TypeScript CLI in `tools/` non-interactively:
  - `mda new <layer> <name> --no-prompt --from-json <file>`
  - `mda validate --json`
  - `mda asset-plan generate <id> --json`
  - `mda asset-plan exec <id> --milestone <m> --json`
  - `mda asset-plan import <id> --json`
  - Each invocation emits structured progress events to `heartbeat_run_events`.
- **FR-36.** The scheduler fires per-agent heartbeats by `intervalSec ≥ 30`, clamped to `maxConcurrentRuns ∈ [1, 50]` (default 20).
- **FR-37.** The scheduler skips invocation when the agent is paused/terminated, an existing run is active, the hard budget is hit, or all queued issues are blocked.
- **FR-38.** Every run gets a `heartbeat_runs` row; lifecycle events are appended to `heartbeat_run_events`.
- **FR-39.** Adapter session state persists in `agent_task_sessions` keyed by `(agent_id, issue_id)` so heartbeats resume context.
- **FR-40.** `cancel` performs graceful termination first (SIGTERM / API cancel) then force-kills after `graceSec`.

### 5.9 Wake reasons & context delivery

- **FR-41.** Wakes carry a `wake_reason ∈ {routine_fire, assignment, comment, mention, approval, blocker_resolved, manual}` and an optional `task_id`.
- **FR-42.** Adapters inject the env vars listed in `system.md §10.3`. For local adapters, `MDA_STUDIO_API_KEY` is a short-lived JWT.
- **FR-43.** Context delivery mode (`thin` | `fat`) is per-agent. `fat` includes assignments, goal summary, budget snapshot, recent comments, **and an MDA context block** (concept summary, primary aesthetic, relevant DYN invariants, last 50 MDA log lines).
- **FR-44.** When a wake names a specific issue via `MDA_STUDIO_WAKE_PAYLOAD_JSON`, the agent procedure may skip identity/inbox steps and go straight to checkout (the "scoped fast path").

### 5.10 Cost & budget

- **FR-45.** `POST /api/studios/:sid/cost-events` accepts the payload in `system.md §13.2`. Validation: non-negative counts, `costCents ≥ 0`, studio ownership on every linked entity.
- **FR-46.** Cost events roll up at read time across (agent, issue, project, goal, game, studio) without materialized tables in V1.
- **FR-47.** Budget thresholds are configurable per `budget_policies` row. Default: soft warn at 80%, hard at 100%.
- **FR-48.** At hard limit: set `agent.status = paused`, block new checkout/invocation, emit a high-priority activity event, write a `budget_incidents` row linking the trigger cost event.
- **FR-49.** Board may resume an agent or raise a budget to clear the hard stop. Both actions are activity-logged.
- **FR-50.** Cross-team work attributes cost upstream via `issues.billing_code` — costs incurred by Agent B working on a task delegated by Agent A roll up to A's request.

### 5.11 Routines

- **FR-51.** A routine has a trigger (cron, webhook, manual API), an assignee, a target issue template, and a concurrency policy.
- **FR-52.** Each firing creates an issue with `origin_kind = routine` and an `agent_wakeup_requests` row queued for the assignee.
- **FR-53.** V1 ships a built-in `mda-validate` routine template that fires `mda validate` per game and turns warnings into deduplicated recovery issues.

### 5.12 Recovery & liveness

- **FR-54.** On server startup, the recovery service scans for `in_progress` issues whose `execution_run_id` is dead and either re-queues a continuation wake (where safe) or opens a recovery issue naming the next action.
- **FR-55.** The liveness contract in `system.md §7.4` is enforced as a *visibility* contract — when no covering path exists, the system surfaces a `blocked` or recovery issue. It must never silently mark work `done` from prose.
- **FR-56.** A watchdog scans `heartbeat_runs` for stuck runs (no event for `>` configurable timeout) and cancels them with a recorded watchdog decision.

### 5.13 Workspaces

- **FR-57.** Each Game has at least one `workspaces` row pointing at a git worktree on disk. Worktrees default to `~/.mda-studio/instances/default/workspaces/<game-id>/`.
- **FR-58.** A heartbeat that needs an isolated workspace gets an `execution_workspaces` row with an ephemeral branch. The branch lifecycle is bound to the run.

### 5.14 Activity log

- **FR-59.** Every mutating action (create / update / delete / approval decision / pause / resume / checkout / release / cost ingest) writes one `activity_log` row with `actor_type`, `actor_id`, `action`, `entity_type`, `entity_id`, `details jsonb`.
- **FR-60.** The activity log is append-only; there is no update or delete API.

### 5.15 MDA-native integrations

- **FR-61.** Specs are first-class. Creating an issue with `mda_layer + spec_id` validates the spec file exists; on commit (server-side git hook), the integrity validator runs and any warnings become comments on the issue.
- **FR-62.** The `mda validate` routine deduplicates warnings by `(game_id, rule_id, spec_id)` — re-firing does not create duplicate recovery issues.
- **FR-63.** Asset-plan executor state for `mda asset-plan exec` is persisted in `agent_task_sessions`, keyed by `(asset_lead_agent_id, AST issue_id)`. Each milestone transition writes a comment + a work-product row.
- **FR-64.** When the asset-plan executor reaches the wizard hand-off point, the issue is reassigned to a human owner (`assignee_user_id`); the next heartbeat does not fire until a human acts.
- **FR-65.** A log-shipper plugin tails Roblox playtest logs from `MDALogger`. `[FAIL]` events materialize as recovery-origin issues; `cid=N` chains correlate into issue threads; session `[SUMMARY]` events become work-products.
- **FR-66.** `design/asset-plans/_tools/{tool}.md` profiles are loadable as plugins. Each profile contributes a config schema, a heartbeat hook, and (optionally) a job scheduler entry.

### 5.16 REST API

- **FR-67.** The HTTP surface matches `system.md §9`. All routes are under `/api`, JSON only, with error semantics `400 / 401 / 403 / 404 / 409 / 422 / 500`.
- **FR-68.** Every mutating route checks the studio boundary before touching data. A request whose token resolves to studio A may not touch entities in studio B; cross-studio requests return `403`.
- **FR-69.** Every mutating request must carry `X-Studio-Run-Id` when issued by an agent during a heartbeat run. The header is recorded in the activity log entry for traceability.

### 5.17 Auth & deployment modes

- **FR-70.** Three deployment modes per `system.md §8.1`: `local_trusted` (default), `authenticated + private`, `authenticated + public`.
- **FR-71.** Bind is independent of auth (`loopback | lan | tailnet | custom`). `local_trusted` forces `loopback`.
- **FR-72.** Agent API keys are stored hashed; plaintext is shown once at creation.

### 5.18 UI (Board App)

- **FR-73.** The UI ships the routes in `system.md §14`.
- **FR-74.** The chrome has a global Studio + Game selector.
- **FR-75.** Atomic-checkout conflicts surface as toast notifications (not silent retries).
- **FR-76.** The issue detail page shows a "Why does this issue exist?" panel walking the trace up through parent → project → goal → primary aesthetic → studio mission.
- **FR-77.** No silent background failures — every failed run is visible in the agent detail page and the activity stream.

## 6. Architecture

```
                                   ┌──────────────────────────────┐
                                   │   Board UI (React + Vite)    │
                                   └──────────────┬───────────────┘
                                                  │ /api
                                   ┌──────────────▼───────────────┐
                                   │      MDA Studio Server       │
                                   │   (Node + TypeScript)        │
                                   │                              │
                                   │  • REST routes (Express)     │
                                   │  • Scheduler / watchdog      │
                                   │  • Adapter registry          │
                                   │  • Approval engine           │
                                   │  • Budget enforcer           │
                                   │  • Recovery service          │
                                   │  • Activity log writer       │
                                   └──┬────────┬────────┬─────────┘
                                      │        │        │
                          Drizzle ORM │        │ adapter│ git
                                      │        │ invoke │ ops
                              ┌───────▼──┐  ┌──▼───┐ ┌──▼─────────┐
                              │ Postgres │  │adapters│ workspaces│
                              │ (embed   │  │ (process│  (worktree │
                              │  or ext.)│  │  /http  │  per game) │
                              └──────────┘  │ /claude │            │
                                            │ /codex  │            │
                                            │ /mda)   │            │
                                            └────┬────┘            │
                                                 │ subprocess /    │
                                                 │ HTTP / CLI       │
                                            ┌────▼─────────────────▼──┐
                                            │   Agent runtimes        │
                                            │   (Claude Code,         │
                                            │    Codex, bash, mda CLI)│
                                            └─────────────────────────┘
```

### Component responsibilities

| Component | Owns |
|---|---|
| **REST routes** | Request validation, auth, studio-boundary enforcement, activity-log writes. |
| **Scheduler** | Per-agent heartbeat firing; respects pause/budget/concurrency rules. |
| **Watchdog** | Detects stuck runs, cancels them, records decisions. |
| **Adapter registry** | Maps `adapter_type` to an adapter module; routes `invoke/status/cancel`. |
| **Approval engine** | Pending-approval state, transition validation, post-approval side effects (e.g. create agent on `hire_agent` approval). |
| **Budget enforcer** | Reads `cost_events`, computes rollups, raises soft/hard incidents, auto-pauses agents. |
| **Recovery service** | Crash recovery on startup, blocker-resolution wakes, non-terminal liveness checks. |
| **Activity log writer** | Single funnel — every service writes through this so the audit story is unified. |
| **Workspaces module** | Manages git worktrees per game + ephemeral execution worktrees per run. |

### Repository layout (new code lives here)

```
mda-studio/
├── server/                 # Express REST + orchestration services
│   └── src/
│       ├── routes/         # one file per resource (studios, games, agents, …)
│       ├── services/       # business logic (approvals, budgets, recovery, …)
│       ├── adapters/       # built-in adapter shims
│       └── index.ts
├── ui/                     # React + Vite board UI
├── packages/
│   ├── db/                 # Drizzle schema + migrations + clients
│   ├── shared/             # types, validators, constants, API paths
│   ├── adapters/           # per-runtime adapter packages
│   │   ├── claude-local/
│   │   ├── codex-local/
│   │   ├── process/
│   │   ├── http/
│   │   └── mda/
│   └── plugins/            # plugin SDK + example plugins
└── cli/                    # mda-studio onboard / configure / doctor
```

The `tools/` CLI and `src/` Luau runtime stay untouched. MDA Studio is additive.

## 7. Data Model

The full schema lives in `system.md §6`. This section captures the V1 minimum-viable subset for traceability. Tables are listed with their **must-have** fields; full field lists are deferred to migration time.

### 7.1 Core tables (V1 schema scope)

| Table | Must-have fields |
|---|---|
| `studios` | `id`, `name`, `status`, `issue_prefix`, `issue_counter`, `budget_monthly_cents`, `spent_monthly_cents` |
| `games` | `id`, `studio_id`, `name`, `concept_spec_path`, `primary_aesthetic`, `feature_map_snapshot jsonb` |
| `agents` | `id`, `studio_id`, `name`, `role`, `reports_to`, `adapter_type`, `adapter_config jsonb`, `status`, `permissions jsonb`, `budget_monthly_cents`, `spent_monthly_cents`, `last_heartbeat_at` |
| `agent_api_keys` | `id`, `agent_id`, `studio_id`, `key_hash`, `last_used_at`, `revoked_at` |
| `goals` | `id`, `studio_id`, `game_id?`, `parent_id?`, `level`, `title`, `traces_to_spec_ids text[]`, `status` |
| `projects` | `id`, `studio_id`, `game_id`, `goal_id?`, `name`, `status`, `lead_agent_id?` |
| `issues` | see `system.md §6.2` (with **MDA fields** `mda_layer`, `spec_id`, `aesthetic_target`) |
| `issue_comments` | `id`, `studio_id`, `issue_id`, `author_agent_id?`, `author_user_id?`, `body` |
| `issue_relations` | `id`, `studio_id`, `issue_id`, `blocked_by_issue_id`, `created_at` |
| `issue_documents` | `id`, `studio_id`, `issue_id`, `document_id`, `key` |
| `documents` + `document_revisions` | append-only doc history |
| `issue_work_products` | `id`, `studio_id`, `issue_id`, `kind`, `payload jsonb` |
| `approvals` | `id`, `studio_id`, `type`, `status`, `payload jsonb`, `requested_by_*`, `decided_by_*`, `decided_at`, `decision_note` |
| `issue_approvals` | lightweight in-issue approval rows |
| `heartbeat_runs` | `id`, `studio_id`, `agent_id`, `invocation_source`, `status`, `started_at`, `finished_at`, `external_run_id`, `context_snapshot jsonb` |
| `heartbeat_run_events` | `id`, `run_id`, `kind`, `payload jsonb`, `created_at` |
| `agent_task_sessions` | `id`, `studio_id`, `agent_id`, `issue_id`, `state jsonb`, `updated_at` |
| `agent_wakeup_requests` | `id`, `studio_id`, `agent_id`, `issue_id?`, `wake_reason`, `payload jsonb`, `dispatched_at?` |
| `cost_events` | `id`, `studio_id`, `agent_id`, `issue_id?`, `project_id?`, `goal_id?`, `billing_code?`, `provider`, `model`, `input_tokens`, `output_tokens`, `cost_cents`, `occurred_at` |
| `budget_policies` | `id`, `studio_id`, `scope`, `scope_id`, `warn_pct`, `hard_pct` |
| `budget_incidents` | `id`, `studio_id`, `agent_id`, `kind`, `trigger_event_id`, `created_at` |
| `routines` | `id`, `studio_id`, `name`, `trigger jsonb`, `template jsonb`, `assignee_agent_id?`, `concurrency_policy` |
| `activity_log` | `id`, `studio_id`, `actor_type`, `actor_id`, `action`, `entity_type`, `entity_id`, `details jsonb`, `created_at` |
| `workspaces` | `id`, `studio_id`, `game_id`, `branch`, `worktree_path`, `status` |
| `execution_workspaces` | `id`, `studio_id`, `run_id`, `branch`, `worktree_path`, `status` |
| `studio_secrets` + `studio_secret_versions` | encrypted secret material |
| `assets`, `issue_attachments` | provider-backed asset metadata |

### 7.2 Required indexes (V1 minimum)

```
agents(studio_id, status)
agents(studio_id, reports_to)
issues(studio_id, status)
issues(studio_id, assignee_agent_id, status)
issues(studio_id, parent_id)
issues(studio_id, project_id)
issues(studio_id, mda_layer, status)
cost_events(studio_id, occurred_at)
cost_events(studio_id, agent_id, occurred_at)
heartbeat_runs(studio_id, agent_id, started_at desc)
approvals(studio_id, status, type)
activity_log(studio_id, created_at desc)
studio_secrets(studio_id, name) unique
```

### 7.3 State machines

- Agent status: `system.md §7.1`
- Issue status: `system.md §7.2`
- Approval status: `system.md §7.3`

### 7.4 Adapter contract

```ts
interface AgentAdapter {
  invoke(agent: Agent, ctx: InvocationContext): Promise<InvokeResult>;
  status(run: HeartbeatRun): Promise<RunStatus>;
  cancel(run: HeartbeatRun): Promise<void>;
  testEnvironment?(agent: Agent): Promise<EnvironmentCheck[]>;
  sessionCodec?: AdapterSessionCodec;
  syncSkills?(agent: Agent): Promise<void>;
  models?(): Promise<AdapterModel[]>;
  configSchema?(): AdapterConfigSchema;
}
```

## 8. Implementation Plan

Six milestones, each ~1 shippable release. Detailed scope in `system.md §16`.

| Milestone | Scope | FR coverage |
|---|---|---|
| **M1 — Studio core + auth** | Studio/Game/Agent CRUD, auth, embedded Postgres, onboard CLI | FR-1..10, FR-70..72 |
| **M2 — Issues + governance** | Issue lifecycle, atomic checkout, comments/docs/work-products, approvals | FR-14..32, FR-67..69 |
| **M3 — Heartbeat + adapters** | Adapter contract, `process`/`http` adapters, scheduler, watchdog, agent-facing API | FR-33..44, FR-54..58 |
| **M4 — Cost + budget** | Cost ingestion, rollups, hard-stop auto-pause | FR-45..50 |
| **M5 — `mda` adapter + MDA routes** | The killer integration: drive `mda` CLI from heartbeats; spec browser; `mda validate` routine | FR-35, FR-51..53, FR-61..64, FR-66, FR-76 |
| **M6 — `claude_local` adapter + polish** | Local Claude with session resume; `MDALogger` shipper; routines UI; hardening | FR-65, FR-73..77 |

## 9. Acceptance Criteria

A reviewer can verify V1 ships when **all** of these pass:

- **AC-1.** `mda-studio onboard` (no args) on a clean machine boots an embedded Postgres, runs migrations, starts the server on `:3100`, opens the UI, and walks the operator through creating their first Studio and Game.
- **AC-2.** A board user can create two Studios and a Game in each, switch between them in the UI, and verify entities never leak across the boundary (a direct `GET` for a studio-A issue using studio-B's auth returns `403`).
- **AC-3.** A board user can hire a Game Director, approve its strategy proposal, and observe at least one heartbeat that produces a comment or document on a top-level issue.
- **AC-4.** A `claude_local` agent assigned `MEC-001` produces an edit to `specs/mechanics/MEC-001.mec.md` via a heartbeat and reports its cost back via `POST /cost-events`.
- **AC-5.** Two agents racing on the same issue: one succeeds with `200`, the other receives `409` with `{ currentOwner, currentStatus }`. The losing agent does not retry.
- **AC-6.** A budget hard-limit fires: the offending agent transitions to `paused`, the dashboard shows a budget incident linking the trigger cost event, and the scheduler skips subsequent invocations until the operator raises the budget or resumes.
- **AC-7.** A `freeze_mec_spec` approval submitted without DYN IDs in its payload is rejected with `422`; a properly cited approval transitions to `approved` and writes an `issue_approvals` row.
- **AC-8.** `mda validate` routine fires on a synthetic warning and produces exactly one recovery issue; re-firing on the same warning state does not create a duplicate (dedup by `(game_id, rule_id, spec_id)`).
- **AC-9.** Killing the server mid-heartbeat: on restart, the watchdog finds the orphaned run, surfaces a recovery issue, and the operator can see the prior `execution_run_id` in the activity log.
- **AC-10.** The `mda` adapter drives `mda asset-plan exec <id> --milestone M1 --json` from a heartbeat and writes the resulting artifact as a work-product on the AST issue.
- **AC-11.** Opening any issue in the UI shows the "Why does this issue exist?" trace panel resolving up to the studio mission.
- **AC-12.** Every mutating action seen during AC-1..11 is present in `GET /api/studios/:sid/activity` with correct `actor_type`, `entity_type`, and `details`.
- **AC-13.** The app boots with `DATABASE_URL` set to an external Postgres and passes AC-1..3 against it.
- **AC-14.** Dashboard counts (agents by status, issues by status, MTD spend, pending approvals) match direct DB queries within 1s of the last mutating action.

## 10. Open Questions

- **OQ-1.** **One studio per repo, or many?** Likely 1:1 with a git repo, but the data model supports N:1 for portfolios. Final call at M1.
- **OQ-2.** **Studio DB location.** `~/.mda-studio/instances/default/db` (out-of-repo) for V1. Should generated artifacts (asset-plan output, placeholder bins) still land in-repo? Yes for traceability — revisit if repo bloat becomes a concern.
- **OQ-3.** **Director autonomy.** V1 = conservative: Director only drafts feature map + top goals, every hire and spec freeze is board-approved. Revisit after M3 when real Directors are running.
- **OQ-4.** **Spec-level checkout.** Two agents editing the same MEC file is checkout-style. Extend atomic checkout to spec files keyed by `spec_id`? Probably yes — schedule for M5.
- **OQ-5.** **Tool-use cost events.** The asset-plan executor produces token *and* tool spend (Blender headless, Photoshop). Tool spend isn't a `cost_event` today. New `tool_use_events` table, or extend `cost_events.provider` with a `tool:` scheme?
- **OQ-6.** **Webhook source of truth for `mda validate`.** GitHub Actions push hook vs. local git post-commit hook vs. polling? Probably support both push (CI) and a `routines.trigger.cron`.
- **OQ-7.** **Skill packaging for the agent.** A `skills/mda-studio/SKILL.md` is needed for agents to know the heartbeat procedure. Should it ship inside `packages/adapters/claude-local`, in `mda-studio/skills/`, or in this repo's `skills/`? Cleanest: `mda-studio/skills/`, mounted at runtime by adapter `syncSkills`.
- **OQ-8.** **`feature_map_snapshot` vs live parse.** Cache the concept's feature map at game-create time, or parse on every read? V1 = cache + invalidate on concept spec change (via mtime).

## 11. Future Work (Post-V1)

- Public studio template marketplace (ClipHub-style)
- Multi-board governance + fine-grained RBAC
- Cloud / sandbox agents (e2b, hosted Cursor, hosted Codex)
- First-class artifacts subsystem beyond `work_products`
- Agent memory / knowledge graph
- Enforced outcomes (PR merged, asset shipped, build passed)
- "Maximizer mode" deep planning + auto self-organization
- Realtime push transport (full SSE/WebSocket layer)
- Desktop app
- Plugin marketplace (separate from studio templates)
