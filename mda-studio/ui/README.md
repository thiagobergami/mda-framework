# @mda-studio/ui

Spec-tree-first operator UI for MDA Studio. Implements Phase **U1** of
[`design/mda-studio/spec-tree-ui/plan.md`](../../design/mda-studio/spec-tree-ui/plan.md):
the static prototype, with a fixture-backed Virus Hunter game tree.

## Run

```bash
# from mda-studio/
pnpm install
pnpm --filter @mda-studio/ui dev
# → http://127.0.0.1:3101
```

## What you see

1. **Studio home** — a grid of game cards. Click *Virus Hunter*.
2. **Spec tree** — the MDA tree (Concept → A → D → M / AST / TUNE, plus a
   parallel LEVEL branch). Each row shows layer + status glyphs, assignee with
   live run dot, MTD subtree cost, and validator warning badge.
3. **Node drawer** — click any row. Six tabs:
   `Spec · Issues · Comments · Work products · Costs · Trace`.
   Issues / Comments / Work products are stubbed pending Phase U3.
   The breadcrumb at the top is the "why does this exist?" trace.

## Layout

```
src/
├── App.tsx                       # shell: chrome + (studio home | game view)
├── main.tsx                      # React entry
├── components/
│   ├── Chrome.tsx                # top bar: selectors + approval badge
│   ├── GameCardGrid.tsx          # studio home cards
│   ├── SpecTree.tsx              # recursive ARIA tree
│   ├── SpecTreeNode.tsx          # (inlined in SpecTree.tsx)
│   ├── NodeDrawer.tsx            # right-side detail panel + tabs
│   ├── TraceBreadcrumb.tsx       # "studio / AES-001 / DYN-001 / MEC-001"
│   ├── LayerGlyph.tsx            # A / D / M / AST / TUNE / LEVEL badges
│   ├── StatusGlyph.tsx           # ◌ ◐ ● ▣ ◧ ◆ — maps spec status
│   ├── CostChip.tsx              # MTD subtree cents w/ tooltip
│   ├── AssigneeChip.tsx          # @handle + run-status dot
│   ├── WarnBadge.tsx             # ⚠ N (hidden if 0)
│   └── spec-tree-utils.ts        # buildSpecTree, upwardTrace
├── fixtures/
│   └── virus-hunter.ts           # SpecTreeResponse fixture (≈10 nodes)
├── styles/
│   ├── tokens.css                # CSS variables per plan §10
│   └── app.css                   # layout + component CSS
└── test/setup.ts                 # @testing-library/jest-dom registration
```

## Test

```bash
pnpm test                # vitest + coverage (gate ≥80% lines/statements/branches/functions)
pnpm test:watch          # interactive
pnpm typecheck

# Phase U8 hardening
pnpm test:e2e:install    # download chromium once (Playwright)
pnpm test:e2e            # boot server+UI and run the smoke flow
pnpm test:perf           # lighthouse-ci against the vite preview build
```

A11y is checked inline via `vitest-axe` in `src/test/a11y.test.tsx` against
every chrome-reachable surface (tree, drawer, command palette, costs,
approvals, org chart, asset plans, settings, keymap help).

## Status

### Phase U1 — static prototype ✅
- Workspace scaffold + design tokens
- Shared MDA types (layers, statuses, glyphs) in `@mda-studio/shared`
- `SpecTreeNode` zod schema + `GameCard` shape
- Virus Hunter fixture matching plan §4.2
- All core presentational components
- Recursive `SpecTree` with ARIA `tree` / `treeitem` roles
- `NodeDrawer` with 6 tabs and trace breadcrumb
- `App` composition: home → tree → drawer

### Phase U2 — real tree from real specs ✅
- `@mda-studio/server` `services/spec-parser.ts` — frontmatter → `ParsedSpec`
- `@mda-studio/server` `services/spec-cache.ts` — in-memory cache per game
- `@mda-studio/server` `services/spec-tree-assembly.ts` — cache → `SpecTreeResponse`
- `GET  /api/games/:gameId/spec-tree` and `POST /api/games/:gameId/spec-tree/refresh`
- UI `useSpecTree` hook with fixture fallback + source badge
- Vite proxy `/api → 127.0.0.1:3100`
- Boot-time game registration via `MDA_STUDIO_GAME_*` env vars

