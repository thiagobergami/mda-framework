# MDA Studio Operator Guide

How to install, run, and use the spec-tree-first operator surface that
ships in `@mda-studio/ui` + `@mda-studio/server`.

This guide is the day-to-day reference for operators. The companion
documents are:

- [`mda-studio/README.md`](../README.md) — workspace setup, DB modes,
  schema, scripts
- [`mda-studio/ui/README.md`](../ui/README.md) — UI build / test commands
  and a phase-by-phase implementation log
- [`design/mda-studio/spec-tree-ui/plan.md`](../../design/mda-studio/spec-tree-ui/plan.md)
  — the architectural spec the UI is built against (the source of truth
  for any decision question)

---

## 1. What you're looking at

> **Mental model.** The MDA spec tree *is* the application. Issues,
> agents, costs, and approvals are properties of nodes on that tree —
> not first-class objects you navigate to.

The studio is the *running service* that complements the file-based spec
framework. Specs live in markdown under `specs/` and `design/`; the
studio owns the operational state that doesn't belong in version
control: open issues, MTD spend, validator warnings, approvals,
activity history, and live agent run status.

Operators come here to:

- Survey a game's design state across all six MDA layers at once
- See which specs have active work, who owns it, and what it's spending
- Triage validator warnings and pending approvals
- Investigate cost spikes by drilling into a subtree
- Filter the tree down to one agent / status / layer to focus

Operators do **not** author specs here. Use `mda new` (or
`npm run spec`) from the repo root to author. The studio reflects the
files; it doesn't replace them.

---

## 2. Quickstart

### Prerequisites

- Node.js ≥ 20
- pnpm 9.x (`corepack prepare pnpm@9.11.0 --activate`)
- Optional: Postgres 14+ for external DB mode

### Install

From `mda-studio/`:

```bash
pnpm install
```

### Register a game

The studio's home screen has a **Register a game** form. Point it at any
folder that contains `specs/concept/*.concept.md` and the studio adopts it:
the `games-registry` indexes the workspace, starts a `spec-watcher`, and
adds a card to the home grid.

```bash
# terminal 1 — API at 127.0.0.1:3100
pnpm --filter @mda-studio/server dev

# terminal 2 — UI at 127.0.0.1:3101 (proxies /api → 3100)
pnpm --filter @mda-studio/ui dev
```

Open <http://127.0.0.1:3101>, fill in the workspace path, and click
**Register game**. The MDA spec tree is your home.

> **API down?** The UI falls back to a bundled `virus-hunter` fixture
> tree so the surface always renders. The chrome shows a `local fixture`
> badge so the source is honest.

> **API down?** The UI falls back to a bundled `virus-hunter` fixture
> tree so the surface always renders. The chrome shows a `local fixture`
> badge so the source is honest.

---

## 3. The spec tree (home screen)

Every game's home is its MDA tree:

```
CONCEPT  virus-hunter
├── A  AES-001  Fellowship under pressure       ● frozen   @aes-lead  $5.40   ⚠ 0
│   ├── D  DYN-001  Co-op revive loop           ◐ draft    @dyn-1     $3.40
│   │   ├── M  MEC-001  Revive interaction      ● impl     @mech-1    $11.60
│   │   │   └── AST  AST-007  Revive VFX        ◌ concept            $2.00   ⚠ 1
│   │   └── M  MEC-002  Downed state            ◐ draft    @mech-1            ⚠ 1
│   └── D  DYN-002  Threat escalation           ● frozen
│       └── M  MEC-003  MDALogger               ● impl   (also serves AES-002)
├── A  AES-002  Discovery (puzzle rooms)        ◐ draft
└── LEVEL  tutorial-lab                          ▣ blockout
    refs → AES-001, DYN-001, MEC-001
```

Each row carries the same shape, left to right:

| Column        | What it shows                                                 |
|---------------|---------------------------------------------------------------|
| Disclosure    | `▸` collapsed · `▾` expanded · `·` leaf                       |
| Layer glyph   | `A` `D` `M` `★` (AST) `≈` (TUNE) `◇` (LEVEL); color-coded     |
| Status glyph  | `◌` concept · `◐` draft · `●` frozen/impl · `▣` blockout · `◧` playable · `◆` polished |
| Spec id       | `AES-001`, `MEC-003`, etc. — canonical from frontmatter       |
| Title         | Frontmatter `name` or first H1                                |
| "also serves" | Multi-parent specs show e.g. `also serves 2`                  |
| "refs"        | LEVEL nodes show outgoing reference count                     |
| Assignee chip | `@handle` + green/amber/red run-status dot                    |
| Cost chip     | MTD subtree spend; hover for own + subtree breakdown          |
| Warn badge    | `⚠ N` when there are validator warnings                       |

### Defaults

- **Expansion**: the Concept node and every `A` (Aesthetic) node are
  expanded by default; D / M / AST / TUNE / LEVEL are collapsed.
- **Per-user state**: expansion + drawer position live in
  `localStorage` keyed by `gameId`. Open a node in a fresh tab and it
  re-collapses; you can wipe via Chrome's reset action (planned).
- **Empty tree**: if a game has only a concept doc, the tree pane
  shows an inline CTA: `mda new aes …`.

### Multi-parent specs (DAG handling)

Some specs serve multiple parents (e.g. `MEC-003 MDALogger` is used by
several dynamics). The tree shows each spec under its **canonical
parent** — the first entry in its `traceability:` frontmatter — and
adds an `also serves N` chip. Selecting the node draws ghost links to
its secondary parents in the drawer trace (plan D1).

### Navigation

- **Click a row** → opens the drawer with full detail on that node
- **Arrow keys** (with focus on the tree):
  - `↑ / ↓` move between rows
  - `← / →` collapse / expand the focused row
  - `Enter` / `Space` select the focused row
- **URL deep link**: `?game=<id>&node=<spec>` opens straight into the
  drawer

---

## 4. The node drawer

Clicking any tree row opens a 520 px right-side drawer with six tabs:

| Tab            | What it shows                                                    |
|----------------|------------------------------------------------------------------|
| Spec           | Rendered markdown of the source file (path shown at top)         |
| Issues         | Active + historical issues for this spec; inline status edit     |
| Comments       | Newest 10 comments across all linked issues                      |
| Work products  | Newest 10 work products (PRs, asset drops, etc.)                 |
| Costs          | Own + subtree MTD; per-billing-code breakdown; "See full breakdown for &lt;spec&gt; →" deep-links to the chrome Costs page scoped to this subtree |
| Trace          | Canonical path from the studio root, secondary parents, outgoing refs |

The breadcrumb under the title is the *trace upward* — clickable
segments let you walk the chain without closing the drawer.

### Editing an issue's status

In the **Issues** tab, each row has a status dropdown showing only the
**legal next states** from the issue state machine. The PATCH is
applied immediately; the tree row updates without a refresh (via SSE).
Illegal transitions return 409 and surface as an inline error.

### Closing the drawer

`×` button, `Esc`, or remove `node=` from the URL.

---

## 5. The chrome bar

Top, left to right:

