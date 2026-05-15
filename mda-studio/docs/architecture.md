# MDA Studio Architecture

How the spec-tree-first operator surface is built — the wire contracts,
the server services, the UI composition, the data-flow guarantees, and
the extension points.

This is the **developer-facing** companion to:

- [`docs/operator-guide.md`](operator-guide.md) — what an operator does
  with the studio (no internals)
- [`../design/mda-studio/spec-tree-ui/plan.md`](../../design/mda-studio/spec-tree-ui/plan.md)
  — the design rationale and the *decisions* (D1–D9) that shape the
  shape described here

Read those if you're trying to understand *why* the system looks the
way it does. Read this if you're trying to change it.

---

## 1. The three layers

The studio is a pnpm workspace with one wire-contract package + one
server + one UI. Each layer has a single concern.

```
┌─────────────────────────────────────────────────────────────┐
│                @mda-studio/ui  (Vite + React)               │
│ components / hooks / lens model / SSE consumer / URL state  │
│  ▲                                                          │
│  │ fetch + EventSource over /api  (Vite proxy → :3100)       │
│  ▼                                                          │
│ @mda-studio/server  (Express + tsx)                         │
│ routes / services / in-memory stores / SSE publisher        │
│  ▲                                                          │
│  │ workspace:* imports — shared zod schemas                  │
│  ▼                                                          │
│ @mda-studio/shared  (TypeScript + zod)                      │
│ wire schemas + MDA vocabulary (layers/statuses/glyphs)      │
└─────────────────────────────────────────────────────────────┘
```

Two rules hold this together:

1. **The wire contract is the only shared code.** Every payload that
   crosses HTTP or SSE has a zod schema in `@mda-studio/shared`. Both
   the server and the UI import the parser. Drift on one side fails
   the typecheck or the runtime validation on the other.
2. **No layer reaches over its peer.** UI never imports server code;
   server never imports UI code. Both depend only on `shared`.

---

## 2. Request lifecycle — opening a game

End-to-end trace of what happens between "operator clicks a game card"
and "the spec tree appears with live updates wired up".

### 2.1 The chrome game card click

`App.tsx` reads `game` from the URL via `useUrlSearchParams`. Clicking
a card calls `openGame(id)` which pushes a new `URLSearchParams` with
`game=<id>` and clears `node`. The router (vanilla `history.pushState`,
no library) re-renders.

### 2.2 The tree fetch

`GameContainer` mounts. It calls `useSpecTree(gameId)`, which:

1. Sets state to `{ status: "loading" }`
2. Fires `fetch(`/api/games/${gameId}/spec-tree`)`
3. On 200: runs `specTreeResponseSchema.safeParse(json)` from
   `@mda-studio/shared`. Bad payload → `{ status: "error" }`.
4. On any non-200 or network failure: looks up `FALLBACK_BY_GAME` and,
   if the gameId matches a bundled fixture, sets `{ status: "ready",
   source: "fixture" }`. Otherwise `{ status: "error" }`.

The fixture fallback is why the prototype never goes blank — even
with the server stopped the home renders bundled `virus-hunter` data.
A `SourceBadge` in the tree header surfaces `"local fixture"` so the
state is honest.

### 2.3 The server side

`spec-tree.ts` route handler:

1. `getGame(gameId)` — pulls from the in-memory `games-registry`.
   404 if unknown.
2. `ensureCache(gameId, specsRoot)` — calls `getCacheEntry(gameId)`
   first; rebuilds on demand if missing.
   - `rebuildSpecCache` walks six directories under the workspace:
     `specs/aesthetics`, `specs/dynamics`, `specs/mechanics`,
     `specs/assets`, `specs/tuning`, `design/levels`. Files starting
     with `_` (schema docs) are skipped.
   - Each file's frontmatter is parsed by `spec-parser.ts`:
     `id`-prefix → layer (`AES-` → `A`, `MEC-` → `M`, …), `traceability:`
     → canonical + secondary parents per layer rules (plan D1), status
     defaulted per-layer if missing. Malformed files become
     `ParseIssue`s, not exceptions.
