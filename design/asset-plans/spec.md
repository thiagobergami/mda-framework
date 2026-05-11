---
id: FEAT-asset-plan
title: Asset Implementation Pipeline (MCP-driven)
status: draft
owner: thiago
created: 2026-05-06
branch: feature/asset-plan
format: spec-driven-development (spec.md)
---

# Asset Implementation Pipeline

## 1. Overview

The framework already produces canonical asset *intent* in `specs/assets/{name}.asset.md`
(emotional intent, placeholder protocol, status). It does **not** know how to actually
*build* those assets in production tools.

This feature adds an **asset implementation pipeline**: a CLI-driven, MCP-aware tool that
takes an `.asset.md` spec, collects user-provided references, and produces a versioned,
executable **implementation plan** for the appropriate authoring tool (Blender, Photoshop,
Reaper, Substance, Mixamo, Houdini, or the target engine itself). Plans execute via MCP
with milestone checkpoints; the user reviews each milestone before continuing. After final
approval, the produced asset is imported into the engine when supported.

**Design boundary.** This feature lives entirely in `design/asset-plans/` — it consumes
M/D/A specs and produces iterative, versioned design artifacts. It introduces no new
aesthetic, dynamic, or mechanic primitives.

## 2. Goals

1. **G1.** Translate `.asset.md` intent into an executable, tool-specific build plan.
2. **G2.** Cover all six asset categories: 3D, 2D, audio, animation, VFX, terrain/lighting.
3. **G3.** Maintain visual/audio consistency by deriving style constraints from the
   concept spec, the parent AES spec, and a global style guide.
4. **G4.** Provide milestone-level checkpointing — execute via MCP, pause at named
   milestones for human review.
5. **G5.** Version every plan run so revisions are traceable in git.
6. **G6.** Import the final asset into the engine when an engine-import path exists.
7. **G7.** Be engine-agnostic in structure (Roblox profile ships v1, others can be added
   without changes to the pipeline core).

## 3. Non-Goals

- **NG1.** *Not* generating finished assets autonomously without user input or review.
- **NG2.** *Not* maintaining its own asset-status truth — `specs/assets/` remains the
  source of truth for `concept | placeholder | final`. The plan tracks plan-execution
  status, separately.
- **NG3.** *Not* setting up MCP servers — the pipeline assumes the user has installed the
  MCPs they need (Blender MCP, etc.). Missing MCPs degrade gracefully (plan still
  generated, executable blocks marked `requires`).
- **NG4.** *Not* a replacement for the `npm run spec` wizard — separate command, separate
  artifact tree.
- **NG5.** *Not* generating *new* M/D/A specs from references. The asset spec must
  already exist.

## 4. User Stories

### US-1 — Batch plan after level design
> As a designer, after I finish a level spec in `design/levels/`, I run
> `npm run asset-plan` and the tool scans every asset referenced by the level, finds
> those without an approved plan, and walks me through producing one for each.

### US-2 — Single asset, on demand
> As a developer, I have a specific character asset I want to start building. I run
> `npm run asset-plan AST-007`, drop reference images into the refs folder when
> prompted, and get a Blender plan I can execute.

### US-3 — Iterate on a rejected milestone
> As a designer, I executed a plan and the topology milestone produced a poor result.
> I reject the milestone, optionally edit the plan inline, and re-execute from that
> milestone forward — without redoing earlier steps.