- **Studio name** (disabled selector for now — single-tenant V1)
- **Game name** — click to return to the studio home
- **Search input** — typing applies a free-text lens to the tree (only
  shown when a game is open and you're not in a secondary surface)
- *(right side)* secondary-surface buttons:
  - **Costs** — chrome Costs detail page (game-scoped)
  - **Org** — Org chart (game-scoped)
  - **Asset Plans** — asset-plan executor states list (game-scoped)
  - **Settings** — Settings shell (studio-scoped — always available)
  - **Activity** — slide-out for recent studio events
  - **⌘K** — opens command palette
  - **?** — toggles the keymap help overlay
  - **Approvals · N** — pulsing badge with pending count; click for queue

The currently-active surface is highlighted via `aria-pressed`.

---

## 6. Lenses (filtering)

Lenses are composable, URL-driven filters over the tree. Any combination
narrows the tree to nodes matching **all active lenses**, and their
**ancestors stay visible** so the path to a match never collapses.

| Lens               | URL form                                | What it does                              |
|--------------------|-----------------------------------------|-------------------------------------------|
| Agent              | `?agent=mech-1`                         | Show specs assigned to `@mech-1`          |
| Status             | `?status=draft`                         | Show specs in `draft` status              |
| Layer              | `?layer=M`                              | Show only MEC specs (other layers hide)   |
| Warnings           | `?lens=warnings`                        | Show nodes with `warningCount > 0`        |
| Free-text          | `?q=revive`                             | Title / spec id / agent handle substring  |

Active lenses appear as chips in the bar between chrome and tree. `×`
on a chip removes that lens. "Clear all" wipes them.

Lens count summary (`5 of 23 match`) makes it obvious whether your
filter is too narrow.

---

## 7. ⌘K command palette

`⌘K` (macOS) or `Ctrl+K` opens a fuzzy-search palette over:

- All spec nodes in the current game (jumps to the drawer)
- All known agent handles (applies an agent lens)
- All active issues (jumps to the spec drawer)

`↑ / ↓` walks results, `Enter` picks the highlighted one, `Esc` closes.
The first match is highlighted on open so a typed query + `Enter` is a
two-key navigation.

---

## 8. Secondary surfaces

These are reachable from the chrome, not as tree nodes. They open
*over* the tree (URL `view=...`) rather than next to it, and `Esc`
returns to the tree.

### Approvals queue (`?view=approvals`)

Studio-scoped list of pending approvals. Each row shows the spec id,
kind (`spec-freeze` / `mechanic-impl` / `asset-final` / …), requester,
title, and body. Operators add an optional comment and click
**Approve** or **Reject**; the PATCH runs the resolve state machine
and the chrome badge updates via SSE. Resolved approvals are kept on
record (toggle filter to "all" — planned).

### Activity slide-out (`?activity=1`)

Right-side overlay listing the most recent studio events, newest first.
Kinds: issue-created, status-changed, approval-requested / approved /
rejected, cost-event, validator-run-completed. Each row may carry a
spec chip that deep-links into the tree.

Narrows to the current game automatically when one is open.

### Costs detail (`?view=costs[&scope=<spec>]`)

Three sections:

1. **Header** — total MTD spend across the game (or scoped subtree) +
   orphan total (events with no `billing_code`)
2. **By layer** — bar rollup per MDA layer with %-of-total
3. **Top specs** — table of top spenders with own + subtree cents; the
   spec id chip deep-links back into the tree
4. **Recent events** — most recent 30 cost ingestion events; the
   billing-code chip also deep-links into the tree

The `scope=<specId>` URL param scopes everything to a canonical-parent
subtree. Triggered from a node's drawer Costs tab via the "See full
breakdown" button. A `Scope · <spec> ×` chip in the header lets you
clear the scope.

### Org chart (`?view=org`)

V1 has no agents table; the roster is derived from observed issue
assignees. Agents are grouped under the MDA layer where most of their
issues land (uncategorized agents — director, leads — appear under
"Uncategorized"). Read-only, not interactive.

### Asset plans (`?view=asset-plans`)

Scans `<specsRoot>/design/asset-plans/<asset-id>/` and lists each
asset's state derived from the on-disk shape:

- `no-plan` — directory exists but no `<asset>.v<N>.plan.md`
- `planned` — plan present, no `output/` artifacts
- `in-progress` — plan + at least one output artifact
- `imported` — plan + outputs + `.imported` marker
- `unknown` — directory unreadable

Underscore-prefixed entries (`_tools/`, `_engines/`, `_routing.md`)
are skipped — they're profile/style docs, not assets.

### Settings (`?view=settings`)

Stubbed shell with three tabs: **Secrets**, **Plugins**, **Routines**.
Each names where its backing configuration lives today (env vars for
secrets; the plugin workspace glob; the routine registry in
`server/src/services/`) and what the UI will surface once those
become first-class. Settings is studio-scoped, so it works even
without a game selected.

---

## 9. Common operator flows

### "Why does this issue exist?"

1. Click the spec row in the tree
2. Read the **Trace** tab — it lists the canonical path up to Concept,
   any secondary parents, and any outgoing references
3. The drawer breadcrumb under the title is the same trace, clickable

### "Where is our money going this month?"

1. Chrome → **Costs**
2. Read the layer rollup at the top
3. The Top specs table shows the biggest spenders; click a chip to
   open that spec's drawer
4. To scope: pick a tree node, drawer → Costs tab → "See full
   breakdown for &lt;spec&gt; →" — Costs page reloads scoped to that
   subtree

### "Show me only what @mech-1 owns"

- Chrome search: type `mech-1` (free-text lens), or
- Open the command palette (⌘K), type `@mech-1`, pick the agent entry
- The tree narrows to specs assigned to that handle, with ancestors
  kept visible

### "Promote MEC-001 from draft to impl"

1. Drawer → Issues tab → pick the relevant issue → change status to
   `in_review`
2. (Out of band: validator passes, code review approves)
3. Approvals queue → find the `mechanic-impl` request → Approve
4. The spec's `status` field gets flipped to `impl` by the spec-update
   routine (out of scope here; see `system.md §15`)

### "Triage validator warnings"

- URL: `?lens=warnings` (or click any `⚠ N` chip)
- Tree shows only specs with warnings; click each → drawer → Spec /
  Issues tabs to inspect

---

## 10. Keyboard shortcuts

| Key                  | Action                                        |
|----------------------|-----------------------------------------------|
| `⌘K` / `Ctrl+K`      | Open command palette                          |
| `/`                  | Focus the chrome search input                 |
| `?`                  | Toggle the keymap help overlay                |
| `Esc`                | Close palette → help → activity → secondary surface → drawer (in that order) |
| `↑` / `↓`            | Navigate palette results or tree rows         |
| `Enter` / `Space`    | Open the selected spec / activate a result    |
| `←` / `→`            | Collapse / expand the focused tree row        |

Shortcuts that produce printable characters no-op while an input is
focused. `Esc` always works.

The same table lives behind the chrome `?` button.

---

## 11. URL structure

The URL is the authoritative state for what you're looking at. Deep
links share cleanly; back / forward work as expected.

| Param         | Form                | Meaning                                        |
|---------------|---------------------|------------------------------------------------|
| `game`        | `game=virus-hunter` | The active game (omitted = studio home)        |
| `node`        | `node=MEC-001`      | Open the drawer on this spec                   |
| `view`        | `view=approvals`    | Open a secondary surface over the tree         |
| `scope`       | `scope=MEC-001`     | Subtree scope for the Costs page (`view=costs`)|
| `activity`    | `activity=1`        | The activity slide-out is open                 |
| `agent`       | `agent=mech-1`      | Agent lens                                     |
| `status`      | `status=draft`      | Status lens                                    |
| `layer`       | `layer=M`           | Layer lens                                     |
| `lens`        | `lens=warnings`     | Boolean lens (e.g. warnings-only)              |
| `q`           | `q=revive`          | Free-text lens                                 |

Examples:

```
/?game=virus-hunter                              tree, no filters
/?game=virus-hunter&node=MEC-001                  tree + drawer on MEC-001
/?game=virus-hunter&view=costs                    chrome Costs page (game scope)
/?game=virus-hunter&view=costs&scope=MEC-001      Costs page, subtree-scoped
/?game=virus-hunter&layer=M&status=draft          MEC nodes in draft + ancestors
/?game=virus-hunter&activity=1                    tree with activity slide-out open
```

---

## 12. Data sources and freshness

### Where each surface gets its data

| Surface                  | API                                                          |
|--------------------------|--------------------------------------------------------------|
| Spec tree                | `GET /api/games/:id/spec-tree`                               |
| Node drawer              | `GET /api/games/:id/spec-tree/node/:specId`                  |
| Costs detail             | `GET /api/games/:id/costs[?subtree=]`                        |
| Org chart                | `GET /api/games/:id/agents`                                  |
| Asset plans              | `GET /api/games/:id/asset-plans`                             |
| Approvals queue          | `GET /api/studios/:id/approvals`                             |
| Activity slide-out       | `GET /api/studios/:id/activity[?gameId=&since=&limit=]`      |
| SSE live updates         | `GET /api/studios/:id/events`                                |

### How it stays fresh

Live updates flow through an `EventSource` stream (`/api/studios/:id/events`).
The server publishes:

- `node-changed` — anything that should refresh a tree row
- `issue-status-changed` — narrowed form of node-changed
- `cost-event` — new cost ingested (refreshes node + drawer)
- `validator-run-completed` — new warning set (refreshes warnings)
- `approval-changed` — chrome badge updates

Each event is also recorded in the activity log, so the slide-out
refreshes on every event regardless of type.

When SSE is off (fixture mode or proxy issues), the UI falls back to
on-demand fetches triggered by user actions. There is no polling.

### Manually rebuilding the spec cache

If you've just edited specs on disk and want the studio to re-read
them:

```bash
curl -X POST http://127.0.0.1:3100/api/games/virus-hunter/spec-tree/refresh
```

Returns `{ gameId, rebuiltAt, specCount, issueCount }`.

---

## 13. Configuration reference

| Variable                            | Where           | Default          | Effect |
|-------------------------------------|-----------------|------------------|--------|
| `PORT`                              | server          | `3100`           | API bind port |
| `HOST`                              | server          | `127.0.0.1`      | API bind host |
| `MDA_STUDIO_GAME_ID`                | server          | —                | Registers a game at boot |
| `MDA_STUDIO_GAME_NAME`              | server          | `=ID`            | Display name |
| `MDA_STUDIO_GAME_SPECS_ROOT`        | server          | —                | Absolute path containing `specs/` |
| `MDA_STUDIO_GAME_CONCEPT_PATH`      | server          | `specs/concept/unknown.concept.md` | Relative path to concept doc |
| `MDA_STUDIO_GAME_PRIMARY_AESTHETIC` | server          | `Fellowship`     | Shown in chrome |
| `MDA_STUDIO_GAME_CONCEPT_TITLE`     | server          | `=ID`            | Shown on game card and tree head |
| `MDA_STUDIO_SEED_FIXTURE_ISSUES`    | server          | `false`          | Seed demo issues / costs / approvals at boot |
| `DATABASE_URL`                      | db              | *(unset)*        | Switches to external Postgres mode |
| `MDA_STUDIO_INSTANCE`               | db              | `default`        | Embedded instance dir name |

UI dev server is fixed at `127.0.0.1:3101` with `strictPort: true`
(see `mda-studio/ui/vite.config.ts`). Change there if you need a
different port.

---

## 14. Running the tests

| Command                                            | What it does                                  |
|----------------------------------------------------|-----------------------------------------------|
| `pnpm test`                                        | Vitest run + v8 coverage, all packages        |
| `pnpm --filter @mda-studio/server test`            | Server-side tests only                        |
| `pnpm --filter @mda-studio/ui test`                | UI unit tests (incl. vitest-axe a11y)         |
| `pnpm --filter @mda-studio/ui test:e2e:install`    | Download chromium for Playwright (once)       |
| `pnpm --filter @mda-studio/ui test:e2e`            | Playwright e2e — boots both servers + chrome  |
| `pnpm --filter @mda-studio/ui test:perf`           | Lighthouse CI against the preview build       |
| `pnpm typecheck`                                   | `tsc --noEmit` across all packages            |

Coverage is gated at ≥ 80% lines / statements / branches / functions
per package; Lighthouse enforces LCP ≤ 2.5 s, TBT ≤ 200 ms,
CLS ≤ 0.1, JS ≤ 600 KB, perf ≥ 0.85, a11y ≥ 0.9.

See [`mda-studio/ui/README.md`](../ui/README.md) for the full phase
breakdown and per-phase scripts.

---

## 15. Troubleshooting

**"Loading spec tree…" then "Could not load spec tree"**

The server is unreachable or the requested game isn't registered.
Check:

```bash
curl http://127.0.0.1:3100/api/health
curl http://127.0.0.1:3100/api/games/<your-game-id>/spec-tree
```

If the second returns `404 unknown game`, your env vars didn't make it
to the server process. Re-export them in the same shell you ran
`pnpm --filter @mda-studio/server dev` from.

**"local fixture" badge appears in the tree header**

The UI couldn't reach the API and fell back to the bundled
`virus-hunter` fixture. The tree renders so the UI never goes blank,
but writes (issue status changes, approvals) won't persist. Check the
API process. SSE auto-disables in fixture mode.

**Chrome buttons (Costs / Org / Asset Plans) don't appear**

They require a selected game. Pick one from the studio home first.
Settings is the exception — it's studio-scoped and always available.

**Approval Approve / Reject button does nothing**

Check the network tab: a 409 means the approval is no longer pending
(somebody else resolved it). A 422 means the patch shape was wrong.
The inline error under the row shows the server's message.

**The tree doesn't refresh after I changed a spec file**

The cache is rebuilt on demand and on git-push webhooks (planned).
Force a rebuild:

```bash
curl -X POST http://127.0.0.1:3100/api/games/<id>/spec-tree/refresh
```

The tree re-fetches on the next SSE `node-changed` event; the refresh
endpoint doesn't currently emit one, so reload the page after calling
it (this is a known V1 limitation).

**Asset Plans is empty**

That's expected unless your game has subdirectories under
`<specsRoot>/design/asset-plans/`. Profile/style docs (`_tools/`,
`_engines/`, `_routing.md`, `_style-guide.md`) are intentionally
skipped; only `<assetId>/` directories count.

**Validator warning badge is always 0**

No `mda validate` run has been recorded for the game yet. Either
trigger it externally and POST the result, or seed via
`MDA_STUDIO_SEED_FIXTURE_ISSUES=true` for demo data.

---

## 16. Glossary

| Term              | Meaning                                                          |
|-------------------|------------------------------------------------------------------|
| **MDA layer**     | One of A / D / M / AST / TUNE / LEVEL (Aesthetic, Dynamic, Mechanic, Asset, Tuning, Level) |
| **Canonical parent** | The first parent listed in a spec's `traceability:` block — the spec renders under this parent in the tree |
| **Secondary parent** | Any further parent — rendered as an "also serves N" chip; included in the trace, excluded from the cost subtree rollup |
| **Subtree cost**  | Sum of own cost over the canonical-parent subtree rooted at a spec (multi-parent specs are not double-counted) |
| **Lens**          | A composable URL-driven filter over the tree                     |
| **Drawer**        | The 520 px right-side panel that opens when you click a tree row |
| **Chrome**        | The top bar with selectors, search, secondary nav, and badges    |
| **Surface**       | Any chrome-reachable view that isn't the tree itself             |
| **SSE**           | Server-Sent Events — the live-update channel from server to UI   |
| **Orphan cost**   | A cost event with `billing_code = null` — counted in the studio total but not attributed to any spec |
| **Fixture**       | The bundled `virus-hunter` data the UI falls back to when the API is unreachable |

---

*This guide describes the spec-tree-first UI as of Phase U8. Future
phases (persistent DB tables, cross-browser e2e) are tracked in
`mda-studio/ui/README.md`.*

---

## Appendix — CI bootstrap (env vars)

The interactive **Register a game** form (§ 2.3) is the right path for
operators. CI and demo-seeding scripts can still bootstrap a game from
environment variables read by `server/src/index.ts` on boot:

| Variable                            | What it is                                                  |
|-------------------------------------|-------------------------------------------------------------|
| `MDA_STUDIO_GAME_ID`                | URL-safe id, e.g. `virus-hunter`                            |
| `MDA_STUDIO_GAME_NAME`              | Human label shown in chrome and game cards                  |
| `MDA_STUDIO_GAME_SPECS_ROOT`        | Absolute path containing `specs/` and `design/`             |
| `MDA_STUDIO_GAME_CONCEPT_PATH`      | Path to the concept doc, relative to `SPECS_ROOT`           |
| `MDA_STUDIO_GAME_PRIMARY_AESTHETIC` | Free text, surfaced in chrome                               |
| `MDA_STUDIO_GAME_CONCEPT_TITLE`     | Free text, the title shown on the game card and tree head   |
| `MDA_STUDIO_SEED_FIXTURE_ISSUES`    | `true` to seed demo issues / costs / approvals on boot      |

```bash
MDA_STUDIO_GAME_ID=virus-hunter \
MDA_STUDIO_GAME_NAME="Virus Hunter" \
MDA_STUDIO_GAME_SPECS_ROOT=/abs/path/to/your/repo \
MDA_STUDIO_GAME_CONCEPT_PATH=specs/concept/virus-hunter.concept.md \
MDA_STUDIO_GAME_PRIMARY_AESTHETIC=Fellowship \
MDA_STUDIO_GAME_CONCEPT_TITLE="Virus Hunter" \
MDA_STUDIO_SEED_FIXTURE_ISSUES=true \
pnpm --filter @mda-studio/server dev
```

Operators authoring locally should use the form instead — env-var
registration leaves no trace once the process exits.