3. `buildTreeResponse` composes the response from three side-stores:
   - `findActiveIssueForSpec(gameId, specId)` for each parsed spec →
     `activeIssueId / Status / assigneeAgentId / Handle` and a
     derived `runStatus`
   - `computeCostRollup` over `(specs, events)` → own + subtree cents
     maps (the DAG invariant lives here; see §6.2)
   - `listValidatorWarnings(gameId)` → per-spec warning counts
4. `assembleSpecTreeResponse` zips these into one `SpecTreeNode` array,
   sorted by `specId`. The response validates against the same shared
   schema the UI parses.

### 2.4 The UI render

`GameView` receives the parsed response and:

1. Computes `lensResult = applyLenses(tree.nodes, lenses)` — pure
   model (no React) producing three sets: `visibleSpecIds`,
   `ancestorSpecIds` (to force-expand), `matchingSpecIds` (to
   highlight).
2. Renders `LensBar`, `SpecTree`, optional `NodeDrawer`, and the
   `CommandPalette`.

`SpecTree` builds the visual tree from the flat node list with
`buildSpecTree` (a stable, memoized parent → children index) and
renders one `SpecTreeRow` per visible node, recursively.

### 2.5 The SSE subscription

In parallel, `useStudioEvents` opens `EventSource('/api/studios/default/events')`
**only if** `tree.source === "api"` (no SSE in fixture mode). Server
publishes events keyed by gameId; the UI's handler invalidates the
relevant TanStack-Query-like local state. See §8.

### 2.6 Drawer open

Clicking a row writes `node=<specId>` to the URL. `useSpecNodeDetail`
fetches `GET /api/games/:id/spec-tree/node/:specId` which returns the
drawer bundle (spec body, issues, comments, work products, costs,
trace) in **one** round trip. The drawer renders with six tabs; the
selected tab is local state, not URL state.

---

## 3. `@mda-studio/shared` — the wire contract

One file per concern. Every exported `*Schema` has a matching
exported type derived via `z.infer`.

| Module             | Wire shape                                            |
|--------------------|-------------------------------------------------------|
| `mda`              | MDA vocabulary (layers, statuses, glyphs, tokens) — the *only* domain enum |
| `spec-tree`        | `SpecTreeNode`, `SpecTreeResponse`, `GameCard`        |
| `spec-node-detail` | Drawer bundle: spec, issues, comments, work products, costs, trace |
| `issues`           | `IssueSummary`, comments, work products, validator warning, the issue status state machine |
| `costs`            | `CostEvent` + `validatorRun` ingestion shapes; MTD helper |
| `costs-detail`     | Chrome Costs page payload (rollup + recent events)    |
| `agents`           | Org-chart roster                                      |
| `asset-plans`      | Asset-plan list + per-asset state enum                |
| `approvals`        | Approvals queue + resolve input                       |
| `activity`         | Activity log entry + list response                    |
| `studio-events`    | SSE union: 5 event kinds                              |

The MDA vocabulary lives here because both layers need the same glyph
table and the same `layerFromSpecId` mapping. If you ever invent a new
layer or status, it changes here first, then propagates everywhere via
TS errors.

Tests in `*.test.ts` round-trip each schema against a representative
fixture so a breaking change to one side fails the build.

---

## 4. `@mda-studio/server` — services and routes

### 4.1 The boundary

```
routes/   thin Express handlers; parse params/body, call a service,
          shape the response
services/ business logic + in-memory state; no Express types in here
```

Each route imports a service or two and a shared schema. Services
import each other freely (the cost-rollup service reads parsed specs;
the assembler reads everything), but never `express` or `request`.

This means every service is unit-testable in isolation with
`vitest`-only — no `supertest` needed. The routes get integration
tests that boot the full `createApp()`.

### 4.2 In-memory stores

Five mutable stores, all rebuilt on process restart:

| Store                       | Backed by                          |
|-----------------------------|------------------------------------|
| `games-registry`            | `Map<gameId, GameRegistration>` populated from env at boot |
| `spec-cache`                | `Map<gameId, CacheEntry>` rebuilt on demand from disk |
| `issues-store`              | `Map<id, IssueSummary>` + comment/work-product maps |
| `cost-events-store`         | `Map<id, CostEvent>` with monotonic `COST-NNN` ids |
| `approvals-store`           | `Map<id, ApprovalSummary>` with pending counter |
| `validator-runs-store`      | `Map<gameId, ValidatorRun>` keeping only the latest |
| `activity-log-store`        | Bounded ring buffer of `ActivityEntry` |

Each store exposes a `clear*Store()` test-only helper. Tests reset
all stores in `beforeEach` so they don't leak across files.

> **Forward-compatibility.** These are written as if they were the
> public surface of a Drizzle-backed module. When the persistent
> tables land, one file at a time gets a `@mda-studio/db`-backed
> implementation; consumers don't change.

### 4.3 The fixture seed

`fixture-seed.ts` populates issues + costs + approvals + a validator
run for one game id. It's called at boot when
`MDA_STUDIO_SEED_FIXTURE_ISSUES=true`. The data is deliberately rich
enough to exercise every UI surface — including one cost event with a
last-month timestamp (to validate MTD filtering) and one validator
warning per problematic spec.

### 4.4 The SSE publisher

`studio-events.ts` is a tiny pub/sub: stores call
`publishStudioEvent(event)` after every successful mutation; the SSE
route subscribes a Response stream. There is no fan-out queue; every
connected client gets every event.

The published event types (`studio-events.ts` in `shared`):

```ts
type StudioEvent =
  | { type: "node-changed";          gameId: string; specId: string }
  | { type: "issue-status-changed";  gameId: string; specId: string; issueId: string }
  | { type: "cost-event";            gameId: string; specId: string | null }
  | { type: "validator-run-completed"; gameId: string }
  | { type: "approval-changed";      studioId: string; approvalId: string };
```

The activity-log writer subscribes too — every event becomes a row in
the log, so the slide-out is a free byproduct.

### 4.5 Route inventory

All mounted in `app.ts`:

| Method | Path                                              | Returns                       |
|--------|---------------------------------------------------|-------------------------------|
| GET    | `/api/health`                                     | `{ status: "ok" }`            |
| GET    | `/api/games/:id/spec-tree`                        | `SpecTreeResponse`            |
| GET    | `/api/games/:id/spec-tree/node/:specId`           | `SpecNodeDetail`              |
| POST   | `/api/games/:id/spec-tree/refresh`                | `{ rebuiltAt, specCount, … }` |
| GET    | `/api/games/:id/costs[?subtree=]`                 | `CostsDetailResponse`         |
| GET    | `/api/games/:id/agents`                           | `AgentRosterResponse`         |
| GET    | `/api/games/:id/asset-plans`                      | `AssetPlanListResponse`       |
| POST   | `/api/games/:id/validator/runs`                   | `ValidatorRun`                |
| GET    | `/api/games/:id/validator/warnings`               | `ValidatorWarning[]`          |
| GET    | `/api/issues/:id`                                 | `IssueSummary`                |
| PATCH  | `/api/issues/:id`                                 | `IssueSummary`                |
| POST   | `/api/studios/:id/cost-events`                    | `CostEvent`                   |
| GET    | `/api/studios/:id/approvals[?status=]`            | `ApprovalListResponse`        |
| PATCH  | `/api/approvals/:id`                              | `ApprovalSummary`             |
| GET    | `/api/studios/:id/activity[?gameId=&since=&limit=]` | `ActivityListResponse`      |
| GET    | `/api/studios/:id/events`                         | SSE stream of `StudioEvent`   |

Every mutating route emits at least one `StudioEvent` *after* the
store write succeeds.

---

## 5. `@mda-studio/ui` — components, hooks, state

### 5.1 The composition