### US-4 — Engine import after approval
> As a developer, after the final milestone is approved, the pipeline imports the
> asset into the engine (Roblox: `.fbx` import to a target folder + tag/attribute
> wiring per the asset spec's Placeholder Protocol).

### US-5 — Music plan from a hummed reference
> As a composer, I drop a reference WAV (or just text) into refs, and the tool
> generates a Reaper plan with project setup, instrumentation, structure, and mix
> milestones.

### US-6 — MCP unavailable
> As a developer working without the Blender MCP installed, the plan is still
> generated as a human-readable doc. Executable blocks are marked
> `requires: blender-mcp` and the executor refuses to run them, but I can follow the
> plan manually.

## 5. Functional Requirements

### CLI
- **FR-1.** `npm run asset-plan` (no args) scans every asset referenced by any spec or
  level whose own `.asset.md` lacks an `approved` plan, and offers to plan each.
- **FR-2.** `npm run asset-plan <asset-id>` plans a single asset.
- **FR-3.** `npm run asset-plan <asset-id> --resume` resumes from the last unapproved
  milestone of the latest plan version.
- **FR-4.** `npm run asset-plan <asset-id> --new-version` forks a new plan version from
  the latest approved one (carries the iteration log forward).
- **FR-5.** `npm run asset-plan --list` shows every asset and its plan status.

### Asset → Tool routing
- **FR-6.** Routing is declared in `design/asset-plans/_routing.md` (table form).
  Asset types match the `type:` field in `specs/assets/_schema.md`. v1 defaults:

  | Asset type | Tool      |
  |------------|-----------|
  | model      | Blender   |
  | animation  | Mixamo    |
  | sound      | Reaper    |
  | music      | Reaper    |
  | texture    | Substance |
  | particle   | Houdini   |
  | ui         | Photoshop |

  Simple particles can be authored directly in the engine by overriding the
  asset's frontmatter with `tool: engine-native` (skips external authoring).

- **FR-7.** The user can override routing per asset by setting `tool:` in the
  `.asset.md` frontmatter (validated against existing tool profiles).

### Reference intake
- **FR-8.** When a plan is initiated, the CLI creates
  `design/asset-plans/{asset-id}/refs/` if missing and prompts the user to drop the
  expected inputs there.
- **FR-9.** Required inputs are declared by the tool profile per asset type:
  - 3D / 2D / Texture / VFX: ≥1 image
  - Music: ≥1 text description OR ≥1 audio file
  - Animation: ≥1 text description OR ≥1 video reference
  - Terrain / lighting: derived from level spec, no required ref
- **FR-10.** The CLI blocks plan generation until inputs are present, with a clear list
  of what's missing.

### Plan generation
- **FR-11.** The plan is generated by combining: the `.asset.md` spec, the parent AES
  spec(s), `specs/concept/{game}.concept.md`, `design/asset-plans/_style-guide.md`, the
  matched tool profile, and user-provided references.
- **FR-12.** The plan is written to
  `design/asset-plans/{asset-id}/{asset-id}.v{N}.plan.md` where `N` increments per run.
- **FR-13.** The plan format is fixed (see §7 Data Model). Milestones are declared by
  the tool profile.
- **FR-14.** Each milestone block contains: description, prerequisites, MCP tool calls
  (executable), validation criteria, expected artifacts.

### Plan execution
- **FR-15.** `npm run asset-plan exec <asset-id>` executes the latest approved-or-draft
  plan via MCP, milestone by milestone.
- **FR-16.** After each milestone the executor pauses and prompts the user with:
  `accept | reject-and-revise | reject-and-stop`.
- **FR-17.** On `accept`, the milestone's `status` flips to `executed` and the next
  milestone runs.
- **FR-18.** On `reject-and-revise`, the user opens the plan, edits the milestone (or
  any later one), and resumes — earlier executed milestones are not re-run.
- **FR-19.** Executed milestones append a row to the plan's iteration log with timestamp,
  user verdict, and any notes.
- **FR-20.** If a required MCP is unavailable, executable blocks are skipped and the
  user is told to perform that milestone manually before continuing.

### Style consistency
- **FR-21.** The plan generator pulls aesthetic constraints from three sources, in this
  precedence order: AES spec → concept spec → `_style-guide.md`. AES wins on conflict.
- **FR-22.** Style constraints are surfaced explicitly in the plan's `Style Sources`
  section so the user can audit *why* the plan asks for a particular palette, mood, or
  polycount.

### Engine import
- **FR-23.** After every milestone is approved, the pipeline runs the engine profile's
  `import` step: places the artifact at the path defined by the asset spec, applies the
  CollectionService tag(s) and attributes per the Placeholder Protocol.
- **FR-24.** Roblox-only in v1. Import is gated by an engine profile in
  `design/asset-plans/_engines/{engine}.md`.
- **FR-25.** After successful import, the plan's frontmatter `status:` advances to
  `imported` and the asset spec's status field is suggested (not forced) to advance.

### Validation
- **FR-26.** `npx mda validate` is extended with an `asset-plan-integrity` rule that
  checks: every plan references a real asset, every tool reference resolves to a tool
  profile, every status transition is legal, no orphan plans.

## 6. Architecture

```
                 ┌─────────────────────────┐
                 │  npm run asset-plan     │  ← user CLI
                 └──────────┬──────────────┘
                            │
       ┌────────────────────▼────────────────────┐
       │           Pipeline core                 │
       │   (design/asset-plans/cli/)             │
       │                                         │
       │  • Routing resolver                     │
       │  • Reference intake                     │
       │  • Plan generator                       │
       │  • Plan executor (MCP client)           │
       │  • Status state machine                 │
       │  • Engine import dispatcher             │
       └─┬─────────┬──────────┬─────────┬────────┘
         │         │          │         │
   reads │   reads │   loads  │  invokes│
         │         │          │         │
   ┌─────▼──┐ ┌────▼────┐ ┌───▼────┐ ┌──▼──────────────┐
   │ M/D/A  │ │ Style   │ │ Tool   │ │ MCP servers     │
   │ specs  │ │ sources │ │ profile│ │ (blender,       │
   │        │ │ (concept│ │ + engine│ │  reaper, …)    │
   │        │ │  + AES  │ │ profile│ │                 │
   │        │ │  + sg)  │ │        │ │                 │
   └────────┘ └─────────┘ └────────┘ └─────────────────┘
                                              │
                                       writes │
                                              ▼
                          design/asset-plans/{id}/
                          ├── refs/                ← user input
                          ├── {id}.v1.plan.md      ← generated plan
                          ├── {id}.v2.plan.md
                          └── output/              ← MCP-produced artifacts
```

### Component responsibilities

- **Routing resolver** — reads `_routing.md` + asset frontmatter override, returns the
  tool profile to use.
- **Reference intake** — ensures the right inputs exist in `refs/`, blocks if missing.
- **Plan generator** — constructs the plan markdown by stitching style sources + tool
  profile milestones + asset spec data.
- **Plan executor** — walks milestones, dispatches MCP calls, pauses for verdict, writes
  to iteration log.
- **State machine** — owns `draft → approved → executed → imported` transitions; refuses
  illegal moves.
- **Engine import dispatcher** — invokes the engine profile's import step; out of scope
  for v1 except Roblox.

### Tool profiles (`_tools/{tool}.md`)
A tool profile declares everything the pipeline needs to know about that tool:
- which asset types it serves,
- required inputs,
- ordered list of milestones,
- per-milestone MCP calls (templated),
- expected outputs and validation,
- handoff format (e.g. Blender → `.fbx`; Substance → texture set).

v1 ships profiles for: Blender, Photoshop, Reaper, Substance, Mixamo, Houdini.

### Engine profiles (`_engines/{engine}.md`)
- which file formats it accepts,
- how to invoke import (Roblox: `.fbx` via Studio MCP or RBXM packing),
- where to place imported artifacts,
- how to apply CollectionService tags and Attributes from the asset spec.

v1 ships only `_engines/roblox.md`.

## 7. Data Model

### Plan file (`{asset-id}.v{N}.plan.md`)

```markdown
---
id: PLAN-AST-007-v1
asset-id: AST-007
version: 1
status: draft            # draft | approved | executed | imported
tool: blender
engine: roblox
created: 2026-05-06
created-by: <user>
references:
  asset-spec: specs/assets/hero-character.asset.md
  aes-specs: [AES-002]
  concept: specs/concept/virus-hunter.concept.md
  style-guide: design/asset-plans/_style-guide.md
inputs:
  - refs/front.png
  - refs/side.png
milestones:
  - id: M1-blockout
    status: pending      # pending | executed | rejected | skipped-mcp
  - id: M2-topology
    status: pending
  - id: M3-uv
    status: pending
  - id: M4-texture
    status: pending
  - id: M5-rig
    status: pending
  - id: M6-export
    status: pending
---

# {Asset name} — Implementation Plan v1

## Goal
One-paragraph statement of what we're building, derived from the asset spec.

## References
List of input files in `refs/`.

## Style Sources
Bulleted, sourced constraints. Each line ends with `(source: AES-002 §Mood)` style
attribution so a reader can audit where each constraint came from.

## Milestones

### M1 — Blockout
**Description.** …
**Prerequisites.** Inputs present, scene initialized.
**MCP calls.**
```mcp
tool: blender
call: scene.new
args: { units: meters, scale: 1.0 }
```
**Validation.** Silhouette readable from front and side views.
**Expected artifact.** `output/M1-blockout.blend`

### M2 — Topology
…

## Iteration Log
| When | Milestone | Verdict | Notes |
|------|-----------|---------|-------|
| 2026-05-06 14:32 | M1 | accepted | clean silhouette |
```

### Tool profile (`_tools/{tool}.md`)

```markdown
---
id: TOOL-blender
name: Blender
mcp-required: blender-mcp
asset-types: [3d-model, animation, vfx-simple]
---

# Blender — Tool Profile

## Required inputs (per asset type)
- 3d-model: ≥1 image (front view recommended; side view optional)
- animation: existing rigged model + text or video reference

## Milestones (3d-model)
1. **M1 — Blockout** — primitive volumes match silhouette
2. **M2 — Topology** — clean quad mesh, edge flow
3. **M3 — UV** — unwrap, no overlaps
4. **M4 — Texture** — base color, normal, roughness
5. **M5 — Rig** — armature + weights (skip if static)
6. **M6 — Export** — `.fbx`, axes Y-up, scale 1.0

(each milestone block contains the MCP call template + validation rules)
```

### Engine profile (`_engines/roblox.md`)

```markdown
---
id: ENGINE-roblox
name: Roblox
mcp-required: roblox-studio-mcp
import-formats: [.fbx, .obj, .png, .wav, .mp3]
---

# Roblox — Engine Profile

## Import path resolution
Reads `target-path:` from the asset spec, falls back to `ReplicatedStorage/Assets/{type}/`.

## Tag and attribute wiring
For each entry in the asset spec's Placeholder Protocol, applies CollectionService tags
and Attributes via the Roblox Studio MCP.

## Import steps
1. Validate file format vs `import-formats`
2. Invoke MCP `studio.importAsset`
3. Move to target path
4. Apply tags + attributes
5. Save place file
```

### Routing table (`_routing.md`)
Single markdown table, see FR-6.

### Style guide (`_style-guide.md`)
Hand-authored, global constraints: palette ranges, polycount targets per category,
audio key/tempo conventions, naming conventions. Concept spec and AES specs override.

## 8. Open Questions

- **OQ-1.** Should the executor be allowed to *generate* the reference image when the
  user has none (e.g. Photoshop MCP via SD)? Currently NG-1 says no — but for 2D
  concept art this might be too restrictive. Defer to v2.
- **OQ-2.** Mixamo's MCP coverage is uncertain — the v1 plan may need to be a
  human-readable upload-and-download recipe rather than fully executable.
- **OQ-3.** Houdini → Roblox VFX pipeline: bake to image sequences? To particle data?
  Define when the Houdini profile is authored.
- **OQ-4.** Does plan approval auto-update the asset spec's status to `placeholder` or
  `final`? Current FR-25 says *suggest*, not force — reconfirm during implementation.
- **OQ-5.** Multi-engine: when we add Unity later, does an asset have one plan per
  engine, or one plan with multiple import targets?

## 9. Acceptance Criteria

A reviewer can verify v1 ships when:

- **AC-1.** `npm run asset-plan AST-XXX` for a 3D asset with 1+ reference image
  produces `design/asset-plans/AST-XXX/AST-XXX.v1.plan.md` containing all six Blender
  milestones with executable MCP blocks.
- **AC-2.** Running the executor pauses after each milestone and persists the verdict
  in the iteration log.
- **AC-3.** Rejecting M3 and editing the plan, then resuming, re-runs M3 and onward
  but not M1–M2.
- **AC-4.** With Blender MCP uninstalled, the plan still generates and the executor
  refuses to run executable blocks while still walking the user through milestones.
- **AC-5.** After the final milestone is approved, the Roblox import step places the
  `.fbx` at the asset spec's target path and applies tags/attributes.
- **AC-6.** `npx mda validate` passes with the new `asset-plan-integrity` rule on a
  repo containing 1+ approved plan and 1+ orphan-free spec.
- **AC-7.** Running `npm run asset-plan` (no args) after a level spec is created lists
  every referenced asset without an approved plan.
- **AC-8.** Style sources section of a generated plan attributes every constraint to
  AES / concept / style-guide so a reviewer can audit provenance.

## 10. Future work (out of v1)

- AI-generated 2D references when the user has none (OQ-1).
- Unity / Unreal engine profiles.
- Web-UI front-end on top of the CLI (the existing `design/pipeline/web/` deferred work).
- Asset-bundle planning (multiple related assets — e.g. enemy + its weapon + its SFX —
  planned together with shared style anchor).
- Auto-budget enforcement (polycount/texture/audio-length budgets pulled from tuning
  specs).
- Telemetry: feed execution outcomes back into the iteration log of the source AES /
  DYN / MEC specs.