### Phase U3 — drawer detail + issue mini-list ✅
- Shared schemas: `IssueSummary`, `CommentSummary`, `WorkProductSummary`,
  `ValidatorWarning`, `SpecNodeDetail`, plus the issue status state machine
- `@mda-studio/server` `services/issues-store.ts` — in-memory CRUD with
  state-machine-guarded transitions
- `@mda-studio/server` `services/spec-body-loader.ts` — read frontmatter + body
- `@mda-studio/server` `services/fixture-seed.ts` — demo issues/comments/work products
- `@mda-studio/server` `services/spec-node-detail.ts` — bundle composer
- `GET   /api/games/:gameId/spec-tree/node/:specId`
- `GET   /api/issues/:id`
- `PATCH /api/issues/:id` — body `{ status }`, 409 on illegal transition
- Active-issue decoration in `assembleSpecTreeResponse`: each node carries its
  active issue id, assignee, and derived run status
- UI `useSpecNodeDetail` hook with `refetch`; `useSpecTree.refetch` for invalidation
- UI `IssueMiniList` with status dropdown restricted to legal next states
- `NodeDrawer` rebuilt: Spec tab renders markdown (`react-markdown` + `remark-gfm`),
  Issues tab is the mini-list, Comments / Work products / Costs / Trace tabs
  consume real bundle data

To run against the fixture studio with seeded issues:

```bash
# from mda-studio/
MDA_STUDIO_GAME_ID=virus-hunter \
MDA_STUDIO_GAME_NAME="Virus Hunter" \
MDA_STUDIO_GAME_SPECS_ROOT=/abs/path/to/repo \
MDA_STUDIO_GAME_CONCEPT_PATH=specs/concept/virus-hunter.concept.md \
MDA_STUDIO_GAME_PRIMARY_AESTHETIC=Fellowship \
MDA_STUDIO_GAME_CONCEPT_TITLE="Virus Hunter" \
MDA_STUDIO_SEED_FIXTURE_ISSUES=true \
pnpm --filter @mda-studio/server dev

# in another terminal
pnpm --filter @mda-studio/ui dev
```

### Phase U4 — cost rollup + warning badges ✅
- Shared schemas: `CostEvent`, `CostEventInput`, `ValidatorRun`, `isInCurrentMonth`
- `@mda-studio/server`:
  - `services/cost-events-store.ts` — in-memory event store with current-month filter
  - `services/validator-runs-store.ts` — latest run per game
  - `services/cost-rollup.ts` — own + subtree maps over canonical-parent DAG; **multi-parent specs are not double-counted**
- Assembler + node-detail consume the rollup maps; warning counts come from the latest validator run
- `POST /api/studios/:studioId/cost-events` — accepts spec-id or null billing code; 422 on unknown prefix
- `POST /api/games/:gameId/validator/runs` — replaces latest
- `GET  /api/games/:gameId/validator/warnings`
- `fixture-seed` now seeds 9 cost events (1 deliberately last-month to validate MTD filtering) + a validator run with 2 warnings
- `WarnBadge` and `CostChip` were already in place; they now render real numbers

### Phase U5 — lenses + ⌘K command palette ✅
- `lib/lenses.ts` — pure model: `ActiveLenses`, `parseLenses(URLSearchParams)`,
  `applyLensPatch(params, patch)`, `applyLenses(nodes, lenses)`. Five V1
  lenses combine with AND (agent, status, layer, warnings, free-text `q`);
  matches **and their canonical ancestors** stay visible so the path is
  never lost.
- `hooks/useUrlSearchParams.ts` — vanilla URL state via the History API.
  TanStack Router is still deferred.
- `hooks/useGlobalShortcuts.ts` — `⌘K` / `Ctrl+K` opens the palette,
  `/` focuses chrome search, `?` toggles keymap help, `Esc` closes overlays.
  Shortcuts no-op when an input is focused (Esc always reaches the handler).
- `SpecTree` gained `visibleSpecIds`, `forceExpandedSpecIds`,
  `matchingSpecIds` props — lens filtering is applied at the rendering edge.
- New components: `LensBar`, `SearchInput`, `CommandPalette`, `KeymapHelp`.
- Game + selection live in the URL (`?game=`, `?node=`) so deep links work.

