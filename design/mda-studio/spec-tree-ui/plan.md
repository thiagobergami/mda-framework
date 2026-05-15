---
id: PLAN-FEAT-spec-tree-ui
parent: design/mda-studio/plan.md
spec: design/mda-studio/spec-tree-ui/spec.md  # to be authored alongside this plan
title: Implementation Plan — Spec-Tree-First UI for MDA Studio
status: draft
owner: thiago
created: 2026-05-12
branch: feature/mda-studio
format: spec-driven-development (plan.md)
---

# Implementation Plan — Spec-Tree-First UI

> Companion to the parent [`mda-studio/plan.md`](../plan.md) and the architecture
> blueprint at [`system.md`](../../../system.md). This plan **replaces** the UI
> portion of `system.md §14` and the UI steps inside the parent plan's M2–M6.
> Backend, data model, adapters, costs, and governance are **unchanged** — only
> the operator-facing surface is reorganized.
>
> Mental model in one line: **the MDA tree is the application; issues, agents,
> and costs are properties of nodes on that tree.**

---

## 1. Context

`system.md §14` describes a Linear/Paperclip-style board: top-level routes for
Issues, Agents, Costs, Approvals, Activity, and a side-panel "Why does this
issue exist?" trace. That layout is functional but generic — the MDA causal
trace (Aesthetic → Dynamic → Mechanic → Asset → Tuning → Level) is the most
distinctive feature of the framework and yet only shows up as a secondary
panel.

This plan inverts that. The **MDA tree** becomes the home screen and the
primary navigation surface. An "issue" is no longer a first-class object the
user navigates to — it is a status badge on the spec node it implements.
Agents are filterable lenses over the tree. Costs roll up the tree. Approvals,
activity, and runs are reachable from any node and from the chrome.

This does not change `spec.md` functional requirements; it changes how those
requirements are surfaced.

### Files this plan touches

| Area | What changes |
|---|---|
| `mda-studio/ui/` | New: Vite + React app. Replaces the unbuilt UI implied by `system.md §14`. |
| `mda-studio/server/src/routes/` | Adds `/games/:id/spec-tree` and node-detail endpoints. |
| `mda-studio/packages/shared/` | Adds tree-node Zod schemas + status-glyph constants. |
| `mda-studio/packages/db/` | No schema changes for V1 — uses existing `issues.spec_id`, `issues.mda_layer`, `cost_events.billing_code`. |
| `design/mda-studio/spec.md §5.18` | Section to be amended once this plan is approved. |
| `system.md §14` | Section to be replaced with a pointer to this plan. |

---

## 2. Goals & non-goals

### 2.1 Goals

- **G1.** The home screen for any game is its MDA spec tree, not an issue list.
- **G2.** Every node in the tree shows: spec id + title, layer glyph, status
  glyph, active issue with assignee, MTD cost rolled up over its subtree,
  validator warning count.
- **G3.** Selecting a node opens a right-hand drawer with full spec content,
  active and historical issues, comments, work products, cost detail, and a
  literal breadcrumb trace from the node up to the studio mission.
- **G4.** A spec node remains visible and navigable even if it has no issues —
  the tree reflects the *design state*, not the *work queue*.
- **G5.** Filters (lenses) compose: e.g. "show only nodes assigned to
  `@mech-1` with status `in_review` under AES-001".
- **G6.** Multi-parent traces (one MEC serving multiple DYN/AES) are
  representable without duplicating data.
- **G7.** Secondary surfaces (Approvals, Activity, Costs detail, Org tree,
  Asset-plan executor, Routines) remain accessible from the chrome and from
  any contextual node action.
- **G8.** The UI is keyboard-navigable end-to-end (arrow keys to move in the
  tree, `/` to focus filter, `?` for keymap).

### 2.2 Non-goals (V1)

- **NG-1.** No drag-and-drop reorganization of the tree. Traceability is the
  source of truth; the UI renders it.
