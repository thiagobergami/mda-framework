---
id: PLAN-FEAT-asset-plan
spec: design/asset-plans/spec.md
title: Implementation Plan — Asset Pipeline
status: draft
owner: thiago
created: 2026-05-06
branch: feature/asset-plan
format: spec-driven-development (plan.md)
---

# Implementation Plan — Asset Pipeline

> Companion to `spec.md`. The spec answers *what* and *why*; this answers *how* and
> *in what order*. Each phase has a single shippable output and exits when its
> acceptance check passes.

## 1. Tech context

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) | Matches existing `tools/` and `design/pipeline/cli/` |
| Runtime | Node 20+, executed via `tsx` for dev, compiled for CI | Same as current CLIs |
| CLI lib | `commander` | Already used by `mda` CLI |
| Prompt lib | `@inquirer/prompts` | Already used by spec wizard |
| Markdown | `gray-matter` (frontmatter) + raw string for body | Same as existing parser |
| MCP client | `@modelcontextprotocol/sdk` (TypeScript SDK) | Official, works in Node CLIs |
| File I/O | `node:fs/promises`, `glob` | Same as existing tools |
| Tests | `node:test` + `node --test` (no new framework) | Keep deps minimal |

## 2. Constitution check (existing-project conventions)

Each must be true at the end. Verified up front to avoid rework.

- [ ] **C1.** New CLI commands land as subcommands of `mda` (in `tools/src/cli.ts`),
      not as a parallel binary. Rationale: project's CLI surface is already `mda` +
      `npm run spec` — adding a third top-level binary would fragment the UX.
- [ ] **C2.** New layer types (if any) are added to `tools/src/scaffold.ts` LAYER_MAP
      and `tools/src/types.ts` `SpecLayer` union — same pattern used by `BIND` and
      `LVL`.
- [ ] **C3.** New artifacts live under `design/asset-plans/` — never in `specs/` —
      per the boundary rule in `design/README.md`.
- [ ] **C4.** New validator rules go in `tools/src/rules/` and are exported via
      `tools/src/rules/index.ts` so `mda validate` picks them up automatically.
- [ ] **C5.** Tool/engine profiles are markdown-with-frontmatter, parseable by
      reusing `parser.ts` patterns — not JSON, not YAML.
- [ ] **C6.** No new monorepo packages. Code lands in either `tools/` (for the CLI
      core + commands) or `design/pipeline/` (only if interactive prompts demand it).
- [ ] **C7.** TypeScript stays strict. No `any` in committed code; gateway types
      live in `tools/src/types.ts`.

## 3. Project structure (target end state)

```
tools/src/
├── asset-plan/                          ← NEW — pipeline core
│   ├── index.ts                         exports for cli.ts wiring
│   ├── routing.ts                       _routing.md → tool resolver
│   ├── profile.ts                       _tools/*.md and _engines/*.md parser
│   ├── intake.ts                        refs/ presence checks
│   ├── style.ts                         AES + concept + style-guide aggregator
│   ├── compose.ts                       plan markdown composer
│   ├── execute.ts                       milestone walker + MCP dispatcher
│   ├── mcp-client.ts                    @modelcontextprotocol/sdk wrapper
│   ├── state.ts                         draft → approved → executed → imported
│   └── engine-import.ts                 engine profile dispatcher
├── rules/
│   └── asset-plan-integrity.ts          ← NEW — validator rule
├── cli.ts                               ← MODIFIED — register `asset-plan` subcommands
└── types.ts                             ← MODIFIED — PlanFile, Milestone, ToolProfile, EngineProfile

design/asset-plans/
├── spec.md                              ← exists
├── plan.md                              ← this file
├── tasks.md                             ← optional — written if/when team scales
├── _routing.md                          ← NEW — asset-type → tool table
├── _style-guide.md                      ← NEW — global style anchors
├── _tools/
│   ├── blender.md                       ← NEW (Phase 3)
│   ├── photoshop.md                     ← NEW (Phase 6)
│   ├── reaper.md                        ← NEW (Phase 6)
│   ├── substance.md                     ← NEW (Phase 6)
│   ├── mixamo.md                        ← NEW (Phase 6)
│   └── houdini.md                       ← NEW (Phase 6)
├── _engines/
│   └── roblox.md                        ← NEW (Phase 5)
├── .mcp-servers.json                    ← NEW — endpoint registry (gitignored if local)
└── {asset-id}/                          ← created at plan-time
    ├── refs/
    ├── {asset-id}.v{N}.plan.md
    └── output/

package.json                             ← MODIFIED — add `asset-plan` script
```

## 4. Phases

Each phase is **independently shippable**. Stop after any phase if priorities shift —
nothing later in the list is required for what came before to be useful.