```
App.tsx
├── Chrome (top bar, secondary-nav buttons, search slot, badges)
├── body (one of:)
│   ├── ApprovalsPanel       (view=approvals)
│   ├── CostsDetailPanel     (view=costs)
│   ├── OrgChartPanel        (view=org)
│   ├── AssetPlansPanel      (view=asset-plans)
│   ├── SettingsPanel        (view=settings)
│   ├── GameCardGrid         (no game selected)
│   └── GameContainer        (game selected, default)
│        └── GameView
│             ├── LensBar
│             ├── SpecTree
│             └── NodeDrawer (when node= is set)
├── ActivitySlideout         (overlay, activity=1)
├── CommandPalette           (overlay, ⌘K)
└── KeymapHelp               (overlay, ?)
```

The body cases are mutually exclusive; overlays compose on top.

### 5.2 Where state lives

| State                                  | Lives in                                            |
|----------------------------------------|-----------------------------------------------------|
| Active game, selected node, view, scope, lenses, activity-open | URL (`useUrlSearchParams`) |
| Server data (tree, drawer detail, approvals, activity, costs, …) | `useXxx` hooks (per-resource fetch+state) |
| Tree expansion state                   | `localStorage` keyed `mda:tree-expansion:<gameId>` |
| Drawer active tab                      | Local `useState` in `NodeDrawer`                    |
| Command palette open + query           | Local `useState` in `App`                           |
| SSE subscription                       | `useStudioEvents` (one-shot per gameId)             |

The choice is deliberate: anything reachable via a shared link goes
in the URL. Anything per-user / per-tab goes local. Anything fetched
goes in a hook so it can refetch.

### 5.3 The hook pattern

Every server-resource hook is the same shape:

```ts
export function useThing(opts): {
  status: "idle" | "loading" | "ready" | "error";
  data: ThingResponse | null;
  error: string | null;
  refetch: () => void;
}
```

- Fetches via `fetch`, no library
- Parses with the matching zod schema from `@mda-studio/shared`; a
  bad payload is an `error` state, not a thrown exception
- Exposes `refetch()` (a bumped key inside `useState`) so the SSE
  handler can invalidate without remounting
- Optional `enabled: boolean` so a component can mount the hook but
  defer the fetch (used for lazy drawers)

### 5.4 The lens model

`lib/lenses.ts` is *pure*. It exports:

```ts
parseLenses(URLSearchParams) -> ActiveLenses
applyLensPatch(URLSearchParams, Partial<ActiveLenses>) -> URLSearchParams
applyLenses(nodes, lenses) -> {
  matchingSpecIds:  Set<string>,  // pass the filter
  ancestorSpecIds:  Set<string>,  // need to stay visible to keep context
  visibleSpecIds:   Set<string>,  // matches ∪ ancestors
}
```

`SpecTree` accepts these three sets as props. The component itself
has no knowledge of lenses — it just hides everything not in
`visibleSpecIds` and force-expands everything in `ancestorSpecIds`.
This boundary is why the same tree component renders both filtered
and unfiltered views without branching.

### 5.5 The SSE consumer

`useStudioEvents({ studioId, onEvent, enabled })` opens one
`EventSource` per mount. Each message is JSON-parsed and validated
against `studioEventSchema`; unknown types are silently ignored
(forward-compatible).

`GameView.handleStudioEvent` is the dispatch table:

```
node-changed | issue-status-changed   → onIssueChanged() → tree refetch
                                       (+ drawer refetch if same spec)
cost-event | validator-run-completed   → tree refetch (+ drawer if open)
approval-changed                       → approvals badge refetch
*                                      → activity slide-out refetch
```

The slide-out refetch is handled via a ref the slide-out component
registers when it opens — keeps the parent from holding the panel's
internals.

---

## 6. Algorithms worth understanding

### 6.1 The DAG-to-tree projection (decision D1)

Many specs have multiple `traces_to_*` parents. The plan picks the
**first** parent in the relevant array as the *canonical* parent;
everything else is *secondary*.

The per-layer rules (`spec-parser.ts`):