- **NG-2.** No realtime collaborative cursors. Polling + SSE for live status
  is enough.
- **NG-3.** No 3D / spatial metaphor. Tree is a 2D outline with disclosure
  triangles.
- **NG-4.** No in-UI spec authoring beyond what `mda new` produces. Authoring
  remains a CLI/agent path; the UI can *trigger* `mda new` through an action.
- **NG-5.** No mobile layout. Operator app, desktop-first.

---

## 3. Decisions made up front

These pin down ambiguity before phasing starts. Each links to the rationale
captured in §17.

| # | Decision | Choice |
|---|---|---|
| D1 | Tree topology for multi-parent specs | DAG-with-primary-parent. Each spec has one canonical position determined by its first declared parent in `traceability.md`. Secondary parents render as "also serves" chips on the node and as ghost-links when the node is selected. |
| D2 | Studio home (before game pick) | Game-card grid. Each card shows concept summary, primary aesthetic, MTD spend, agent count, count of open `recovery`-origin issues. |
| D3 | Tree expansion default | Concept + all `A` nodes expanded; `D`/`M`/`AST`/`TUNE` collapsed. Persist per-user expansion state in localStorage keyed by `gameId`. |
| D4 | Levels in the tree | `LEVEL` nodes are top-level siblings of the `A` subtrees (parallel root branch), because they compose multiple AES/DYN/MEC. Each level shows its `references:` block as outgoing arrows. |
| D5 | Status glyph vocabulary | Map directly from spec frontmatter `status` field; do **not** invent new states. See §11. |
| D6 | Cost rollup | Computed at read time via recursive SQL over `cost_events.billing_code = spec_id` plus walk down the traceability DAG. Cached per (game, day) in-memory with 60s TTL. Materialized table only if p95 > 250 ms. |
| D7 | API granularity | One bulk `GET /games/:id/spec-tree` returns the full tree shape + per-node summary stats. Heavy detail (issue thread, comments, work products) loaded per-node via existing routes when the drawer opens. |
| D8 | UI framework | React 18 + Vite + TanStack Router + TanStack Query + Tailwind + shadcn/ui (matches parent plan §1). |
| D9 | Empty tree | A game with only a concept doc shows just the Concept node + an inline CTA: "Author your first aesthetic (`mda new aes ...`)". |

---

## 4. Information architecture

### 4.1 Node anatomy

Every node carries the same shape:

```
LAYER_GLYPH  SPEC_ID  TITLE                STATUS  COST_ROLLUP  ASSIGNEE  WARN?
  │            │       │                     │       │           │         │
  │            │       │                     │       │           │         └─ ⚠ N
  │            │       │                     │       │           └─ @agent
  │            │       │                     │       └─ $12.40 (MTD subtree)
  │            │       │                     └─ ◌◐●▣ glyph
  │            │       └─ from spec frontmatter `title`
  │            └─ canonical id (MEC-001, AES-003, etc.)
  └─ A | D | M | AST | TUNE | LEVEL
```

### 4.2 Tree shape (worked example)

```
CONCEPT  virus-hunter
├── A  AES-001  Fellowship under pressure       ● frozen
│   ├── D  DYN-001  Co-op revive loop           ◐ draft
│   │   ├── M  MEC-001  Revive interaction      ● impl    @mech-1
│   │   │   └── AST  AST-007  Revive VFX        ◌ concept
│   │   └── M  MEC-002  Downed state            ◐ draft   @mech-1
│   └── D  DYN-002  Threat escalation           ● frozen
│       └── M  MEC-003  MDALogger               ● impl    (also serves AES-002)
├── A  AES-002  Discovery (puzzle rooms)        ◐ draft
│   └── …
└── LEVEL  tutorial-lab                         ▣ blockout
    refs → AES-001, DYN-001, MEC-001
```

### 4.3 DAG handling (decision D1 expanded)

Multi-parent links are common (MEC-003 serves several DYN; one AST may back
several MEC). To keep the visual a tree:

- **Canonical parent** — first parent listed in the spec's `traceability:`
  frontmatter block. Node renders under that parent.
- **Secondary parents** — rendered as inline "also serves" chips on the node
  row. Hovering a chip dims everything in the tree *except* the secondary
  parent's subtree path.
- **Selection mode** — when a node is selected, ghost-links draw to all its
  secondary parents and to its outgoing references (for LEVEL nodes). This is
  the §14 "Why does this issue exist?" trace, but applied to nodes, not
  issues.

### 4.4 What is *not* in the tree

These remain first-class but reachable from the chrome / contextual menus,
not as tree nodes:

- Agents (org tree is its own view — a tab in the chrome)
- Approvals (chrome badge + dedicated page)
- Activity log (chrome → "Activity" slide-out)
- Routines (Settings → Routines)
- Costs detail (chrome → "Costs", linked from any cost chip on a node)
- Studio-level secrets / plugins (Settings)

---

## 5. Route map

```
/                                              studio picker (if multi) or redirect
/studios/:sid                                  studio home — game-card grid
/studios/:sid/games/new                        new game form (creates concept stub)
/studios/:sid/games/:gid                       SPEC TREE (home for a game)
/studios/:sid/games/:gid?node=AES-001          tree + drawer open on AES-001
/studios/:sid/games/:gid?node=MEC-001&tab=runs tree + drawer on tab
/studios/:sid/games/:gid/lens/agent/:agentId   filtered tree (agent lens)
/studios/:sid/games/:gid/lens/status/:status   filtered tree (status lens)
/studios/:sid/games/:gid/lens/layer/:layer     filtered tree (single-layer view)
/studios/:sid/games/:gid/org                   org chart tab (chrome switch)
/studios/:sid/games/:gid/approvals             approvals queue for this game
/studios/:sid/games/:gid/activity              activity slide-out (deep link)
/studios/:sid/games/:gid/costs                 costs detail page
/studios/:sid/games/:gid/asset-plans           asset-plan executor states
/studios/:sid/settings                         studio settings (secrets, plugins, routines)
```

Drawer state is in the query string, not the path, so deep links share
cleanly and back/forward work the way operators expect.

---

## 6. UI components catalog

| Component | Purpose | Notes |
|---|---|---|
| `Chrome` | Top bar: studio selector, game selector, lens chips, search, approval badge, command-K | Fixed header. Approval badge pulses when count > 0. |
| `GameCardGrid` | Studio home grid | Each card opens `/studios/:sid/games/:gid`. |
| `SpecTree` | Virtualized outline tree | Uses `@tanstack/react-virtual` for >500 node trees. |
| `SpecTreeNode` | One row (recursive) | Memoized; renders layer + status glyph + chips + cost. |
| `LayerGlyph` | One per layer (`A`/`D`/`M`/`AST`/`TUNE`/`LEVEL`) | Single-char monospace badge, color-coded. |
| `StatusGlyph` | Maps spec status → glyph | See §11. |
| `CostChip` | "$12.40" with MTD tooltip | Click → costs detail filtered to subtree. |
| `AssigneeChip` | "@mech-1" | Click → opens agent lens. |
| `WarnBadge` | "⚠ 3" | Click → opens validator-warning list for the node. |
| `NodeDrawer` | Right-side panel, ~520px | Tabs: Spec • Issues • Comments • Work products • Costs • Trace. |
| `TraceBreadcrumb` | "studio → AES-001 → DYN-001 → MEC-001" | Always shown atop the drawer; clickable segments. |
| `IssueMiniList` | Compact issue rows for the selected node | Inline status edits; click → expanded issue view modal. |
| `LensBar` | Active filters (chips) below chrome | Each chip removable with ×; multi-select. |
| `CommandPalette` | ⌘K — fuzzy search specs, issues, agents | Triggers from chrome. |
| `KeymapHelp` | `?` overlay | One source-of-truth for shortcuts. |
| `RunStatusDot` | Live indicator on `AssigneeChip` | Green = running, amber = paused, red = error, grey = idle. |
| `ApprovalSheet` | Modal for pending approvals | Reused on the approvals page and from chrome badge. |