---

### Phase 0 — Skeleton & types  *(0.5 day)*

**Goal.** Wire the new subcommand into `mda` with no behavior beyond `--help`.
Establish the type contracts so later phases compile against a stable surface.

**Deliverables.**
- `tools/src/asset-plan/index.ts` — empty, exports a registration function
- `tools/src/types.ts` — add:
  ```ts
  export type PlanStatus = "draft" | "approved" | "executed" | "imported";
  export type MilestoneStatus = "pending" | "executed" | "rejected" | "skipped-mcp";
  export interface MilestoneRef { id: string; status: MilestoneStatus }
  export interface PlanFile {
    id: string; assetId: string; version: number; status: PlanStatus;
    tool: string; engine: string;
    references: { assetSpec: string; aesSpecs: string[]; concept: string; styleGuide: string };
    inputs: string[]; milestones: MilestoneRef[];
  }
  export interface ToolProfile {
    id: string; name: string; mcpRequired: string;
    assetTypes: string[]; milestonesByType: Record<string, MilestoneSpec[]>;
    inputsByType: Record<string, InputRequirement[]>;
  }
  export interface MilestoneSpec {
    id: string; description: string; mcpCalls: string;
    validation: string; expectedArtifact: string;
  }
  export interface EngineProfile {
    id: string; name: string; mcpRequired: string;
    importFormats: string[]; importSteps: string;
  }
  ```
- `tools/src/cli.ts` — register `asset-plan` parent command + stubs for `<id>`,
  `exec <id>`, `--list`
- `package.json` — `"asset-plan": "mda asset-plan"`

**Exit check.** `npm run asset-plan --help` prints usage. `npm run spec:check`
(types build) passes. No production behavior yet.

---

### Phase 1 — Profile parser & routing  *(1 day)*

**Goal.** Read `_tools/*.md`, `_engines/*.md`, and `_routing.md` into typed objects.

**Deliverables.**
- `tools/src/asset-plan/profile.ts` — `loadToolProfile(name)`,
  `loadEngineProfile(name)`. Parses frontmatter + named markdown sections
  (Required Inputs, Milestones, etc.) into `ToolProfile`/`EngineProfile`.
- `tools/src/asset-plan/routing.ts` — `resolveTool(assetType, override?)`. Reads
  `_routing.md` table. Honors `tool:` override in `.asset.md` frontmatter.
- `_routing.md` written with the v1 table from spec FR-6.
- `_style-guide.md` skeleton (palette ranges, polycount targets — placeholders OK).
- Unit tests for parser and resolver: round-trip a fixture profile, assert resolver
  picks the right tool for each asset type.

**Exit check.** `node --test tools/src/asset-plan/*.test.ts` green. Calling
`resolveTool("3d-model")` returns the Blender profile loaded from `_tools/blender.md`.

---

### Phase 2 — Plan generator (no execution)  *(1.5 days)*

**Goal.** `mda asset-plan <asset-id>` produces a draft plan file end-to-end. No MCP,
no execution.

**Deliverables.**
- `intake.ts` — checks `refs/` and lists missing inputs per the tool profile;
  blocks generation if missing.
- `style.ts` — aggregates style sources in precedence order
  (`AES → concept → _style-guide.md`); annotates each constraint with its source.
- `compose.ts` — renders the plan markdown from a fixed template (see spec §7).
  Inserts MCP call blocks verbatim from the tool profile (no execution yet).
- Versioning: scans `{asset-id}/*.v*.plan.md`, picks `N+1`. `--new-version` honored.
- `mda asset-plan <asset-id>` command wired up: routes → checks intake → composes →
  writes to disk → prints path.

**Exit check.** Pick any existing `.asset.md`, drop a stub image into its `refs/`,
run `mda asset-plan AST-XXX`, get a `v1.plan.md` whose milestones match the tool
profile and whose style sources cite specific spec sections.

---

### Phase 3 — Blender profile + first end-to-end (3D model, plan-only)  *(1 day)*

**Goal.** Land the first real tool profile. Validates the Phase 1–2 design against
realistic content.

**Deliverables.**
- `_tools/blender.md` — full profile per spec §7 data model, with all 6 milestones
  for `3d-model`: blockout → topology → UV → texture → rig → export. MCP call
  templates use the documented Blender MCP tool names.
- `_engines/roblox.md` — minimal version for routing (full import in Phase 5).
- Manual smoke: scaffold a test asset (`mda new asset "Test Cube"`), run
  `asset-plan`, verify v1 plan looks correct.

**Exit check.** A reviewer reading the generated plan can perform every milestone
manually in Blender and end up with a usable `.fbx` — even without running the
executor. This is the "doc-only" baseline that AC-4 demands.

---