| Layer | Canonical comes from         | Secondary                                 |
|-------|------------------------------|-------------------------------------------|
| A     | —                            | —                                         |
| D     | `traces_to_aesthetics[0]`    | `traces_to_aesthetics[1..]`               |
| M     | `traces_to_dynamics[0]`      | `…[1..]` + all `traces_to_aesthetics`     |
| AST   | `traces_to_mechanics[0]`     | `…[1..]` + all `traces_to_aesthetics`     |
| TUNE  | `traces_to_mechanics[0]`     | `…[1..]` + dynamics + aesthetics          |
| LEVEL | — (parallel root)            | — (refs land in `outgoingRefSpecIds`)     |

The UI builds the visible tree from the canonical edges only and
draws "also serves N" chips for the rest.

### 6.2 Cost rollup — the no-double-count invariant

`services/cost-rollup.ts` computes `own` + `subtree` cents per spec.
Two rules:

1. `own[spec]` = sum of cost events with `billingCode === spec` in
   the current month (MTD).
2. `subtree[spec]` = `own[spec]` + sum of `subtree[child]` for every
   **canonical-parent** child only. Secondary parents never see the
   cost.

This guarantees that summing `subtree[root_A_specs]` equals
`total_attributed_cents`. Orphan events (`billingCode === null`)
contribute to the game total but never to any spec's rollup.

The Costs detail panel optionally narrows to a subtree via
`collectSubtreeSpecIds(root)` (DFS over canonical-parent edges); the
same data structure powers the drawer Costs tab and the chrome page.

### 6.3 The lens "keep ancestors visible" filter

When a user filters by `?layer=M`, the tree should still show
`AES-001 > DYN-001 > MEC-001`, not just the bare MEC nodes — otherwise
context evaporates. `applyLenses`:

1. Compute `matching` = nodes that pass every lens
2. Walk each match upward via `canonicalParentSpecId` collecting
   `ancestors`
3. `visible = matching ∪ ancestors`
4. `ancestorSpecIds` is returned separately so the tree can
   *force-expand* those rows regardless of user toggle state

`SpecTree` receives `visibleSpecIds` and `forceExpandedSpecIds` as
props and applies them at the rendering edge; the recursion stays
oblivious to filtering.

### 6.4 Asset-plan state derivation

`services/asset-plans-scan.ts` reads each `<asset-id>/` directory and
classifies it from on-disk shape only — no metadata file required:

```
no directory      → not listed
empty dir         → no-plan
plan files only   → planned
plan + output/    → in-progress
plan + output + .imported → imported
unreadable        → unknown
```

Plan files match `^[a-z0-9-]+\.v(\d+)\.plan\.md$`; the highest
version wins. This means `mda asset-plan generate` / `exec` /
`import` can write plain files and the UI reflects the state for
free.

---

## 7. Test strategy

Four layers, each with a different job.

### 7.1 Unit tests (`vitest`)

Every `*.ts` and `*.tsx` has a sibling `*.test.ts(x)`. Coverage is
gated per package at ≥ 80% lines / statements / branches / functions
in `vitest.config.ts`. The gate is enforced when CI runs
`pnpm test:coverage`.

Patterns:

- **Pure modules** (lens model, cost rollup, agent roster) test the
  function directly with constructed inputs
- **Services** (issues, approvals, …) test through their public API
  and assert side-effects on observable state (the next read)
- **Routes** use `supertest` against `createApp()` with stores reset
  in `beforeEach`
- **Components** use `@testing-library/react` querying by role /
  label, no deep snapshots, no implementation details

### 7.2 A11y tests (`vitest-axe`)

`src/test/a11y.test.tsx` renders every chrome-reachable surface and
runs `axe-core` against the DOM. Violations fail the test. The
`region` and `color-contrast` rules are disabled with rationale —
they false-positive in jsdom-isolated components and we cover them
via Lighthouse instead.

This caught — and the fixes are in the tree — four real issues:

- `SpecTree` used `aria-selected` on a div without a role
- `SettingsPanel` had tabs outside a tablist
- `OrgChartPanel` had a treeitem `<li>` outside a `role="group"` `<ul>`
- `GameCardGrid` overrode a `<button>`'s implicit role to `listitem`

### 7.3 End-to-end (`@playwright/test`)