All visual components live under `mda-studio/ui/src/components/`; route-level
"screens" live under `mda-studio/ui/src/routes/` and assemble these.

---

## 7. API additions

These are *additive* to the §9 API surface in `system.md`. Naming follows
existing conventions.

### 7.1 New endpoints

```
GET /api/games/:gameId/spec-tree
GET /api/games/:gameId/spec-tree/node/:specId
GET /api/games/:gameId/costs/by-spec               # subtree cost rollup
GET /api/games/:gameId/validator/warnings
```

### 7.2 `GET /api/games/:gameId/spec-tree` payload

```ts
type SpecTreeResponse = {
  gameId: string;
  generatedAt: string;       // ISO timestamp
  concept: {
    path: string;
    primaryAesthetic: string;
    title: string;
  };
  nodes: SpecTreeNode[];     // flat list; tree assembled client-side via parentId
};

type SpecTreeNode = {
  specId: string;            // "AES-001"
  layer: "A" | "D" | "M" | "AST" | "TUNE" | "LEVEL";
  title: string;
  status: "concept" | "draft" | "frozen" | "impl" | "blockout" | "playable" | "polished";
  canonicalParentSpecId: string | null;   // null only for root A nodes and Concept
  secondaryParentSpecIds: string[];       // "also serves" chips
  outgoingRefSpecIds: string[];           // for LEVEL nodes
  activeIssueId: string | null;
  activeIssueStatus: IssueStatus | null;
  assigneeAgentId: string | null;
  assigneeAgentHandle: string | null;
  runStatus: "idle" | "running" | "paused" | "error" | null;
  costMtdCents: number;        // own cost only
  costMtdSubtreeCents: number; // rolled up over canonical-parent subtree
  warningCount: number;
};
```

### 7.3 `GET /api/games/:gameId/spec-tree/node/:specId` payload

Drawer-detail bundle so opening a node is one round-trip:

```ts
type SpecNodeDetail = {
  node: SpecTreeNode;
  spec: {
    path: string;
    frontmatter: Record<string, unknown>;
    body: string;            // raw markdown; UI renders
  };
  issues: IssueSummary[];    // all issues with this spec_id, newest first
  recentComments: CommentSummary[];   // newest 10 across all linked issues
  workProducts: WorkProductSummary[]; // newest 10
  costsMtd: {
    own: number;
    subtree: number;
    byBillingCode: { billingCode: string; cents: number }[];
  };
  warnings: ValidatorWarning[];
  trace: {
    upward: { specId: string; layer: string; title: string }[];   // for breadcrumb
    secondaryParents: { specId: string; layer: string; title: string }[];
    outgoingRefs: { specId: string; layer: string; title: string }[];
  };
};
```

### 7.4 Server-side composition

- Tree shape: SELECT from `issues` joined with parsed spec frontmatter cache.
  The parser cache (`spec_frontmatter_cache`) is populated by the `mda validate`
  routine and invalidated on git push webhook.
- Cost rollup: recursive CTE on `cost_events` keyed by `billing_code` walking
  the canonical-parent DAG. Result memoized per `(game_id, date_trunc('day'))`
  with a 60-second TTL in process memory.
- Validator warnings: read from the latest `mda validate --json` artifact
  emitted by the validator routine into `validator_runs.payload`.

### 7.5 Caching & ETags

- `spec-tree` endpoint returns an `ETag: <sha256(payload)>` and supports
  `If-None-Match`. Client uses TanStack Query with `staleTime: 30s`.
- Drawer detail endpoint is **not** cached at the HTTP layer — its purpose is
  fresh per-click data.

---

## 8. Data model implications