### Phase 4 — Executor + MCP integration  *(2 days)*

**Goal.** `mda asset-plan exec <asset-id>` walks milestones, dispatches MCP calls,
pauses for verdicts, persists state.

**Deliverables.**
- `mcp-client.ts` — wraps `@modelcontextprotocol/sdk`. Reads
  `design/asset-plans/.mcp-servers.json` (path, args, env). Connects on demand,
  caches connections per server, closes on exit.
- `execute.ts` — milestone walker:
  1. Parse plan file's milestone block list.
  2. For each `pending` milestone: render call block, dispatch via MCP, capture
     output, prompt user `accept | reject-and-revise | reject-and-stop`.
  3. On accept: flip status to `executed`, append iteration-log row.
  4. On reject-and-revise: mark `rejected`, exit with hint to edit and re-run with
     `--resume`.
  5. On reject-and-stop: mark `rejected`, exit.
- `state.ts` — `draft → approved → executed → imported` transition guard. Refuses
  illegal moves. Single function: `transition(plan, target)`.
- MCP-unavailable path: if connect fails or `mcpRequired` server is absent, mark
  the milestone `skipped-mcp`, print the call block as instructions, and let user
  proceed manually before accepting.
- `--resume` flag: skip `executed` milestones, start from first non-executed.

**Exit check.** With Blender MCP installed, executing the Phase 3 plan walks all
six milestones with accept-or-reject prompts. Without it, the executor prints each
call block as a manual instruction and still tracks state. Iteration log appended
correctly in both modes.

---

### Phase 5 — Roblox engine import  *(1 day)*

**Goal.** After every milestone is approved, asset lands in the engine.

**Deliverables.**
- `_engines/roblox.md` filled out: import-formats, import-steps, tag/attribute
  wiring per the Placeholder Protocol section of the asset spec.
- `engine-import.ts` — reads engine profile, dispatches Roblox Studio MCP calls
  (`importAsset`, `setAttribute`, `addTag`). Resolves target path from the asset
  spec frontmatter (`target-path:`), falling back to
  `ReplicatedStorage/Assets/{type}/`.
- State machine wired: when last milestone flips to `executed`, plan status flips
  to `executed`; engine-import success advances it to `imported`.
- The asset's `.asset.md` status field gets a *suggestion* (printed to stdout) but
  is **not** auto-edited. Per spec FR-25 / OQ-4.

**Exit check.** AC-5: end-to-end run on a 3D test asset produces an `.fbx` whose
contents land at the spec'd Roblox path with tags/attributes applied.

---

### Phase 6 — Remaining tool profiles  *(0.5 day each, parallelizable)*

**Goal.** Cover the rest of asset categories. Each profile is a leaf addition —
no core changes needed.

**Order (priority by likely usage):**

1. **`_tools/photoshop.md`** — 2D art. Inputs: image. Milestones: composition →
   line art → flats → shading → polish → export.
2. **`_tools/reaper.md`** — music. Inputs: text or audio. Milestones: project setup
   → instrumentation → arrangement → mix → master → export.
3. **`_tools/substance.md`** — texture. Inputs: 3D model + style refs. Milestones:
   bake → base materials → detail → wear → export.
4. **`_tools/mixamo.md`** — animation. **Risk: Mixamo MCP coverage is uncertain
   (spec OQ-2)**. Plan as doc-only profile in v1 (`mcp-required: none`); revisit
   if/when an MCP appears.
5. **`_tools/houdini.md`** — VFX (complex). Inputs: text or video. Milestones:
   solver setup → simulation → caching → render → bake-to-image-strip-or-particle
   → export. Engine-native VFX go through Roblox engine profile, not here.

**Per-profile exit check.** Plan generation succeeds for one fixture asset of that
type; reviewer agrees milestones are sensible.

---

### Phase 7 — Validation rule + workflow doc  *(0.5 day)*

**Goal.** Make `mda validate` aware of plans so they don't drift.

**Deliverables.**
- `tools/src/rules/asset-plan-integrity.ts` — checks per spec FR-26:
  - Every plan references a real `.asset.md`.
  - Every plan's `tool:` and `engine:` resolve to real profiles.
  - No status transition is illegal (e.g. `draft → imported`).
  - No orphan plan dirs (asset spec deleted but plan dir remains).
- Registered in `tools/src/rules/index.ts`.
- Brief addition to `specs/WORKFLOW.md` and `CLAUDE.md` Rules-for-AI section
  pointing at the asset-plan flow. Keep it terse — this isn't a redesign.

**Exit check.** AC-6: `mda validate` passes on a clean repo and fails with a clear
diagnostic when an orphan plan or bad transition is introduced.

---

### Phase 8 — Wizard hand-off (optional, deferrable)  *(0.5 day)*