`playwright.config.ts` boots the API server (with the fixture studio
registered via env) + the Vite dev server via Playwright's
`webServer` array. `e2e/smoke.spec.ts` exercises:

- Studio home → tree → deep-linked drawer → issue status edit →
  every chrome nav surface
- The seeded approvals queue
- Free-text lens filtering
- ⌘K command palette picking a spec by id

E2E is opt-in: developers run it locally, CI runs it as a separate
job. The fixture studio uses the bundled `__fixtures__/specs-virus-hunter`
tree so the test doesn't depend on any external state.

### 7.4 Performance (`@lhci/cli`)

`lighthouserc.json` runs Lighthouse against the production build
(`vite preview`) and asserts a desktop budget:

```
LCP        ≤ 2500 ms
TBT        ≤  200 ms
CLS        ≤  0.1
JS weight  ≤  600 KB
perf score ≥  0.85
a11y score ≥  0.9
```

The same a11y rules that `vitest-axe` skips in jsdom run for real
here (computed colors, layout-dependent contrast).

---

## 8. Live updates — end-to-end

```
[mutation in any store]
        │
        ▼
publishStudioEvent(event)            ← server (studio-events.ts)
        │
        ├─→ activity-log-store.ts → ring-buffer push
        └─→ studioEventsRouter → res.write("data: …\n\n")
                │
                ▼
        EventSource (UI, useStudioEvents)
                │
                ▼
        handleStudioEvent (App.tsx) → refetch the relevant hook(s)
                │
                ▼
        useSpecTree.refetch | useSpecNodeDetail.refetch | useApprovals.refetch | useActivity.refetch
```

Two non-obvious properties:

1. **Idempotent invalidation.** Refetch hooks bump an integer; calling
   them repeatedly during a burst of events causes one fetch per
   `useEffect` cycle, not one fetch per event.
2. **Fixture mode disables SSE.** `useStudioEvents({ enabled })` is
   false when the tree fell back to fixture data — there's no live
   server to subscribe to.

---

## 9. Extension points

### 9.1 Add a server route

1. Add the request / response shape to `@mda-studio/shared` as a zod
   schema + type, and ship a round-trip test
2. Build a service in `server/src/services/` with its own unit tests
3. Add the route file in `server/src/routes/` — thin handler, parses
   params + body, calls the service, returns the parsed shape
4. Mount it in `app.ts`
5. If it mutates, publish a `StudioEvent` after the store write

### 9.2 Add a UI surface

1. Build a `useThing` hook in `ui/src/hooks/` mirroring the existing
   hooks' shape (status / data / error / refetch / enabled)
2. Build the panel in `ui/src/components/<Thing>Panel.tsx`. Use
   existing tokens (`--mda-layer-*`, `--mda-status-*`) for colors
3. Add CSS to `ui/src/styles/app.css` (one section per panel — keep
   the file readable)
4. Wire `view=thing` in `App.tsx`'s body switch
5. Add `onOpenThing` / `Thing` button to `Chrome.tsx` and `App.tsx`
6. Add an entry to the a11y test (`src/test/a11y.test.tsx`)
7. (Optional) Extend the Playwright smoke spec

### 9.3 Add a lens

1. Extend `ActiveLenses` in `lib/lenses.ts` + `parseLenses` +
   `applyLensPatch` + the filtering predicate inside `applyLenses`
2. Add a chip case in `LensBar.tsx`
3. Add a clear-key in `App.tsx` `clearLens`
4. Update `lib/lenses.test.ts` and the `KeymapHelp` overlay
5. Update the operator guide and UI README lens tables

### 9.4 Add a status / layer

The MDA vocabulary is fixed in V1 (six layers; per-layer status
unions). To extend:

1. Add the value to `MDA_LAYERS` / `SPEC_STATUSES` /
   `STATUSES_BY_LAYER` in `shared/src/mda.ts`
2. Add a glyph + color token in the same file and the matching CSS
   variable in `ui/src/styles/tokens.css`
3. Add the prefix in `ID_PREFIX_TO_LAYER` and update
   `layerFromSpecId`