V1 needs no destructive schema change. Two small additions:

| Table | New column / table | Why |
|---|---|---|
| `spec_frontmatter_cache` (NEW) | `(studio_id, game_id, spec_id, layer, title, status, canonical_parent_spec_id, secondary_parent_spec_ids, outgoing_ref_spec_ids, source_path, parsed_at)` | Avoids re-parsing every spec on every tree fetch. Populated by the validator routine and on direct `mda new`. |
| `validator_runs` (already in parent plan) | `payload jsonb` | Stores the latest `mda validate --json` output so warning counts are readable in one query. |
| `cost_events` | (no change) | Already has `billing_code text?` per `system.md §6.2`. |
| `issues` | (no change) | Already has `spec_id text?` and `mda_layer text?`. |

Indexes added:

```
spec_frontmatter_cache(game_id, layer)
spec_frontmatter_cache(game_id, canonical_parent_spec_id)
cost_events(billing_code, occurred_at)
```

The frontmatter cache is read-only state derived from `specs/` content. The
canonical source of truth remains the markdown files. The cache is rebuilt
in full when `mda validate` runs on git push.

---

## 9. State management

| Layer | Choice | Notes |
|---|---|---|
| Server cache | TanStack Query | One `useQuery(["spec-tree", gameId])` powers the tree. |
| URL state | TanStack Router | `node`, `tab`, lens filters live in search params. |
| Local UI state | React useState + `zustand` only for cross-component (lens bar + tree filter) | No global state for fetched data. |
| Expansion state | localStorage, keyed `mda:tree-expansion:<gameId>` | Per-user, per-game. |
| Realtime | Server-Sent Events on `/api/studios/:sid/events` | Tree query invalidates on `node-changed`, `cost-event`, `validator-run-completed`, `issue-status-changed`. |

### 9.1 SSE event shapes

```ts
type StudioEvent =
  | { type: "node-changed"; gameId: string; specId: string }
  | { type: "issue-status-changed"; gameId: string; specId: string; issueId: string }
  | { type: "cost-event"; gameId: string; specId: string | null }
  | { type: "validator-run-completed"; gameId: string }
  | { type: "approval-changed"; studioId: string; approvalId: string };
```

Client handler:
- `node-changed`, `issue-status-changed`, `cost-event` → invalidate
  `["spec-tree", gameId]` and (if open) `["spec-node", gameId, specId]`.
- `validator-run-completed` → invalidate warnings.
- `approval-changed` → invalidate the chrome approval badge query.

---

## 10. Status glyph system

Single source of truth. Defined in `@mda-studio/shared/glyphs.ts`:

| Layer | Status (spec frontmatter) | Glyph | Color token |
|---|---|---|---|
| A / D | `draft` | ◐ | `--mda-status-draft` (amber) |
| A / D | `frozen` | ● | `--mda-status-frozen` (green) |
| M | `draft` | ◐ | amber |
| M | `impl` | ● | green |
| AST | `concept` | ◌ | grey |
| AST | `placeholder` | ◐ | amber |
| AST | `final` | ● | green |
| TUNE | `draft` | ◐ | amber |
| TUNE | `live` | ● | green |
| LEVEL | `blockout` | ▣ | blue |
| LEVEL | `playable` | ◧ | violet |
| LEVEL | `polished` | ◆ | green |
| any | validation fails | overlay `!` ring | red |

The status glyph never invents states; it maps from values that already exist
in `_schema.md` files. If a spec uses an unknown status, render glyph `?` with
a tooltip and write an `activity_log` warning — better than guessing.

### 10.1 Layer color tokens

| Layer | Token |
|---|---|
| A | `--mda-layer-a` (warm orange) |
| D | `--mda-layer-d` (cyan) |
| M | `--mda-layer-m` (indigo) |
| AST | `--mda-layer-ast` (rose) |
| TUNE | `--mda-layer-tune` (slate) |
| LEVEL | `--mda-layer-level` (lime) |

