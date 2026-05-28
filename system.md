# MDA Studio — Control Plane for an AI Game Studio

Status: Design blueprint (not yet implemented)
Source pattern: [Paperclip](https://github.com/paperclipai/paperclip) — "If a coding agent is an *employee*, Paperclip is the *company*."
Goal: Adapt Paperclip's autonomous-company control plane to the MDA spec-driven game-development framework.

---

## 1. The Idea in One Paragraph

The MDA framework already turns *one* designer + AI into a structured pipeline (Concept → Aesthetics → Dynamics → Mechanics → Assets → Tuning → Levels). What it does **not** have is a way to run *many* AI agents simultaneously, each owning a slice of that pipeline, coordinated against a shared game vision, with budgets, governance, and audit trails. **MDA Studio** is that control plane. You describe a game, hire AI agents (a Game Director, a Mechanics Engineer, a Tuning Analyst, an Asset Lead…), give them goals, and they work in coordinated heartbeats — opening specs, writing code, generating assets, validating against M/D/A invariants — while you supervise from a dashboard. The MDA framework becomes the *content layer*; MDA Studio becomes the *orchestration layer*.

> **"If `mda new` makes one spec, MDA Studio makes a studio that authors thousands."**

---

## 2. Mental Model: Two Planes

Like Paperclip, MDA Studio splits cleanly into two planes:

### 2.1 Control Plane (the new thing this doc specifies)

Owns: studios, agents, org structure, goals, tasks (work items), heartbeats, budgets, approvals, audit log. Runs as a Node + TypeScript server with an embedded Postgres and a React UI. Does **not** run AI itself.

### 2.2 Execution Plane (already partly exists)

The thing that actually opens a file, calls Claude, validates a spec, runs `mda asset-plan exec`. Agents live here. Adapters bridge the two planes — each adapter knows how to invoke one runtime (Claude Code, Codex, a bash script, an HTTP webhook) and report back.

The control plane orchestrates. Agents run wherever they run and phone home through the adapter.

---

## 3. Domain Translation: Paperclip → MDA Studio

| Paperclip concept | MDA Studio concept | Notes |
|---|---|---|
| **Company** | **Studio** (containing one or more **Games**) | A studio is the top-level scope. One MDA Studio install can run many studios. |
| **Goal** (mission) | **Aesthetic Goal** + **Feature Map entry** | Top-level goal is a game concept's primary aesthetic ("Deliver Fellowship under pressure"). Child goals trace down to mechanic invariants and tuning targets. |
| **Agent** | **Specialist agent** | Game Director (CEO-equivalent), Mechanics Engineer, Dynamics Analyst, Aesthetics Reviewer, Asset Lead, Tuner, Level Designer, Validator. Org tree mirrors the MDA stack. |
| **Issue** (task) | **Spec/Work item** | Authoring an AES, DYN, MEC, AST, TUNE, or LEVEL spec; implementing a mechanic in Luau; running `mda asset-plan exec`; tuning a parameter; debugging via MDA logs. |
| **Adapter** | **Adapter** (unchanged concept) | `claude_local`, `codex_local`, `process`, `http`, plus an MDA-native adapter that knows how to drive `mda new`/`mda validate`/`mda asset-plan` non-interactively. |
| **Approvals** | **Spec sign-offs** | Required for: concept commits, new aesthetic targets, mechanic spec freeze, asset-plan promotion (concept → placeholder → final), tuning parameter changes outside declared ranges. |
| **Cost events** | **Cost events** (unchanged) | Token/$ per agent, per spec, per asset, per game. |
| **Budgets** | **Budgets** (unchanged) | Per studio, per game, per agent, per asset. Hard stop pauses the agent. |
| **Heartbeat** | **Heartbeat** (unchanged) | Wake an agent on a schedule or event; one short execution window per wake. |
| **Activity log** | **Activity log** | Plus existing `MDALogger` runtime logs from the game itself. Two log streams, one audit story. |
| **Plugin** | **Plugin** | Maps cleanly onto the existing tool/engine profile system in `design/asset-plans/_tools/` and `_engines/`. |
| **Routine** (scheduled task) | **Routine** | E.g. "every Monday, run `mda validate` and open issues for warnings", "every push, regenerate traceability.md". |
| **Workspace** | **Game workspace** | Each game = one git worktree of `specs/` + `design/` + `src/`. Agents do their work in an isolated workspace. |

The core invariants survive the translation:

- single-assignee work items
- atomic checkout (no two agents working the same spec at once)
- approval gates for governed actions
- budget hard-stops auto-pause agents
- activity logging on every mutation
- company/studio-scoped data isolation

---

## 4. V1 Scope

### 4.1 In scope (V1)

- Studio lifecycle (create / list / archive)
- Game lifecycle inside a studio (one studio → many games)
- Goal hierarchy rooted at a primary aesthetic
- Agent lifecycle with org tree, role, adapter config, capabilities description
- Work-item lifecycle with parent/child + blocker dependencies
- Atomic checkout + explicit status transitions
- Approval flow for: agent hires, Game Director strategic breakdown, spec freezes
- Heartbeat invocation, run tracking, cancel/recovery
- Cost event ingestion + per-agent/per-game/per-spec rollups
- Budget hard-stop auto-pause
- React board UI for dashboard, org chart, work items, approvals, costs, activity
- Agent-facing REST API (read/write work items, comments, costs, heartbeat status)
- Adapter contract + built-in adapters: `process`, `http`, `claude_local`, `codex_local`, plus an **MDA adapter** that wraps `mda` CLI commands
- Activity log on every mutating action
- Integration with existing MDA tooling: `mda new`, `mda validate`, `mda asset-plan generate|exec|import`

### 4.2 Out of scope (V1, deferred)

- Public studio template marketplace
- Multi-board governance (one human operator per install in V1)
- Cloud/sandbox-only agents (e2b, Cursor cloud, etc.)
- Memory / knowledge subsystem beyond the activity log
- Realtime push beyond simple polling/SSE
- A drag-and-drop org chart editor (CRUD-style UI is enough)

---

## 5. Architecture

### 5.1 Runtime components

```
mda-studio/
├── server/                 # Express REST API + orchestration services
├── ui/                     # React + Vite board UI
├── packages/
│   ├── db/                 # Drizzle schema, migrations, embedded-postgres client
│   ├── shared/             # Shared types, validators, constants, API path constants
│   ├── adapters/           # Per-runtime adapter packages
│   │   ├── claude-local/
│   │   ├── codex-local/
│   │   ├── process/
│   │   ├── http/
│   │   └── mda/            # New: wraps `mda` CLI for spec/asset operations
│   └── plugins/            # Plugin SDK + example plugins
└── cli/                    # `mda-studio onboard`, `mda-studio agent local-cli`, etc.
```

This sits **next to**, not inside, the existing `tools/` and `src/` directories. The MDA framework's repo continues to hold the *spec content*; the studio is the orchestrator that operates on that content.

### 5.2 Data stores

- **Primary DB**: PostgreSQL via Drizzle ORM
- **Local default**: embedded PostgreSQL at `~/.mda-studio/instances/default/db` (zero config — `DATABASE_URL` unset → spin up embedded PG)
- **Optional**: external Postgres via `DATABASE_URL`
- **File storage**: `~/.mda-studio/instances/default/data/storage` for attachments, generated assets, screenshots, work products
- **Game workspaces**: git worktrees per game under `~/.mda-studio/instances/default/workspaces/<game-id>/`

### 5.3 Background processing

A single in-process scheduler/worker handles:

- heartbeat trigger checks (per-agent interval)
- stuck-run detection (watchdog over `heartbeat_runs.started_at`)
- budget threshold checks (soft 80% / hard 100%)
- blocker resolution wake-ups
- routine cron firing

No separate queue infra in V1.

---

## 6. Data Model (Drizzle Schema, V1)

Every business table includes `id`, `created_at`, `updated_at`, and a **company-scope column** that we call `studio_id`. Studio boundaries are enforced in routes/services — never trust callers.

### 6.1 Core tables

| Table | Purpose |
|---|---|
| `studios` | Top-level org. `name`, `description`, `status` (active/paused/archived), `issue_prefix`, `issue_counter`, `budget_monthly_cents`, `spent_monthly_cents`, branding fields. |
| `games` | A game inside a studio. References `specs/concept/{game}.concept.md`. `studio_id`, `concept_spec_path`, `primary_aesthetic`, `feature_map_snapshot`. |
| `agents` | An AI employee. `studio_id`, `name`, `role` (e.g. `game_director`, `mechanics_engineer`), `reports_to`, `adapter_type`, `adapter_config jsonb`, `runtime_config jsonb`, `status`, `capabilities` text, `permissions jsonb`, `last_heartbeat_at`, `budget_monthly_cents`, `spent_monthly_cents`, `default_workspace_id`. |
| `agent_api_keys` | Hashed bearer keys. Plaintext shown once at creation. |
| `goals` | Hierarchical: `level` ∈ `studio | game | team | agent | task`. References AES/DYN/MEC IDs as `traces_to_spec_ids text[]`. Status: `planned | active | achieved | cancelled`. |
| `projects` | A coherent body of work inside a game — e.g. "Combat System v1", "Tutorial Level". Optional `goal_id`, optional `lead_agent_id`. |
| `issues` | The core work-item entity. See §6.2. |
| `issue_comments` | Threaded discussion on an issue. `author_agent_id` *or* `author_user_id`. |
| `issue_relations` | Blocker dependencies (`blocked_by_issue_id`). Separate from `parent_id` (structural). |
| `issue_documents` | First-class plan/design/notes docs tied to an issue by stable `key`. Append-only revisions via `document_revisions`. |
| `issue_work_products` | Outputs (file, screenshot, preview URL, generated asset). First-class so "what did the agent ship?" is one query. |
| `issue_approvals` | Lightweight in-issue approvals (e.g. spec sign-off). |
| `approvals` | Heavyweight governance approvals (`hire_agent`, `approve_director_strategy`, `freeze_mec_spec`, `promote_asset_status`). |
| `heartbeat_runs` | One row per agent wake. `invocation_source` (`scheduler | manual | callback`), `status`, `started_at`, `finished_at`, `external_run_id`, `context_snapshot jsonb`. |
| `heartbeat_run_events` | Per-run structured events (started, tool_call, error, finished). Cheap, indexed. |
| `agent_task_sessions` | Adapter session state (e.g. Claude session ID) per (agent, issue), so heartbeats resume context instead of cold-starting. |
| `agent_wakeup_requests` | Pending/queued wakes. Driven by routines, comments, blocker resolution, manual triggers. |
| `cost_events` | `studio_id`, `agent_id`, `issue_id?`, `project_id?`, `goal_id?`, `billing_code?`, `provider`, `model`, `input_tokens`, `output_tokens`, `cost_cents`, `occurred_at`. |
| `budget_policies` | Scoped budget rules (warn % + hard %). |
| `budget_incidents` | Recorded when a budget threshold fires; ties to the agent pause/activity event. |
| `routines` | Recurring scheduled work. Cron, webhook, and API triggers. Each fire creates an issue and wakes the assignee. |
| `activity_log` | Append-only audit trail. `actor_type` (`agent | user | system`), `actor_id`, `action`, `entity_type`, `entity_id`, `details jsonb`. |
| `workspaces` | Git worktree state per game. `game_id`, `branch`, `worktree_path`, `status`. |
| `execution_workspaces` | Per-run isolated workspace (operator branch, ephemeral worktree) when an agent needs one. |
| `assets`, `issue_attachments` | Provider-backed asset metadata (`local_disk | s3`). Never inline bytes. |
| `studio_secrets` + `studio_secret_versions` | Encrypted secrets (API keys, etc.). Local default provider: `local_encrypted`. Refs injected at heartbeat time, never persisted in `adapter_config`. |
| `plugins`, `plugin_config`, `plugin_state`, `plugin_jobs`, `plugin_logs`, `plugin_webhooks` | Plugin system tables — mirror Paperclip's plugin layer. |
| `instance_user_roles`, `studio_memberships`, `invites`, `join_requests` | Multi-user surface (deferred to V1.1 in practice but tables exist). |

### 6.2 `issues` (core table)

Key fields beyond the obvious:

- `studio_id`, `game_id`, `project_id?`, `goal_id?`, `parent_id?`
- `title`, `description text`, `status` ∈ `backlog | todo | in_progress | in_review | done | blocked | cancelled`
- `priority` ∈ `critical | high | medium | low`
- `assignee_agent_id?` xor `assignee_user_id?` (single-assignee invariant)
- **Atomic checkout fields**: `checkout_run_id`, `execution_run_id`, `execution_agent_name_key`, `execution_locked_at`
- `created_by_agent_id?`, `created_by_user_id?`
- `issue_number int`, `identifier text` (e.g. `STU-123`)
- `origin_kind` (`manual | routine | recovery | mention | spec_validation`)
- `request_depth int default 0` — how many delegation hops from the original requester
- `billing_code text?` — cost attribution upstream when one agent requests work from another
- **MDA-specific fields**:
  - `mda_layer text?` ∈ `A | D | M | AST | TUNE | LEVEL` — which MDA layer this work belongs to
  - `spec_id text?` — e.g. `MEC-001`, `AES-003`
  - `aesthetic_target text?` — one of the 8 aesthetic categories when relevant
- `execution_policy jsonb?` — overrides for review/approval flow on this issue
- `execution_state jsonb?` — current-stage state machine for in-issue approvals
- timestamps: `started_at`, `completed_at`, `cancelled_at`, `hidden_at`

**Invariants** (enforced in the service layer with DB constraints where feasible):

1. exactly one of `assignee_agent_id`/`assignee_user_id` (or neither)
2. `in_progress` requires an assignee
3. every issue traces upward to a `goal_id` (directly or through `project.goal_id`)
4. `mec` layer issues must reference a `spec_id` that exists in `specs/mechanics/`
5. `done` and `cancelled` are terminal
6. agent and assignee must belong to the same studio

### 6.3 Required indexes (minimum)

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

---

## 7. State Machines

### 7.1 Agent status

```
idle ──► running ──► idle
            │
            ├──► error ──► idle
            └──► paused (graceful cancel)

idle ◄──► paused
* ──► terminated   (board only, irreversible)
```

### 7.2 Issue status

```
backlog ──► todo | cancelled
todo    ──► in_progress | blocked | cancelled
in_progress ──► in_review | blocked | done | cancelled
in_review ──► in_progress | done | cancelled
blocked ──► todo | in_progress | cancelled
done, cancelled  (terminal)
```

Side effects: `in_progress` sets `started_at`; `done` sets `completed_at`; `cancelled` sets `cancelled_at`.

### 7.3 Approval status

`pending ──► approved | rejected | cancelled` (terminal after decision).

### 7.4 Non-terminal liveness contract

(Copied from Paperclip; this is a *visibility* contract, not auto-completion.) An agent-owned non-terminal issue must have **one** of these covering paths, or it's a stalled-work bug:

- active run linked to the issue
- queued wake/continuation deliverable to the responsible agent
- typed execution-policy participant (e.g. reviewer is named)
- pending issue-thread interaction or linked approval awaiting a specific responder
- one-shot monitor with `nextCheckAt`
- a human owner (`assignee_user_id`)
- a blocker chain whose unresolved leaves are themselves healthy
- an explicit recovery issue naming owner + action

If the system can't infer any of those, it surfaces the ambiguity as a `blocked` issue or a recovery issue. **It must never silently mark work done from prose.**

---

## 8. Authentication & Permissions

### 8.1 Deployment modes (port from Paperclip)

- `local_trusted` — loopback bind, no login, default for solo dev
- `authenticated + private` — login required, bind = `lan | tailnet | custom`, low-friction
- `authenticated + public` — login required, explicit public URL, strict checks

Bind is a separate concern from auth (`loopback | lan | tailnet | custom`).

### 8.2 Identity

- **Board user**: human operator. Session-based auth in authenticated mode; implicit operator in `local_trusted`.
- **Agent**: bearer API key (`agent_api_keys`, hashed at rest). Scoped to one agent + one studio. For local adapters, short-lived JWTs are minted per run instead of long-lived keys.

### 8.3 Permission matrix (V1)

| Action | Board | Agent |
|---|---|---|
| Create studio | yes | no |
| Hire/create agent | yes (direct) | request via approval |
| Pause/resume/terminate agent | yes | no |
| Create/update issue | yes | yes |
| Force-reassign | yes | limited (manager subtree only) |
| Approve strategy/hire/spec-freeze | yes | no |
| Report cost | yes | yes |
| Set studio budget | yes | no |
| Set subordinate budget | yes | yes (manager subtree only) |
| Modify auth/keys | yes | no |

Every mutating board action writes `activity_log`. Strict studio-boundary checks on every fetch/mutation.

---

## 9. REST API Contract

Base path `/api`, JSON only. Error semantics: `400 / 401 / 403 / 404 / 409 (state conflict) / 422 (rule violation) / 500`.

### 9.1 Studios

```
GET    /studios
POST   /studios
GET    /studios/:studioId
PATCH  /studios/:studioId
POST   /studios/:studioId/archive
```

### 9.2 Games

```
GET    /studios/:studioId/games
POST   /studios/:studioId/games          # body includes concept_spec_path
GET    /games/:gameId
PATCH  /games/:gameId
GET    /games/:gameId/feature-map        # parsed from concept spec
GET    /games/:gameId/traceability       # parsed from specs/traceability.md
```

### 9.3 Agents

```
GET    /studios/:studioId/agents
POST   /studios/:studioId/agents
GET    /agents/:agentId
PATCH  /agents/:agentId
POST   /agents/:agentId/pause
POST   /agents/:agentId/resume
POST   /agents/:agentId/terminate
POST   /agents/:agentId/keys             # mint API key
POST   /agents/:agentId/heartbeat/invoke # manual wake
GET    /agents/me                        # agent-facing: identity, budget, chain-of-command
GET    /agents/me/inbox-lite             # compact assignment list for heartbeat
```

### 9.4 Issues

```
GET    /studios/:studioId/issues
POST   /studios/:studioId/issues
GET    /issues/:issueId
PATCH  /issues/:issueId
POST   /issues/:issueId/checkout
POST   /issues/:issueId/release
POST   /issues/:issueId/admin/force-release  # board-only lock recovery
GET    /issues/:issueId/heartbeat-context    # compact: state + ancestor summaries + cursor
POST   /issues/:issueId/comments
GET    /issues/:issueId/comments?after=&order=
GET    /issues/:issueId/documents
PUT    /issues/:issueId/documents/:key       # plan | design | notes
GET    /issues/:issueId/documents/:key/revisions
POST   /studios/:studioId/issues/:issueId/attachments  # multipart
GET    /issues/:issueId/work-products
```

**Atomic checkout contract**:

```http
POST /api/issues/:issueId/checkout
Authorization: Bearer <agent-key>
X-Studio-Run-Id: <run-id>
{ "agentId": "...", "expectedStatuses": ["todo","backlog","blocked","in_review"] }
```

Server runs a single SQL update:

```sql
UPDATE issues
   SET assignee_agent_id = :agentId,
       status = 'in_progress',
       started_at = COALESCE(started_at, now()),
       checkout_run_id = :runId,
       execution_locked_at = now()
 WHERE id = :issueId
   AND status IN (:expectedStatuses)
   AND (assignee_agent_id IS NULL OR assignee_agent_id = :agentId);
```

If 0 rows updated → `409` with current owner/status. **Agents must not retry 409s.**

### 9.5 Approvals, costs, dashboard, activity

```
GET    /studios/:studioId/approvals?status=pending
POST   /studios/:studioId/approvals
POST   /approvals/:approvalId/approve
POST   /approvals/:approvalId/reject

POST   /studios/:studioId/cost-events
GET    /studios/:studioId/costs/summary
GET    /studios/:studioId/costs/by-agent
GET    /studios/:studioId/costs/by-game
PATCH  /studios/:studioId/budgets
PATCH  /agents/:agentId/budgets

GET    /studios/:studioId/dashboard
GET    /studios/:studioId/activity
```

Dashboard payload includes: agent counts by status, issue counts by status, MTD spend + budget utilization, pending approvals count, recent activity preview, **MDA-specific**: count of specs per layer with `status=draft`, integrity-validator warning count, asset-plan executor state summary.

### 9.6 MDA-specific routes

```
POST   /games/:gameId/specs/new           # wraps `mda new <layer> <name>`
POST   /games/:gameId/specs/validate      # wraps `mda validate`
GET    /games/:gameId/specs               # listing across specs/ tree
GET    /games/:gameId/specs/:specId       # parsed spec content + traceability
POST   /games/:gameId/asset-plans/:assetId/generate
POST   /games/:gameId/asset-plans/:assetId/exec        # body: { milestone?, resume? }
POST   /games/:gameId/asset-plans/:assetId/import
GET    /games/:gameId/levels
```

All mutating MDA routes write `activity_log` entries with `entity_type = mda_spec | mda_asset_plan | mda_validation`.

---

## 10. Adapter Contract

```ts
interface AgentAdapter {
  invoke(agent: Agent, ctx: InvocationContext): Promise<InvokeResult>;
  status(run: HeartbeatRun): Promise<RunStatus>;
  cancel(run: HeartbeatRun): Promise<void>;

  // Optional:
  testEnvironment?(agent: Agent): Promise<EnvironmentCheck[]>;
  sessionCodec?: AdapterSessionCodec;        // round-trip session state
  syncSkills?(agent: Agent): Promise<void>;  // install studio skills into agent runtime
  models?(): Promise<AdapterModel[]>;
  configSchema?(): AdapterConfigSchema;       // drives UI form rendering
}
```

### 10.1 Built-in adapters

- **`process`** — spawn child process. Config: `{command, args, cwd, env, timeoutSec, graceSec}`. Cancel = SIGTERM → grace → SIGKILL.
- **`http`** — outbound HTTP. Config: `{url, method, headers, timeoutMs, payloadTemplate}`. 2xx = accepted; optional callback endpoint completes runs asynchronously.
- **`claude_local`** — local Claude Code session. Resumes session per (agent, issue) via `agent_task_sessions`.
- **`codex_local`** — local Codex CLI.
- **`mda`** — new. Wraps the existing TypeScript CLI in `tools/` non-interactively:
  - `mda new <layer> <name> --no-prompt --from-json <file>` for spec authoring
  - `mda validate --json` for invariant checks
  - `mda asset-plan generate|exec|import` for the asset pipeline
  - emits structured progress events back to `heartbeat_run_events`

### 10.2 Context delivery modes

- `thin` — wake payload contains only IDs and pointers; agent fetches via API
- `fat` — wake payload includes current assignments, goal summary, budget snapshot, recent comments, **MDA context block** (concept summary, primary aesthetic, relevant DYN invariants, latest MDA log tail)

### 10.3 Environment variables injected per run

```
MDA_STUDIO_AGENT_ID
MDA_STUDIO_STUDIO_ID
MDA_STUDIO_GAME_ID
MDA_STUDIO_API_URL
MDA_STUDIO_API_KEY        # short-lived JWT for local adapters
MDA_STUDIO_RUN_ID
MDA_STUDIO_TASK_ID?       # the issue that triggered this wake, when scoped
MDA_STUDIO_WAKE_REASON?   # routine_fire | assignment | comment | mention | approval | blocker_resolved | manual
MDA_STUDIO_WAKE_PAYLOAD_JSON?  # compact prefetched payload for comment/scoped wakes
MDA_STUDIO_SPEC_ID?       # when wake is spec-scoped
```

### 10.4 Scheduler rules

Per-agent fields in `adapter_config`:

- `enabled: boolean`
- `intervalSec: int` (minimum 30)
- `maxConcurrentRuns: int` (default 20, clamped 1..50)

Scheduler skips invocation when: agent paused/terminated, an existing run is active, hard budget hit, or any blocker on the agent's queue.

---

## 11. Heartbeat Procedure (Agent Side)

This is the *agent's* contract. The Paperclip skill in `skills/paperclip/SKILL.md` will be re-authored for MDA Studio as `skills/mda-studio/SKILL.md`. Steps:

1. **Identity** — `GET /api/agents/me`.
2. **Scoped fast-path** — if `MDA_STUDIO_WAKE_PAYLOAD_JSON` names a specific issue, skip directly to step 5.
3. **Approval follow-up** — if `MDA_STUDIO_APPROVAL_ID` is set, fetch approval and linked issues, close or comment.
4. **Get assignments** — `GET /api/agents/me/inbox-lite`. Priority: `in_progress` → `in_review` (only if woken on it) → `todo`. Skip `blocked` unless you can unblock.
5. **Checkout** — `POST /issues/:id/checkout` with `X-Studio-Run-Id` header. `409` ⇒ stop, pick another. **Never retry 409.**
6. **Understand context** — `GET /issues/:id/heartbeat-context` first. Then incremental comments (`?after=...`). Then MDA-specific: pull the spec(s) named in `spec_id`, the ancestor traceability chain, and the relevant MDA logs (`?cid=...`).
7. **Do the work** — adapter-specific. For an MDA agent: open the spec, edit it; or call `mda new`, `mda validate`, `mda asset-plan exec`; or write Luau code; or run the validator.
8. **Report progress** — `POST /issues/:id/comments`, `PATCH /issues/:id`, `PUT /issues/:id/documents/plan`, `POST /issues/:id/work-products`.
9. **Report cost** — `POST /studios/:sid/cost-events` (the adapter typically does this on the agent's behalf).
10. **Release or transition** — checkout is released automatically on terminal status; otherwise let the watchdog pick it up.

---

## 12. Governance & Approval Flows

### 12.1 Hiring

1. Board or another agent creates `approval(type=hire_agent, payload=draft_agent)`.
2. Board approves/rejects.
3. On approval, server creates the agent row and (optionally) the initial API key.
4. Decision is written to `activity_log`.

Board may bypass the request flow and create agents directly; still logged.

### 12.2 Game Director (CEO-equivalent) strategy approval

1. The Game Director posts a strategy proposal as `approval(type=approve_director_strategy)` with payload = plan text + initial org structure + top-level work items.
2. Board reviews and approves.
3. Until approved, the Director may only draft work items, not transition them to active states.

### 12.3 MDA-specific approval types

- **`freeze_aes_spec`** — required to lock an aesthetic spec before downstream MEC/AST work can begin.
- **`freeze_mec_spec`** — required to mark a mechanic spec as implementation-ready.
- **`promote_asset_status`** — required to move an asset from `concept` → `placeholder` → `final` in `specs/assets/catalog.md`.
- **`tuning_override`** — required when a `TUNE` change moves a parameter outside the declared range in the tuning spec.

Approvals reference one or more issues and write linked decisions back into `issue_approvals`.

### 12.4 Board override

Always available, no flow required:

- pause/resume/terminate any agent
- reassign/cancel any issue
- edit any budget at any layer
- approve/reject/cancel any pending approval
- force-release a stale checkout

---

## 13. Cost & Budget System

### 13.1 Layers

- studio monthly budget
- game monthly budget (optional)
- agent monthly budget
- project monthly budget (optional)

### 13.2 Cost-event ingestion

```http
POST /api/studios/:sid/cost-events
{
  "agentId": "...",
  "issueId": "...",
  "provider": "anthropic",
  "model": "claude-opus-4-7",
  "inputTokens": 12345,
  "outputTokens": 678,
  "costCents": 142,
  "occurredAt": "2026-05-11T20:00:00Z",
  "billingCode": "MEC-001"
}
```

Validation: non-negative counts, `costCents >= 0`, studio ownership on every linked entity.

### 13.3 Enforcement

- soft alert at 80% (configurable in `budget_policies`)
- hard limit at 100%:
  - set agent `status = paused`
  - block new checkout/invocation for that agent
  - emit high-priority activity event
  - write a `budget_incidents` row linking the trigger event

Board overrides by raising the budget or explicitly resuming the agent.

### 13.4 Rollups

Read-time aggregate SQL is fine for V1 up to ~1k issues/studio. Materialized rollups can come later if p95 query latency exceeds 250 ms.

---

## 14. UI (Board Operator App)

V1 routes:

```
/                                          dashboard
/studios                                   studio list/create
/studios/:id                               studio overview
/studios/:id/games                         games + concept summaries
/studios/:id/games/:gid/org                org chart + agent status
/studios/:id/games/:gid/specs              spec browser (M/D/A/AST/TUNE/LEVEL)
/studios/:id/games/:gid/specs/:specId      spec detail + traceability + linked issues
/studios/:id/games/:gid/issues             issue list / kanban / by-MDA-layer view
/studios/:id/games/:gid/agents/:agentId    agent detail + runs + cost
/studios/:id/games/:gid/asset-plans        asset-plan executor state
/studios/:id/costs                         spend dashboard + budgets
/studios/:id/approvals                     pending + history
/studios/:id/activity                      audit stream
```

Required UX behaviors:

- global studio + game selector in the chrome
- quick actions: pause/resume agent, create issue, approve/reject
- conflict toasts on atomic-checkout failure
- **MDA-specific**: a "Why does this issue exist?" panel that walks the trace up through `parent_id`, `goal_id`, and `mda_layer` chain ("This MEC-001 task → fulfills DYN-003 invariant → serves AES-001 Fellowness target → primary aesthetic of the game"). This is the player-perspective debug view in board form.
- no silent background failures — every failed run is visible

---

## 15. MDA-Native Integrations

These are the bits that *only* make sense because this is the MDA framework, not generic Paperclip.

### 15.1 Specs are the unit of work, not just metadata

Every spec ID (`AES-001`, `MEC-003`, `AST-007`, etc.) becomes a first-class entity in the issue tree. When an agent creates `MEC-005`:

- it opens an issue with `mda_layer = M`, `spec_id = MEC-005`
- the issue traces up through the dynamic spec named in `MEC-005`'s frontmatter → through the aesthetic → through the game's primary aesthetic → through the studio mission
- on commit, the integrity validator runs as a server-side hook and writes any warnings as comments on the issue

### 15.2 `mda validate` is a routine

A built-in routine fires `mda validate` per game on every git push (via webhook) and nightly. Each warning becomes a `recovery` origin issue assigned to the owning agent (deduplicated by spec ID).

### 15.3 Asset-plan executor as a long-running issue

`mda asset-plan exec <asset-id>` already has a milestone state machine. Plugged into MDA Studio:

- one issue per asset (`mda_layer = AST`)
- one `agent_task_session` row tracks executor state across heartbeats
- each milestone transition writes a comment + work-product
- the existing wizard hand-off becomes a *human owner* assignment (`assignee_user_id`) when the executor needs designer input

### 15.4 MDA runtime logs join the audit trail

> **Status: deferred until M3 (agents) lands** — nothing consumes recovery
> issues today, so the shipper has no downstream to feed (D6.RT1).

The `MDALogger` (`src/shared/MDALogger.luau`, MEC-003) already emits structured `[LAYER:SPEC_ID] [LEVEL] [EVENT_TYPE]` lines. A log-shipper plugin tails Roblox playtest logs and:

- materializes `[FAIL]` events as `recovery`-origin issues
- correlates `cid=` chains into issue threads
- writes session `[SUMMARY]` events as work-products

The result: a single timeline that mixes audit events (`agent.created`, `issue.checked_out`) with runtime events (`INVARIANT FAILED on DYN-002 at 02:14.301`). This is the dream of A → D → M debugging at the operator level.

### 15.5 Tool & engine profiles as plugins

`design/asset-plans/_tools/{tool}.md` and `_engines/{engine}.md` map directly onto the plugin system. Each tool profile becomes a plugin that exposes:

- a config schema (drives the UI form for "configure Blender")
- a heartbeat hook ("when an AST issue with `tool: blender` is checked out, ensure MCP server is up")
- a job scheduler ("Blender headless render on this asset")

---

## 16. Implementation Plan

Six milestones; each is roughly one shippable release.

### M1 — Studio core + auth (Week 1–2)

- create `mda-studio/` workspace next to `tools/` and `src/`
- scaffold server + ui + packages/db + packages/shared
- Drizzle migrations for: `studios`, `games`, `agents`, `agent_api_keys`, `goals`, `projects`, `activity_log`, `studio_secrets`
- board session auth + agent bearer-key auth
- `local_trusted` deployment mode + embedded Postgres
- `mda-studio onboard` CLI command

### M2 — Issues + governance (Week 3–4)

- `issues`, `issue_comments`, `issue_relations`, `issue_documents`, `document_revisions`, `issue_work_products`, `approvals`, `issue_approvals`
- atomic checkout endpoint + lifecycle guards
- approval flow for `hire_agent` and `approve_director_strategy`
- minimal board UI: dashboard, issue list, issue detail, approvals page

### M3 — Heartbeat + adapters (Week 5–6)

- adapter contract + registry
- `process` and `http` adapters
- `heartbeat_runs`, `heartbeat_run_events`, `agent_task_sessions`, `agent_wakeup_requests`
- in-process scheduler with stuck-run watchdog
- agent-facing API (`/agents/me`, `/agents/me/inbox-lite`, `/issues/:id/heartbeat-context`)
- minimal MDA Studio skill (`skills/mda-studio/SKILL.md`)

### M4 — Cost + budget (Week 7)

- `cost_events`, `budget_policies`, `budget_incidents`
- cost ingestion endpoint + rollup queries
- hard-stop auto-pause
- dashboard cost panel

### M5 — MDA adapter + MDA routes (Week 8–9)

- **`mda` adapter** (the killer integration): non-interactive wrappers around `mda new`, `mda validate`, `mda asset-plan generate|exec|import`
- MDA-specific routes (`/games/:id/specs/*`, `/games/:id/asset-plans/*`)
- `mda validate` routine on git-push webhook
- spec-browser UI + "why does this issue exist?" trace panel
- asset-plan executor surfaced as a tracked issue

### M6 — `claude_local` adapter + polish (Week 10–11)

- `claude_local` adapter with session resume
- skills sync to agent runtimes
- `MDALogger` runtime-log shipper plugin
- routines UI
- hardening pass: integration + e2e tests for atomic checkout race, hard-budget stop, agent pause/resume, dashboard consistency
- release checklist + onboarding template ("Demo Studio with one Game Director and one Mechanics Engineer")

---

## 17. Acceptance Criteria

V1 is complete only when all are true:

1. A board user can create multiple studios and switch between them.
2. A studio with one game can run at least one active heartbeat-enabled agent that authors or modifies an MDA spec.
3. Issue checkout is conflict-safe with `409` on concurrent claims.
4. Agents can update issues/comments and report costs using API keys only.
5. Board can approve/reject `hire_agent` and `approve_director_strategy` requests in the UI.
6. A budget hard-limit auto-pauses an agent and prevents new invocations.
7. The dashboard shows accurate live counts and MTD spend.
8. Every mutation is auditable in `activity_log`.
9. The app runs with embedded PostgreSQL out of the box, and with external Postgres via `DATABASE_URL`.
10. The `mda` adapter can drive `mda new` and `mda validate` from a heartbeat and produce a passing validation report as a work-product.

---

## 18. Explicitly Deferred (Post-V1)

- public studio template marketplace ("ClipHub for game studios")
- multi-board governance + fine-grained RBAC
- cloud/sandbox-only agents (e2b, Cursor cloud, hosted Codex)
- artifacts subsystem beyond `work_products`
- agent memory / knowledge graph
- enforced outcomes (PR merged, asset shipped, build passed)
- "MAXIMIZER MODE" deep planning + auto self-organization
- realtime push transport (SSE/WebSocket beyond the simple live-events channel)
- desktop app

---

## 19. Boundaries (What MDA Studio Is *Not*)

- **Not a chatbot.** Agents have jobs (specs to author, mechanics to implement), not chat windows.
- **Not an agent framework.** It doesn't tell you how to build an agent. It runs the *studio* the agents work in.
- **Not a level editor.** Roblox Studio remains the level editor. MDA Studio orchestrates the *spec* and *design* layers around it.
- **Not a replacement for `mda` the CLI.** The CLI stays useful for solo work and CI. MDA Studio *uses* the CLI through the `mda` adapter.
- **Not a workflow builder.** No drag-and-drop. The MDA stack (concept → AES → DYN → MEC → AST → TUNE → LEVEL) *is* the workflow; the studio orchestrates roles against it.

---

## 20. Open Design Questions

1. **One studio per repo, or many?** Paperclip allows many companies per install with full data isolation. For MDA, a studio likely corresponds 1:1 with a git repo, but the data model should support N:1 to keep the door open for portfolios.
2. **Where does the studio DB live relative to the repo?** Probably outside (in `~/.mda-studio/`) so the repo stays a pure spec/code artifact. But generated artifacts (placeholders, asset-plan outputs) belong in the repo.
3. **How agentic should the Game Director be by default?** Conservative: it only drafts the feature map and proposes top-level goals; everything else needs board approval. Aggressive: it can hire mid-level managers within an approved budget. V1 = conservative.
4. **Should specs lock during checkout?** A MEC spec edited by two agents at once is a checkout-style problem. Probably yes — extend atomic checkout to spec files keyed by `spec_id`.
5. **Asset pipeline costs**: the asset-plan executor produces token + tool spend (Blender, Photoshop). Tool spend isn't a cost event but should still be visible. New event type `tool_use_events`?

These are not blockers — they're the right questions to revisit after M3 when real agents are running.

---

## 21. Source References

- Paperclip GOAL: https://github.com/paperclipai/paperclip/blob/master/doc/GOAL.md
- Paperclip PRODUCT: `doc/PRODUCT.md` in that repo
- Paperclip V1 SPEC: `doc/SPEC-implementation.md`
- Paperclip execution semantics: `doc/execution-semantics.md`
- Paperclip plugin spec: `doc/plugins/PLUGIN_SPEC.md`
- Local MDA framework: `CLAUDE.md`, `specs/WORKFLOW.md`, `design/asset-plans/spec.md`

This document is the V1 contract for adapting that pattern. When this conflicts with future Paperclip changes, *this* doc controls MDA Studio behavior.