**Goal.** After a user creates an `.asset.md` via `npm run spec`, offer to start
the asset plan immediately.

**Deliverables.**
- New step at the end of `design/pipeline/cli/prompts/asset.ts`:
  *"Generate implementation plan now? (y/N)"* — invokes `mda asset-plan <id>` if
  yes.

**Exit check.** Smoke run: create asset via wizard, accept the prompt, get a v1
plan file.

---

## 5. Sequencing & critical path

```
Phase 0 → 1 → 2 → 3 ──┬→ 4 → 5  (critical path: ~7 days)
                       └→ 6 (parallel after 3)
                              ↘
                                 7 (after any tool profile lands)
                                 8 (anytime after 2)
```

- **Critical path:** 0 → 1 → 2 → 3 → 4 → 5. Roughly 7 days of focused work.
- **Phase 6 profiles** are independently shippable after Phase 3, in any order.
- **Phase 7 (validator)** can land any time after Phase 2 (the plan format is the
  thing being validated).
- **Phase 8 (wizard)** is pure ergonomics — defer if pressed.

## 6. Test strategy

| Layer | What | How |
|---|---|---|
| Parser | Tool / engine profile round-trip | `node --test`, fixture markdown files |
| Resolver | Routing including overrides | `node --test`, table-driven |
| Composer | Plan generation snapshot | `node --test`, golden file diff |
| State | Transition guard | `node --test`, exhaustive (16 src→dst pairs) |
| Executor | Milestone walker | Manual smoke against a mock MCP server stub |
| MCP integration | Real Blender MCP | Manual, gated by `BLENDER_MCP=1` env |
| Engine import | Real Roblox Studio MCP | Manual, gated by `ROBLOX_MCP=1` env |
| Validator | Asset-plan-integrity rule | `node --test`, fixture repos with each failure mode |

No coverage threshold — the existing project doesn't enforce one. Manual smokes
documented in each phase's exit check.

## 7. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **R1.** Blender MCP API surface differs from what we expect; call templates wrong | Medium | High | Phase 3 is "plan-only" first — call blocks are markdown until Phase 4 actually invokes them. Cheap to revise. |
| **R2.** Mixamo has no usable MCP (OQ-2) | High | Medium | Mixamo profile shipped as doc-only (`mcp-required: none`). Mark in spec; revisit later. |
| **R3.** Roblox Studio MCP availability is uncertain | Medium | High | Engine import gracefully falls back to `skipped-mcp` and prints manual instructions. AC-5 is gated on availability; if absent, ship Phase 5 as doc-only and reopen later. |
| **R4.** MCP TS SDK doesn't fit a Node CLI cleanly (assumes streams / agent context) | Low | High | Spike at start of Phase 4 — if it doesn't fit, fall back to spawning the `claude` CLI in headless mode and piping calls through it. |
| **R5.** Plan markdown drift across versions makes validation brittle | Medium | Medium | Validator parses frontmatter only; body is human-edited. Frontmatter schema is the contract. |
| **R6.** User edits a plan inconsistently after rejection (e.g. rewrites past milestones) | Low | Medium | Validator flags `executed` milestones whose hash changed. Defer to v2 if it never bites. |
| **R7.** Style precedence edge cases — AES says one thing, concept says another | Medium | Low | Composer always *cites* the source. Reviewer can resolve manually; no auto-merge. |

## 8. Open questions resolved during planning

- **Where does the executor talk to MCP servers from?** A new file
  `design/asset-plans/.mcp-servers.json` (gitignored) listing each server's
  command/args/env. Mirrors the Claude Code `.mcp.json` convention so users can
  copy-paste their existing config.
- **Should `mda asset-plan <id>` also execute, or only generate?** Only generate.
  Execution is the explicit `exec <id>` subcommand. Keeps the destructive step
  (running tools that write files) opt-in.
- **How do we resume mid-plan?** Plan file is the source of truth — milestone
  `status` field drives the executor's resume logic. No external state.
- **One plan per asset, or per (asset, engine)?** Per asset, with engine declared
  in frontmatter. Multi-engine deferred (spec OQ-5).

## 9. Out of plan (deferred to spec OQ list / future-work)

Everything in spec §10 stays out: AI-generated 2D refs, Unity/Unreal profiles, web
UI, asset-bundle planning, auto-budget enforcement, telemetry. Don't let scope
creep here — each is its own plan.

## 10. Acceptance: when is this feature "done"?

The plan is complete when **all spec acceptance criteria (AC-1 through AC-8) pass**
on a fresh clone after running through Phases 0–7. Phase 6 profiles beyond Blender
are not gating — only the Blender path needs to satisfy AC-1 through AC-5. Phase 8
is explicitly optional.