Tokens are CSS variables so a future theme switch is one file.

---

## 11. Filtering / lenses

Lenses compose; each adds a chip to the `LensBar`. The tree re-renders showing
only nodes that match *all* active lenses **plus their ancestors** (so context
never collapses).

| Lens | URL form | Example |
|---|---|---|
| Agent | `/lens/agent/:agentId` | Show nodes assigned to `@mech-1` |
| Status | `/lens/status/:status` | Show nodes with `draft` status |
| Layer | `/lens/layer/:layer` | Show only AES nodes (other layers collapse) |
| Warnings | `?lens=warnings` | Show nodes with `warningCount > 0` |
| Aesthetic target | `?lens=aesthetic:fellowship` | Show subtrees under AES nodes tagged Fellowship |
| Free-text | `?q=…` | Title / spec id / agent handle substring match |

Lenses combine with logical AND. A "match" includes the matched node's
ancestors up to the Concept root so the path is always visible.

---

## 12. Performance budget

- p95 `spec-tree` payload size ≤ 80 KB for trees up to 500 nodes (the typical
  V1 ceiling — a finished game has dozens of AES/DYN/MEC, not hundreds).
- p95 tree render to first interactive ≤ 250 ms on a 4-year-old laptop.
- Drawer detail open ≤ 200 ms (cached) / ≤ 600 ms (cold).
- SSE event → visible UI update ≤ 500 ms.

If any of these regress, materialize `spec_frontmatter_cache` rollups into a
denormalized `spec_tree_snapshot` table refreshed by the validator routine.

---

## 13. Accessibility

- All interactive nodes are buttons (`role="treeitem"` inside
  `role="tree"`); arrow keys navigate per WAI-ARIA tree pattern.
- Status and layer are never conveyed by color alone — the glyph is also a
  shape and a `title` attribute is read by screen readers.
- Drawer is a focus-trapping dialog (`role="dialog" aria-modal="true"`).
- Command palette obeys `aria-activedescendant`.

---

## 14. Phases (this feature)