4. Update `spec-parser.ts` defaults if the new layer has a different
   default status
5. Run `pnpm typecheck` — exhaustive `switch` statements on the
   union will fail until handled

### 9.5 Add an SSE event type

1. Add the case to the union in `shared/src/studio-events.ts`
2. Publish it from the relevant service (`studio-events.ts`)
3. Handle it in `GameView.handleStudioEvent` — decide which queries
   to invalidate
4. Add to the activity-log writer if the event should also become a
   visible log row

---

## 10. Where the seams point next

### 10.1 Persistence

Every in-memory store has a method-shaped public API exactly so it
can be swapped for a Drizzle module. The migration plan:

1. Add the table to `packages/db/src/schema/`
2. Replace the store's `Map<...>` internals with `db.insert/select`
3. Leave the route file untouched; rerun the route's integration
   test against an embedded Postgres

Tables waiting in `system.md`:
- `spec_frontmatter_cache` (the spec-cache module)
- `issues`, `issue_comments`, `issue_work_products`
- `cost_events`
- `validator_runs`
- `approvals`
- `activity_log`

### 10.2 SSE → typed client

Today the client casts JSON to `StudioEvent`. A small codegen step
(or hand-written `studio-event-types.ts` in shared) could give the
publisher a typed `publish<T extends StudioEvent>(event: T)` overload
so an exhaustive `switch` is unmissable on the UI side.

### 10.3 Persistent expansion + lens presets

Tree expansion already persists in `localStorage`. Saved lens presets
were intentionally deferred (plan §18) — URL-only for V1. The hook
boundary in `lib/lenses.ts` is the right place to add named-preset
read / write.

### 10.4 Approvals POST

GET + PATCH are wired today. A POST route to create approvals on
demand (rather than via fixture seed) is straightforward — the
service already exposes `createApproval`. Add the route, the wire
schema, and the SSE emission.

---

## 11. File-by-file map

For the impatient. Read these in order to fully cover the system:

```
shared/src/mda.ts                        # MDA vocabulary
shared/src/spec-tree.ts                  # tree wire shapes
shared/src/spec-node-detail.ts           # drawer wire shape
shared/src/issues.ts                     # issue state machine
shared/src/costs.ts + costs-detail.ts    # cost event + chrome page shapes
shared/src/studio-events.ts              # SSE union
shared/src/{approvals,activity,agents,asset-plans}.ts

server/src/app.ts                        # route mounting
server/src/index.ts                      # env-driven boot + seed
server/src/services/spec-parser.ts       # frontmatter → ParsedSpec
server/src/services/spec-cache.ts        # filesystem walk + cache
server/src/services/spec-tree-assembly.ts
server/src/services/cost-rollup.ts       # the DAG invariant lives here
server/src/services/costs-detail.ts
server/src/services/agent-roster.ts
server/src/services/asset-plans-scan.ts
server/src/services/issues-store.ts
server/src/services/approvals-store.ts
server/src/services/activity-log-store.ts
server/src/services/studio-events.ts
server/src/services/fixture-seed.ts
server/src/routes/spec-tree.ts
server/src/routes/secondary-surfaces.ts  # costs + agents + asset-plans
server/src/routes/{issues,cost-events,approvals,activity,validator-runs,studio-events}.ts

ui/src/App.tsx                           # composition + URL routing
ui/src/lib/lenses.ts                     # pure lens model
ui/src/hooks/useSpecTree.ts              # canonical hook shape
ui/src/hooks/useStudioEvents.ts          # SSE consumer
ui/src/components/SpecTree.tsx           # the tree
ui/src/components/NodeDrawer.tsx         # the drawer
ui/src/components/Chrome.tsx             # the top bar
ui/src/components/{Costs,OrgChart,AssetPlans,Settings,Approvals,Activity}*.tsx
ui/src/test/a11y.test.tsx                # axe matrix
ui/e2e/smoke.spec.ts                     # Playwright smoke
ui/playwright.config.ts + lighthouserc.json
```

If something in this doc seems wrong, the file is the source of
truth — start there.