Try lenses via address bar with the server running:
```
http://127.0.0.1:3101/?game=virus-hunter&layer=M           # only MEC nodes + ancestors
http://127.0.0.1:3101/?game=virus-hunter&agent=mech-1      # only @mech-1's specs
http://127.0.0.1:3101/?game=virus-hunter&lens=warnings     # only nodes with ⚠ > 0
http://127.0.0.1:3101/?game=virus-hunter&q=revive          # free-text
http://127.0.0.1:3101/?game=virus-hunter&node=MEC-001      # deep-link a drawer
```

### Phase U6 — SSE live updates ✅
- `GET /api/studios/:studioId/events` — server-sent stream of `node-changed`,
  `issue-status-changed`, `cost-event`, `validator-run-completed`, and
  `approval-changed` events
- `useStudioEvents` hook subscribes via `EventSource` and invalidates the
  tree, drawer detail, and approvals badge queries on the relevant types
- Stores publish on every mutation path so the chrome stays current
  without polling

### Phase U7 — secondary surfaces ✅
- **Approvals queue** — shared schemas (`approvalSummarySchema`,
  `approvalListResponseSchema`, `approvalResolveInputSchema`),
  `approvals-store` + `/api/studios/:sid/approvals` + `/api/approvals/:id`,
  `ApprovalsPanel`, chrome badge wired with real `pendingCount` and click
  navigation to the queue
- **Activity slide-out** — `/api/studios/:sid/activity`, activity-log store
  publishes to SSE, `ActivitySlideout` opens from chrome and shows newest-first
- **Empty-state CTA** — when a game has the concept doc but no authored specs,
  the tree pane shows the `mda new aes …` CTA (D9)
- **Costs detail page** — `costsDetailResponseSchema`,
  `services/costs-detail.ts` (layer rollup + top specs + recent events),
  `GET /api/games/:gameId/costs[?subtree=…]`, `CostsDetailPanel`. Deep-link
  from the drawer's Costs tab ("See full breakdown for &lt;spec&gt; →") scopes
  the panel to a subtree
- **Org chart tab** — `agentRosterResponseSchema`,
  `services/agent-roster.ts` (derives roster + primary layer from observed
  issue assignees), `GET /api/games/:gameId/agents`, `OrgChartPanel` groups
  agents under their primary MDA layer (read-only, per plan §14 U7)
- **Asset-plans list** — `assetPlanListResponseSchema`,
  `services/asset-plans-scan.ts` (walks `<specsRoot>/design/asset-plans/`,
  derives state from on-disk shape), `GET /api/games/:gameId/asset-plans`,
  `AssetPlansPanel`
- **Settings shell** — stubbed Secrets / Plugins / Routines tabs in
  `SettingsPanel`, reachable from chrome regardless of game selection

Chrome now carries top-level nav buttons for **Costs · Org · Asset Plans ·
Settings · Activity** plus the existing **Approvals** badge. The active
surface is highlighted via `aria-pressed`, and the URL `view=` param keeps
deep links / back-forward navigation consistent.

### Phase U8 — hardening ✅
- **Coverage gate** — per-package `vitest.config.ts` enforces ≥80% on
  lines / statements / branches / functions; all packages pass today
  (shared 100%, server 94.4%, ui ≥90% per file)
- **A11y** — `vitest-axe` runs against the major surfaces in
  `src/test/a11y.test.tsx`; CI fails on WCAG 2.1 AA violations
- **Playwright e2e** — `playwright.config.ts` boots the server (with the
  fixture studio seeded via `MDA_STUDIO_*` env) + the Vite dev server,
  and `e2e/smoke.spec.ts` exercises the golden path: studio home → tree
  → drawer → issue status change → chrome nav → lens → command palette.
  Install browsers once with `pnpm test:e2e:install`
- **Lighthouse CI** — `lighthouserc.json` sets a desktop perf budget
  (LCP ≤ 2.5 s, TBT ≤ 200 ms, CLS ≤ 0.1, JS ≤ 600 KB, perf score ≥ 0.85,
  a11y score ≥ 0.9). Run via `pnpm test:perf` against the preview build

### Deferred (post-V1)
- Persistent tables (`spec_frontmatter_cache`, `issues`, `cost_events`,
  `validator_runs`, `approvals`) once drizzle-kit is wired
- Cross-browser e2e (firefox / webkit) once chromium passes reliably in CI