Each phase has one shippable output; each opens with a failing test (per the
parent plan's C10 / C11 constitution).

### Phase U1 — Static prototype  *(~3 days)*

**Goal.** Visual fidelity, no API.

- Scaffold `mda-studio/ui/` Vite + React app under the existing workspace
- Tailwind + shadcn/ui set up; design tokens for layers + statuses
- Components: `LayerGlyph`, `StatusGlyph`, `SpecTreeNode`, `SpecTree`,
  `NodeDrawer`, `TraceBreadcrumb`, `Chrome`, `GameCardGrid`
- Hard-coded fixture for one game (`virus-hunter`) with ~15 nodes
- Storybook entries for each component
- Vitest snapshot tests on `SpecTree` with fixture
- Exit: open `pnpm dev`, see the home from §4.2 rendered, click a node →
  drawer opens with markdown spec body

### Phase U2 — Tree API + frontmatter cache  *(~4 days)*

**Goal.** Real tree from real specs.

- Drizzle migration: `spec_frontmatter_cache`
- `packages/server/src/services/spec-parser.ts` — parses one spec file's
  frontmatter, derives layer, parents, refs, status
- `packages/server/src/services/spec-cache.ts` — rebuilds cache for a game by
  walking `specs/` of the game workspace
- `GET /api/games/:gameId/spec-tree` route + zod schema in `@mda-studio/shared`
- Wire UI fetch via TanStack Query
- Vitest unit tests: parser handles each `_schema.md` shape; cache rebuild is
  idempotent; tree response payload matches schema for fixture game
- Exit: a real game directory renders its real tree

### Phase U3 — Drawer detail + issue mini-list  *(~3 days)*

**Goal.** Click a node → see real work.

- `GET /api/games/:gameId/spec-tree/node/:specId` route
- `IssueMiniList`, drawer tabs (Spec / Issues / Comments / Work products /
  Costs / Trace)
- Markdown rendering with `react-markdown` + remark-gfm
- Status edit on issues from inside the drawer (PATCH `/issues/:id`)
- Vitest + Playwright e2e: open drawer → edit status → tree row updates
- Exit: drawer shows issue list, assignee chip, run-status dot

### Phase U4 — Cost rollup + warning badges  *(~3 days)*

**Goal.** Numbers on every node.

- Recursive CTE for subtree cost rollup
- `cost_events.billing_code` is required to be a spec id (lint in cost
  ingestion route — reject events without one but accept `null` with WARN)
- `WarnBadge` consumes the latest `validator_runs.payload`
- Vitest: rollup correctness across DAG (a MEC with two parents counts under
  the canonical only — confirm not double-counted)
- Exit: each node row shows `$X.XX` and `⚠ N` reflecting real data

### Phase U5 — Lenses + command palette  *(~3 days)*

**Goal.** Filtering and search.

- `LensBar` + URL param state; agent / status / layer / warnings / free-text
- `CommandPalette` (⌘K) — fuzzy search over `spec-tree` nodes, agents, issues
- Tree filter preserves ancestor visibility
- Keyboard nav passes WAI-ARIA tree pattern test
- Exit: from the chrome, `/` focuses search, type "AES-001" → tree filters

### Phase U6 — Live updates via SSE  *(~2 days)*

**Goal.** No reloads.

- `GET /api/studios/:sid/events` SSE endpoint
- Event publisher hooks in: activity-log writer, cost-event ingestion,
  validator routine completion, approval state transitions
- Client SSE consumer + query invalidation
- Exit: trigger `mda validate` in CLI → UI shows new warning count without
  refresh

### Phase U7 — Secondary surfaces & polish  *(~4 days)*

**Goal.** Cover everything chrome promises.

- Studio home `GameCardGrid`
- Approvals queue page + chrome badge
- Activity slide-out
- Costs detail page (deep-link from `CostChip`)
- Asset-plan executor states (read-only list for V1)
- Org chart tab (simple report-to indentation; not interactive)
- Empty-state CTAs (decision D9)
- Settings shell (secrets/plugins/routines pages stubbed)
- Exit: top-of-chrome navigation reaches every surface; nothing dead-ends

### Phase U8 — Hardening  *(~3 days)*

- Playwright e2e suite covering: open game → drawer → status change →
  cost change → approval flow → lens filter → command palette → SSE update
- Lighthouse perf budget check
- Coverage gate ≥ 80% per UI package
- Tab/focus order audit; screen-reader smoke pass
- README in `mda-studio/ui/` with run/build/test commands

**Total scope: ~25 working days for one engineer.** Maps onto and partially
replaces parent plan M2–M6 UI portions. Backend work (auth, adapters, agents,
costs, MDA routes) proceeds in parallel and is the gating path for U2–U7
real-data integration.

---

## 15. Test strategy

Inherits the parent plan §6 (TDD, ≥80% coverage). UI-specific notes:

- **Unit tests** colocated as `*.test.tsx` next to components. Vitest +
  React Testing Library. No deep rendering snapshots — assert on roles and
  text.
- **API contract tests** in `packages/shared/__tests__/` verify zod schemas
  round-trip; both server and UI import from the same package so drift fails
  the build.
- **Integration tests** in `server/src/routes/__tests__/spec-tree.test.ts`
  spin up Express + embedded Postgres + a fixture spec tree, assert the full
  `SpecTreeResponse` shape, and assert ETag behavior.
- **E2E** Playwright runs against the dev server with a seeded fixture
  studio (one game, ~15 specs). Suite is opt-in (`pnpm test:e2e`) per parent
  C8 — release CI only.
- **Accessibility** — `vitest-axe` on tree, drawer, command palette,
  approvals modal. Fail the build on violations.

---

## 16. Risks & mitigations

| # | Risk | Mitigation |
|---|---|---|
| R1 | DAG with many secondary parents becomes visually noisy | Default to ≤ 2 chips visible; "+N" overflow that opens a popover. |
| R2 | Frontmatter parser drifts from `_schema.md` | Parser is driven by zod schemas in `@mda-studio/shared`; every `_schema.md` gets a fixture test. |
| R3 | Cost rollup queries get slow at scale | TTL cache + materialize-when-needed escape hatch (D6). |
| R4 | LEVEL nodes pollute the root | Separate top-level branch with its own collapse state; can be hidden via lens. |
| R5 | Hidden state in localStorage confuses operators on a new machine | Always include a "Reset view" action in chrome; localStorage keys versioned. |
| R6 | UI built before backend exists | Phase U1 uses fixture; U2+ depend on parent plan M1 (DB) + a small fixture migration. UI development can run a full week ahead of the corresponding server phases. |
| R7 | Operator wants a flat issue list anyway | Provide a `/lens/layer/M` view (single-layer); list-view is one URL away without redesigning the home. |
| R8 | "Why does this issue exist?" trace dilutes when applied to nodes | The trace breadcrumb remains; node-level trace renders ghost-links *and* a textual sentence under the breadcrumb ("This MEC serves DYN-001 which targets AES-001 Fellowship — the game's primary aesthetic"). |

---

## 17. Open questions

| # | Question | Resolution path |
|---|---|---|
| OQ1 | Should the tree show *all* statuses or hide `cancelled` by default? | Try hidden-by-default behind a lens toggle; revisit after first operator session. |
| OQ2 | Should LEVEL nodes appear under their primary referenced AES instead of as a parallel root? | A/B during U7. Parallel-root is simpler; AES-rooted is more "narrative". |
| OQ3 | Do we surface `TUNE` nodes as children of their parameterized MEC, or as a separate parallel branch? | Spec children for V1 (per traceability conventions); reconsider if TUNE counts explode. |
| OQ4 | Drawer width fixed or resizable? | Fixed (520 px) for V1; resize handle is a Phase U8 stretch. |
| OQ5 | Should command palette also trigger MDA CLI actions (`mda new ...`)? | Stretch in U7. Behind a permission flag. |
| OQ6 | How do we visualize a spec that exists in `specs/` but has no parent traceability link (orphan)? | Pin to a top-level "Unlinked" branch; emit a validator warning. |

---

## 18. Out of scope (post-V1)

- Drag-and-drop reorganization of the tree (NG-1).
- Realtime cursors / multi-operator presence.
- Inline spec authoring beyond triggering `mda new`.
- Mobile / responsive layout below 1024 px.
- Theming beyond light/dark.
- Custom layer types (the six MDA layers are fixed in V1).
- Saved lens presets across sessions (V1 keeps URL-driven only).

---

## 19. Acceptance: when is this feature "done"?

All of the following must be true:

1. The home for any game is its MDA spec tree, with at least 100 nodes
   rendering at ≤ 250 ms p95.
2. Every node shows layer glyph, status glyph, MTD subtree cost, assignee (if
   any), warning badge (if any).
3. Clicking a node opens a drawer with spec content, issues, comments,
   work products, cost detail, and an upward trace breadcrumb.
4. Lenses for agent / status / layer / warnings / free-text compose and
   preserve ancestor visibility.
5. SSE updates propagate without page refresh.
6. Approvals, Activity, Costs detail, Org chart, Asset-plan executor, and
   Settings are reachable from chrome and don't dead-end.
7. WAI-ARIA tree pattern conformance verified by `vitest-axe`.
8. Per-package coverage ≥ 80% in `mda-studio/ui/` and the new server routes.
9. `system.md §14` updated to point at this plan; `spec.md §5.18` reconciled.

---

*This plan supersedes `system.md §14` for the UI build. Backend, data model,
adapters, and governance flows in `system.md §§1–13, 15–21` remain
authoritative.*
