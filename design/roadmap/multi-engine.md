# Multi-Engine Roadmap (parked)

> **Status: deferred** per
> [`design/decisions/2026-05-27-multi-engine.md`](../decisions/2026-05-27-multi-engine.md).
> Roblox is the only engine the framework targets today. Multi-engine work re-opens when a
> real game ships against Roblox and a real second-engine target arrives with a motivating
> game attached. Until then this document is **reference**, not roadmap — read it for the
> shape of the eventual abstraction, but expect the details to drift.

> Moved here from the repo root (`IMPROVEMENTS.md`) on 2026-05-27 as part of plan.html
> Week 1 task D1.DC2. The original prose is preserved below.

## Status by section (2026-05-27 review)

| §  | Section                                | Status        | Notes |
|----|----------------------------------------|---------------|-------|
| 1  | Engine Binding Layer                   | **deferred**  | `specs/bindings/` exists but has no instances; revisit when a second engine arrives. |
| 2  | Engine-Neutral Validator               | **superseded**| Built. Lives in `tools/src/` (cli.ts, rules/, gates/). Read `README.md` "CLI Usage" for the shipping behavior. |
| 3  | MCP Server Design & Implementation     | **deferred**  | No MCP server today; design notes here are speculative. M3+ work; not on V1-lite. |
| 4  | MDALogger Protocol & Multi-Engine Adapters | **deferred** | Logger stays Roblox-only per REVIEW RT2. Protocol formalization waits for a second engine. |
| 5  | Quality Gates & Refinement Loops       | **superseded**| Concept / aesthetic / dynamic / mechanic / implementation gates ship in `tools/src/gates/`. `mda gate <layer>` works. The "Vision Change Protocol" prose remains useful as design rationale. |
| 6  | Scaffolding CLI                        | **superseded**| `npx mda new <layer> <name>` exists. Wizard at `design/pipeline/cli/` (run via `npm run spec`) covers the guided flow. |
| 7  | AI Instructions Abstraction            | **still relevant** | `CLAUDE.md` is still Claude-specific. Abstraction not built and is low-priority — revisit if another AI tool gets adopted. |
| 8  | Playtest Protocol Spec Layer           | **still relevant** | Not built. Could land post-V1 once dogfood specs surface a real need. |
| 9  | Test Generation Pattern                | **deferred**  | Depends on the binding layer existing. Defer with §1. |
| 10 | Minor Fixes & Cleanup                  | **partially superseded** | 10.1, 10.2 done. 10.3 / 10.4 obsolete (new project structure already in CLAUDE.md and README.md). |

---

# MDA Framework — Improvement Plan (original — 2026-04-14)

The remainder of this document is the original Improvement Plan as it stood before the
2026-05-27 deferral. It outlined gaps identified in the framework and provided detailed
implementation steps to evolve it from a Roblox-specific spec system into a multi-engine
framework (Roblox Studio, Unity, Unreal Engine) connected via MCP (Model Context Protocol).
The work it described is still a plausible shape for multi-engine support if and when that
becomes a real requirement.

---

## Table of Contents

1. [Engine Binding Layer](#1-engine-binding-layer)
2. [Engine-Neutral Validator](#2-engine-neutral-validator)
3. [MCP Server Design & Implementation](#3-mcp-server-design--implementation)
4. [MDALogger Protocol & Multi-Engine Adapters](#4-mdalogger-protocol--multi-engine-adapters)
5. [Quality Gates & Refinement Loops](#5-quality-gates--refinement-loops)
6. [Scaffolding CLI](#6-scaffolding-cli)
7. [AI Instructions Abstraction](#7-ai-instructions-abstraction)
8. [Playtest Protocol Spec Layer](#8-playtest-protocol-spec-layer)
9. [Test Generation Pattern](#9-test-generation-pattern)
10. [Minor Fixes & Cleanup](#10-minor-fixes--cleanup)

---

## 1. Engine Binding Layer

### Problem

Mechanic and asset specs mix engine-agnostic behavior with Roblox-specific details. The
mechanic schema hardcodes `platform: roblox` and `language: luau`. The asset schema has a
"Roblox Integration" section with CollectionService tags and Roblox Attributes. This makes
it impossible to use the same specs for Unity or Unreal without rewriting them.

The spec layers above mechanics (concept, aesthetics, dynamics) are already engine-agnostic.
The contamination begins at the mechanic and asset layers.

### Goal

Separate every spec into an **engine-agnostic behavioral spec** and one or more
**engine-specific binding specs**. The behavioral spec defines WHAT the system does.
The binding spec defines HOW it maps to a specific engine's APIs, scene tree, and tooling.

### New Directory Structure

```
specs/
├── ... (existing spec dirs — now engine-agnostic)
├── mechanics/
│   └── {feature}.mec.md              # Behavioral contract only — no engine APIs
├── assets/
│   └── {name}.asset.md               # Emotional intent + behavioral equivalence only
└── bindings/
    ├── _schema.md                     # How to write binding specs
    ├── roblox/
    │   ├── {feature}.mec.bind.md      # Roblox-specific: services, instances, Luau patterns
    │   └── {name}.asset.bind.md       # Roblox-specific: R15 rig, CollectionService, hierarchy
    ├── unity/
    │   ├── {feature}.mec.bind.md      # Unity-specific: MonoBehaviour, prefabs, C# patterns
    │   └── {name}.asset.bind.md       # Unity-specific: Animator, prefab structure, layers
    └── unreal/
        ├── {feature}.mec.bind.md      # Unreal-specific: Blueprints, components, C++ patterns
        └── {name}.asset.bind.md       # Unreal-specific: skeletal mesh, anim blueprint, tags
```

### Implementation Steps

#### Step 1.1: Create the binding spec schema

Create `specs/bindings/_schema.md` with the following template:

```markdown
---
id: BIND-{NNN}
name: {Descriptive name}
engine: roblox | unity | unreal
binds_to: {MEC-NNN or AST-NNN — the spec this binding implements}
language: luau | csharp | cpp | blueprint
---

# {Name}

## Engine Mapping

### Scene Structure
{Where instances/objects live in the engine's hierarchy.}

### API Surface
{Which engine APIs are used — services, components, systems.}

### Data Representation
{How spec-level concepts map to engine-level types.
Example: "HidingSpot tag" → Roblox CollectionService tag / Unity layer + tag / Unreal GameplayTag}

### Input Mapping
{How player input is captured — engine-specific input system.}

### Asset References
{How code finds assets at runtime — tags, paths, addressables, asset registry.}

## Integration Code Pattern
{Pseudocode or real code showing the canonical implementation pattern for this engine.}

## Placeholder Protocol (Engine-Specific)
{How to create and swap placeholders using this engine's tooling.}

## Performance Notes
{Engine-specific performance constraints — draw calls, poly budgets, GC pressure, etc.}
```

#### Step 1.2: Refactor existing mechanic schemas

Remove engine-specific fields from `specs/mechanics/_schema.md`:

- Remove `platform: roblox` and `language: luau` from the frontmatter template
- Remove Roblox-specific API references from the template (UserInputService, CollectionService)
- Keep the behavioral contract, rules, acceptance criteria, and integration points
- Add a `## Engine Bindings` section at the bottom that links to the relevant `BIND-*` specs

#### Step 1.3: Refactor existing asset schemas

Split `specs/assets/_schema.md` into two parts:

**Keep in the asset spec (engine-agnostic):**
- Purpose, emotional intent, variants, placeholder behavioral equivalence
- Technical requirements expressed in universal terms (poly count, duration, spatial audio)
- Generic categories: model, animation, sound, music, texture, particle, ui

**Move to binding spec (engine-specific):**
- "Roblox Integration" section → `specs/bindings/roblox/{name}.asset.bind.md`
- CollectionService tags, Attributes, instance types, hierarchy paths
- R15/R6 rig specifics, AnimationPriority, `rbxassetid://` references

#### Step 1.4: Create an engine equivalence table

Add a file `specs/bindings/equivalence.md` that maps framework concepts to engine-specific
implementations. This is the Rosetta Stone for multi-engine development:

| Framework Concept | Roblox | Unity | Unreal |
|-------------------|--------|-------|--------|
| Scene tree root | `game` (DataModel) | `Scene` hierarchy | `World` / `Level` |
| Tagging system | CollectionService tags | Tags + Layers | GameplayTags |
| Attributes/metadata | Instance Attributes | Component fields | UProperties / DataAssets |
| Spatial audio | Sound.RollOffMode | AudioSource.spatialBlend | Attenuation settings |
| Character rig | R15 Humanoid | Humanoid Avatar + Animator | Skeletal Mesh + AnimBP |
| Pathfinding | PathfindingService | NavMeshAgent | AIController + NavMesh |
| Input system | UserInputService / ContextActionService | Input System package | Enhanced Input |
| Frame tick | RunService.Heartbeat | MonoBehaviour.Update | Tick / Event Tick |
| Asset loading | ReplicatedStorage / require | Addressables / Resources | AssetManager / SoftRef |
| Particle effects | ParticleEmitter | ParticleSystem / VFX Graph | Niagara / Cascade |
| State replication | ReplicatedStorage / RemoteEvents | Netcode / Mirror | Replication Graph |
| Scripting language | Luau | C# | C++ / Blueprint |

---

## 2. Engine-Neutral Validator

### Problem

`src/tools/validate-specs.luau` is written in Luau and requires a Luau runtime (Lune) to
execute outside Roblox. It has no file-reading entry point — `validateFromTables()` accepts
pre-parsed data but nothing reads `.md` files from disk. It cannot run in CI, cannot run
from Claude Code's terminal, and cannot serve other engines.

### Goal

A validator that runs anywhere with zero engine dependencies, can be integrated into CI
pipelines, and validates the full spec graph including the new binding layer.

### Implementation Steps

#### Step 2.1: Choose runtime — TypeScript (Node.js)

TypeScript is the best fit because:
- Claude Code users likely have Node.js installed
- Strong YAML/Markdown parsing libraries (gray-matter, remark)
- Can be packaged as a single CLI tool
- Types provide self-documentation

#### Step 2.2: Set up the project

```
tools/
├── package.json
├── tsconfig.json
├── src/
│   ├── cli.ts                    # Entry point: `npx mda-validate`
│   ├── parser.ts                 # Parse YAML frontmatter from .md files
│   ├── graph.ts                  # Build the spec dependency graph
│   ├── rules/
│   │   ├── trace-resolution.ts   # All trace references resolve
│   │   ├── no-vacuo.ts           # No mechanics without dynamic traces
│   │   ├── asset-traces.ts       # Assets trace to MEC + AES
│   │   ├── tuning-completeness.ts # Tuning traces to all 3 layers
│   │   ├── unique-ids.ts         # No duplicate IDs
│   │   ├── no-orphans.ts         # No unreferenced specs
│   │   ├── binding-coverage.ts   # NEW: every MEC/AST has at least one engine binding
│   │   ├── frontmatter-schema.ts # NEW: validate frontmatter fields match _schema.md
│   │   ├── concept-readiness.ts  # NEW: concept completeness gate (Section 5)
│   │   └── layer-gate.ts         # NEW: inter-layer quality gate checks (Section 5)
│   └── reporter.ts               # Format output (terminal, JSON, CI annotations)
└── tests/
    └── ...                        # Test the validator itself
```

#### Step 2.3: Implement the frontmatter parser

```typescript
// parser.ts — extract YAML frontmatter from spec markdown files
import matter from 'gray-matter';
import { glob } from 'glob';

interface SpecMeta {
  id: string | string[];
  name: string;
  layer: 'AES' | 'DYN' | 'MEC' | 'TUN' | 'AST' | 'GAME' | 'BIND';
  file: string;
  tracesTo: string[];
  engine?: string;       // for binding specs
  bindsTo?: string;      // for binding specs
  raw: Record<string, unknown>; // full frontmatter
}

function parseSpecFile(filePath: string): SpecMeta[] { ... }
function discoverSpecs(rootDir: string): SpecMeta[] { ... }
```

#### Step 2.4: Port all existing validation rules

Translate each validation function from `validate-specs.luau` to TypeScript:
- `validateTraceResolution` → `trace-resolution.ts`
- `validateNoVacuoMechanics` → `no-vacuo.ts`
- `validateAssetTraces` → `asset-traces.ts`
- `validateTuningCompleteness` → `tuning-completeness.ts`
- `validateUniqueIds` → `unique-ids.ts`
- `validateNoOrphans` → `no-orphans.ts`

#### Step 2.5: Add new validation rules

- **Binding coverage**: Every MEC and AST spec has at least one BIND spec for the project's target engines
- **Frontmatter schema**: Validate that frontmatter fields match what the `_schema.md` expects (correct field names, required fields present, valid enum values)
- **Concept readiness**: Validate the concept spec passes the Concept Readiness Gate (see Section 5)
- **Layer gate**: Validate that a spec layer passes its quality gate before downstream layers are authored (see Section 5)
- **ID format**: IDs match the `{LAYER}-{NNN}` pattern with correct prefix for the directory
- **Cross-reference consistency**: If MEC-001 says it fires `DiscoveryEvent`, check that something listens for it

#### Step 2.6: CLI interface

```bash
# Validate all specs in the current project
npx mda validate

# Validate specs for a specific engine
npx mda validate --engine roblox

# Output JSON for CI integration
npx mda validate --format json

# Validate a specific spec and its trace chain
npx mda validate --spec MEC-001 --trace

# Validate a single layer's quality gate (see Section 5)
npx mda gate concept
npx mda gate aesthetics
npx mda gate dynamics
```

#### Step 2.7: Keep the Luau validator as a thin wrapper

Don't delete `validate-specs.luau` — refactor it to call the TypeScript validator via
`os.execute()` or to accept the same JSON format. This lets Roblox Studio plugins trigger
validation without leaving the engine.

---

## 3. MCP Server Design & Implementation

### Problem

There is no MCP (Model Context Protocol) infrastructure at all. The framework has no way to:
- Read runtime state from a running game engine
- Push parameter changes to a live game session
- Receive MDA log events in real time
- Validate invariants against live data

MCP is the bridge between the spec framework (which lives in the filesystem and Claude Code)
and the game engines (which run their own processes).

### Goal

An MCP server that exposes the framework's capabilities as tools, and engine-specific MCP
clients (plugins) that connect game engines to Claude Code.

### Architecture

```
┌─────────────────┐     MCP (stdio/SSE)     ┌──────────────────────┐
│   Claude Code   │ ◄────────────────────►   │  MDA MCP Server      │
│   (AI Client)   │                          │  (TypeScript)         │
└─────────────────┘                          │                      │
                                             │  Tools:              │
                                             │  - read_spec         │
                                             │  - validate          │
                                             │  - list_specs        │
                                             │  - get_trace_chain   │
                                             │  - get_runtime_logs  │
                                             │  - check_invariants  │
                                             │  - push_parameter    │
                                             │  - get_scene_state   │
                                             │  - list_assets       │
                                             └──────┬───────────────┘
                                                    │
                                          HTTP / WebSocket / IPC
                                                    │
                        ┌───────────────────────────┼───────────────────────────┐
                        ▼                           ▼                           ▼
              ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
              │  Roblox Plugin  │        │  Unity Extension │        │  Unreal Plugin  │
              │  (Luau HTTP)    │        │  (C# WebSocket) │        │  (C++ WebSocket)│
              │                 │        │                  │        │                 │
              │  - Reads state  │        │  - Reads state   │        │  - Reads state  │
              │  - Streams logs │        │  - Streams logs  │        │  - Streams logs │
              │  - Applies      │        │  - Applies       │        │  - Applies      │
              │    parameters   │        │    parameters    │        │    parameters   │
              └─────────────────┘        └──────────────────┘        └─────────────────┘
```

### Implementation Steps

#### Step 3.1: Define MCP tool schemas

Create `mcp/tools.json` defining every tool the server exposes:

```json
{
  "tools": [
    {
      "name": "read_spec",
      "description": "Read a spec file by its ID (e.g., MEC-001) or by file path. Returns the full markdown content and parsed frontmatter.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "specId": { "type": "string", "description": "Spec ID like AES-001, MEC-002" },
          "filePath": { "type": "string", "description": "Direct file path (alternative to specId)" }
        }
      }
    },
    {
      "name": "validate_specs",
      "description": "Run the spec validator. Returns errors, warnings, and stats.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "engine": { "type": "string", "enum": ["roblox", "unity", "unreal"], "description": "Validate bindings for a specific engine" },
          "specId": { "type": "string", "description": "Validate a single spec and its trace chain (optional)" }
        }
      }
    },
    {
      "name": "list_specs",
      "description": "List all specs, optionally filtered by layer or engine.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "layer": { "type": "string", "enum": ["AES", "DYN", "MEC", "TUN", "AST", "BIND", "GAME"] },
          "engine": { "type": "string", "enum": ["roblox", "unity", "unreal"] }
        }
      }
    },
    {
      "name": "get_trace_chain",
      "description": "Given a spec ID, return its full trace chain in both directions (M→D→A and A→D→M).",
      "inputSchema": {
        "type": "object",
        "properties": {
          "specId": { "type": "string" },
          "direction": { "type": "string", "enum": ["up", "down", "both"], "default": "both" }
        },
        "required": ["specId"]
      }
    },
    {
      "name": "get_runtime_logs",
      "description": "Fetch MDA-formatted logs from the running game engine. Requires an active engine connection.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "filter": { "type": "string", "description": "Filter string (e.g., '[FAIL]', 'cid=7', '[M:MEC-001]')" },
          "limit": { "type": "number", "default": 100 },
          "level": { "type": "string", "enum": ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"] }
        }
      }
    },
    {
      "name": "check_invariants",
      "description": "Validate dynamic invariants against the latest runtime data. Returns pass/fail per invariant.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "specId": { "type": "string", "description": "DYN spec ID to check invariants for" }
        }
      }
    },
    {
      "name": "push_parameter",
      "description": "Update a tuning parameter in the running game engine. The engine applies it live.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "parameter": { "type": "string", "description": "Parameter name from a TUN spec" },
          "value": { "type": "number" },
          "tunSpecId": { "type": "string", "description": "TUN spec ID for validation" }
        },
        "required": ["parameter", "value"]
      }
    },
    {
      "name": "get_scene_state",
      "description": "Read current game state from the engine — positions, counters, active entities.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string", "description": "What to read (e.g., 'player_position', 'baby_sleepiness', 'all_hiding_spots')" }
        }
      }
    }
  ]
}
```

#### Step 3.2: Implement the MCP server

```
mcp/
├── package.json
├── tsconfig.json
├── src/
│   ├── server.ts                  # MCP server entry point (stdio transport)
│   ├── tools/
│   │   ├── read-spec.ts
│   │   ├── validate-specs.ts      # Wraps the validator from section 2
│   │   ├── list-specs.ts
│   │   ├── trace-chain.ts
│   │   ├── runtime-logs.ts        # Proxies to engine connection
│   │   ├── check-invariants.ts
│   │   ├── push-parameter.ts      # Proxies to engine connection
│   │   └── scene-state.ts         # Proxies to engine connection
│   ├── engine/
│   │   ├── connection.ts          # Abstract engine connection interface
│   │   ├── roblox-adapter.ts      # HTTP connection to Roblox plugin
│   │   ├── unity-adapter.ts       # WebSocket connection to Unity extension
│   │   └── unreal-adapter.ts      # WebSocket connection to Unreal plugin
│   └── spec-index.ts              # In-memory index of all specs for fast lookup
└── claude-config.json             # Claude Code MCP server config snippet
```

The server runs as a local process that Claude Code connects to via stdio.

#### Step 3.3: Define the engine adapter protocol

The MCP server talks to engines via a simple HTTP/WebSocket protocol. Define a shared API
contract that every engine plugin must implement:

```
POST /mda/logs          → Returns buffered MDA log entries
POST /mda/state         → Returns requested game state
POST /mda/parameter     → Applies a tuning parameter change
POST /mda/ping          → Health check
WebSocket /mda/stream   → Real-time log streaming
```

This is the **internal protocol** between the MCP server and engine plugins. Claude Code
never sees this — it only sees the MCP tools.

#### Step 3.4: Implement Roblox Studio plugin (first engine)

Create a Roblox Studio plugin that:
- Starts an HTTP server on localhost (using HttpService or a companion process)
- Buffers MDA log output from the running game
- Exposes game state via the `/mda/state` endpoint
- Applies parameter changes to live game values via `/mda/parameter`
- Connects to the MCP server on game start

```
engine-plugins/
├── roblox/
│   ├── MDABridge.server.luau       # ServerScript: log buffer + state reader
│   ├── MDAPlugin.luau              # Studio Plugin: HTTP endpoints + UI panel
│   └── README.md                   # Setup instructions
```

#### Step 3.5: Implement Unity extension (second engine)

```
engine-plugins/
├── unity/
│   ├── MDABridge.cs                # MonoBehaviour: log buffer + state reader
│   ├── MDAEditorWindow.cs          # Editor window: connection status + log viewer
│   ├── MDAWebSocketServer.cs       # WebSocket server for MCP connection
│   └── README.md
```

#### Step 3.6: Implement Unreal plugin (third engine)

```
engine-plugins/
├── unreal/
│   ├── MDABridge.h / .cpp          # Actor component: log buffer + state reader
│   ├── MDAEditorModule.h / .cpp    # Editor module: WebSocket server
│   └── README.md
```

#### Step 3.7: Claude Code configuration

Provide a ready-to-use MCP server config that users add to their Claude Code settings:

```json
{
  "mcpServers": {
    "mda-framework": {
      "command": "node",
      "args": ["./mcp/dist/server.js"],
      "env": {
        "MDA_SPECS_DIR": "./specs",
        "MDA_ENGINE": "roblox",
        "MDA_ENGINE_PORT": "3001"
      }
    }
  }
}
```

---

## 4. MDALogger Protocol & Multi-Engine Adapters

### Problem

`MDALogger.luau` is the only runtime component and it's Roblox-only. For multi-engine
support, the log format needs to be a specification, and each engine needs its own adapter.

### Goal

A formalized log protocol spec, plus adapters for each engine that emit compatible logs.
Optionally, the adapters send logs to the MCP server for real-time validation.

### Implementation Steps

#### Step 4.1: Formalize the log format as a spec

Create `specs/mechanics/mda-log-protocol.mec.md` (replaces the current `mda-logger.mec.md`
as the canonical reference):

The log format spec should define:
- Exact text format: `[{TS}] [{LAYER}:{SPEC_ID}] [{LEVEL}] [{EVENT_TYPE}] {k=v pairs}`
- Structured JSON format (alternative): `{"ts": "01:25.891", "layer": "M", "spec": "MEC-001", ...}`
- Level definitions (TRACE through FAIL)
- Correlation ID semantics
- Session summary format
- Invariant check format
- Proxy check format

Both text and JSON formats should be supported. Text for human reading in engine consoles.
JSON for machine parsing by the MCP server.

#### Step 4.2: Refactor MDALogger.luau as the Roblox adapter

Keep the existing Luau implementation in `engine-plugins/roblox/MDALogger.luau`. Add:
- JSON output mode (for MCP bridge consumption)
- HTTP POST mode (send logs to the MCP server's engine adapter endpoint)
- A config flag to switch between console-only and bridge mode

#### Step 4.3: Create Unity adapter — MDALogger.cs

```csharp
// engine-plugins/unity/MDALogger.cs
public static class MDALogger
{
    public static void Info(string layer, string specId, string eventType,
                            Dictionary<string, object> data = null, int? cid = null) { ... }
    public static int Correlate() { ... }
    public static void CheckInvariant(string specId, string invId,
                                       bool condition, string detail = null) { ... }
    public static void CheckProxy(string specId, string proxyName,
                                   float value, float target, float tolerance) { ... }
    public static void Summary() { ... }
}
```

Same API surface as the Luau version, same log format output. Uses `Debug.Log()` /
`Debug.LogWarning()` / `Debug.LogError()` instead of Roblox's `print()` / `warn()`.

#### Step 4.4: Create Unreal adapter — MDALogger.h/.cpp

```cpp
// engine-plugins/unreal/MDALogger.h
class MDAFRAMEWORK_API FMDALogger
{
public:
    static void Info(const FString& Layer, const FString& SpecId,
                     const FString& EventType, const TMap<FString, FString>& Data,
                     int32 CorrelationId = -1);
    static int32 Correlate();
    static void CheckInvariant(const FString& SpecId, const FString& InvId,
                                bool Condition, const FString& Detail = TEXT(""));
    static void Summary();
};
```

Uses `UE_LOG` with a custom log category. Same format, same semantics.

#### Step 4.5: Create a log analyzer (engine-neutral)

A TypeScript tool that reads MDA logs (text or JSON) and produces reports:

```bash
# Analyze a log file
npx mda analyze-logs session.log

# Filter and summarize
npx mda analyze-logs session.log --failures-only --summary
```

This tool lives in `tools/` alongside the validator and can be used by the MCP server
for the `check_invariants` tool.

---

## 5. Quality Gates & Refinement Loops

### Problem

The current workflow (`specs/WORKFLOW.md`) lists 8 sequential steps but has no enforcement
mechanism. There is nothing preventing a designer from writing a vague two-sentence concept
and immediately jumping to mechanic specs. There is no check that an aesthetic spec's
proxies are actually measurable before dynamics are designed around them. And once
implementation begins, there is no structured process for what happens when runtime data
reveals that a core design assumption — not just a parameter — needs to change.

Three specific gaps:

1. **Concept quality**: A poor or incomplete concept poisons everything downstream. "A cool
   adventure game" is not a concept — it's a wish. The framework needs a gate that prevents
   moving forward until the concept is concrete enough to generate useful specs.

2. **Inter-layer validation**: Each spec layer has implicit quality requirements, but nothing
   checks them before the next layer is authored. A dynamic spec built on an aesthetic spec
   with unmeasurable proxies will produce mechanics that can't be validated.

3. **Vision change during implementation**: The current workflow treats debugging as tuning
   (adjust parameters until proxies pass). But sometimes the A→D→M trace reveals that
   the problem is not a parameter — it's a wrong assumption in the concept itself. The
   framework needs a structured process for propagating vision changes back through the
   spec chain without losing all prior work.

### Goal

A system of **quality gates** between each phase of the workflow, automated where possible,
that ensures each layer is sound before downstream work begins. Plus a **vision change
protocol** that handles controlled re-specification when runtime data invalidates a core
design assumption.

### 5.1: Concept Readiness Gate

Before ANY aesthetic spec is written, the concept must pass this gate. It can be run by the
AI, by the designer self-checking, or by the validator.

#### The Gate: 6 checks

```
CONCEPT READINESS GATE
══════════════════════

Required to pass: ALL 6 checks

CHECK 1 — VISION CLARITY
  Can the game be explained in 2 sentences using aesthetic vocabulary?
  ✗ FAIL: "A cool game where you do stuff"
  ✓ PASS: "A co-op Discovery game where players carry lanterns through a dark forest,
           revealing hidden creatures that react to light"
  Rule: If the vision uses the words "fun", "gameplay", or "cool" without specifying
        WHICH aesthetic, it is too vague.

CHECK 2 — AESTHETIC COMMITMENT
  Is there exactly ONE primary aesthetic? Are at least 2 aesthetics marked Absent?
  ✗ FAIL: All 8 aesthetics listed as "important"
  ✗ FAIL: Two aesthetics marked Primary
  ✓ PASS: Discovery primary, 2 secondary, 2 tertiary, 3 absent
  Rule: A game that tries to be everything is nothing. The Absent list is as important
        as the Primary — it tells AI what NOT to build.

CHECK 3 — CORE LOOP COHERENCE
  Does the core loop directly serve the primary aesthetic? Is it a cycle (not linear)?
  ✗ FAIL: Loop serves a secondary aesthetic but not the primary
  ✗ FAIL: Loop is a sequence with no return to start
  ✓ PASS: "Search → Reveal → Journal → Search deeper" serves Discovery (primary)
  Rule: The core loop is the heart of the game. If it doesn't deliver the primary
        aesthetic, the game will feel confused regardless of how good individual
        features are.

CHECK 4 — BOUNDARY DEFINITION
  Are there at least 3 explicit "this is NOT" boundaries?
  ✗ FAIL: No boundaries section, or only 1 vague boundary
  ✓ PASS: "Not a combat game, not a puzzle game, not a horror game — each with
           WHY it's excluded (which aesthetic it would undermine)"
  Rule: Boundaries prevent AI from adding unwanted features and prevent scope creep.
        Each boundary should name which aesthetic it would violate.

CHECK 5 — FEATURE TRACEABILITY
  Does every feature in the feature map trace to at least one aesthetic?
  ✗ FAIL: Feature listed as "Settings menu" with no aesthetic connection
  ✗ FAIL: Feature has no primary aesthetic listed
  ✓ PASS: Every feature row has a Primary Aesthetic column filled
  Rule: If a feature doesn't serve an aesthetic, it either doesn't belong or
        needs to be reframed so its purpose is clear.

CHECK 6 — SCOPE REALISM
  Are there no more than 4-6 "Must-have" features? Does session length match feature count?
  ✗ FAIL: 12 features all marked Must-have
  ✗ FAIL: Session length is 5 minutes but there are 8 features that each need 2+ min
  ✓ PASS: 3 Must-have, 2 Should-have, 1 Nice-to-have; session length supports them
  Rule: A concept with 12 must-haves isn't a concept — it's a wishlist. Force
        prioritization now rather than discovering scope problems during implementation.
```

#### How it runs

```bash
# CLI gate check
npx mda gate concept

# Output:
#   Concept Readiness Gate: specs/concept/lantern-woods.concept.md
#   [PASS] Vision clarity — uses aesthetic vocabulary, no vague terms
#   [PASS] Aesthetic commitment — 1 primary, 2 secondary, 3 absent
#   [PASS] Core loop coherence — primary loop serves Discovery (primary)
#   [PASS] Boundary definition — 3 explicit boundaries with aesthetic rationale
#   [PASS] Feature traceability — all 6 features map to aesthetics
#   [WARN] Scope realism — 4 Must-have features (max recommended: 4-6) — borderline
#   RESULT: PASSED (5 pass, 1 warn, 0 fail)
#   ✓ Concept is ready for aesthetic spec authoring
```

#### Refinement loop

If the concept doesn't pass, the designer and AI enter a refinement loop:

```
Designer provides rough idea
         │
         ▼
┌─────────────────┐
│  AI drafts      │
│  concept spec   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Run concept    │────▶│  All 6 checks    │──── yes ──▶  GATE PASSED
│  readiness gate │     │  pass?           │             proceed to AES
└─────────────────┘     └────────┬─────────┘
                                 │ no
                                 ▼
                        ┌──────────────────┐
                        │  AI identifies   │
                        │  failing checks  │
                        │  and proposes    │
                        │  specific fixes  │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  Designer reviews│
                        │  and refines     │──── loop back to gate
                        │  (may add vision,│
                        │  cut features,   │
                        │  clarify bounds) │
                        └──────────────────┘

The key is that AI doesn't just say "concept is vague" — it says exactly WHICH
check failed and proposes a concrete fix. For example:

  CHECK 2 FAILED: Two aesthetics marked Primary (Discovery and Fellowship).
  Suggested fix: Make Discovery primary, Fellowship secondary. When they
  conflict (e.g., solo discovery vs co-op requirement), Discovery wins.
  Rewrite the Conflicts section to state this resolution.

The designer either accepts the fix or provides their own. Then re-run the gate.
This loop typically takes 2-4 iterations for a rough idea.
```

### 5.2: Inter-Layer Quality Gates

Each spec layer has its own gate that must pass before the NEXT layer can be authored.
Gates are cumulative — the mechanic gate checks mechanics AND re-checks that aesthetics
and dynamics still pass.

#### Gate structure

```
CONCEPT ──gate──▶ AESTHETICS ──gate──▶ DYNAMICS ──gate──▶ MECHANICS ──gate──▶ TUNING/ASSETS/BINDINGS
   │                  │                    │                   │                      │
   │                  │                    │                   │                      │
   ▼                  ▼                    ▼                   ▼                      ▼
 Checks:           Checks:             Checks:             Checks:               Checks:
 • Vision clarity  • Every feature     • Every AES has    • Every DYN has       • Every [TUNABLE]
 • Aesthetic         from concept        at least 1 DYN     at least 1 MEC       in MEC appears
   commitment        has AES spec      • Every DYN has    • No MEC "in vacuo"     in a TUN spec
 • Core loop       • Every proxy is     feedback loops   • Behavioral           • Every MEC/AST
   coherence         measurable          identified         contracts have         has a BIND
 • Boundaries        (has a unit,      • Every invariant    concrete I/O         for target engine
 • Feature map       a threshold,        is binary        • Acceptance           • Ranges don't
   traceability      and a method)        (pass/fail)        criteria are           conflict with
 • Scope realism   • Every anti-       • Degenerate         testable (not          invariants
                     pattern has a       dynamics            subjective)
                     detection signal    named with        • Integration
                   • No aesthetic        prevention          points complete
                     conflicts with      strategies          (fires/listens
                     concept profile   • Feedback balance    documented)
                                         checked (no
                                         uncapped positive
                                         loops)
```

#### How it runs

```bash
# Check if you can proceed from aesthetics to dynamics
npx mda gate dynamics

# Output:
#   Aesthetic → Dynamic Gate
#   [PASS] AES-002: All 4 proxies are measurable (have unit + threshold + method)
#   [FAIL] AES-003: Anti-pattern "creature fatigue" has no detection signal
#          → How would you detect that players stop caring about creatures?
#          → Suggestion: "Average pause duration at reveal drops below 0.5s
#             for 3 consecutive reveals"
#   RESULT: BLOCKED (1 fail)
#   Fix AES-003 anti-pattern before writing DYN specs
```

#### Gate rules

The gates enforce one critical principle: **never build on a shaky foundation.** A dynamic
spec built on an aesthetic with unmeasurable proxies will produce mechanics that can't be
validated. A mechanic built on a dynamic with vague invariants will produce code with no
acceptance criteria.

**Gates are advisory by default, blocking in strict mode.** The designer can override a gate
with `npx mda gate dynamics --override "reason for proceeding"`. The override is logged in
the traceability matrix so the team knows which gates were skipped and why. This avoids the
framework becoming bureaucratic while preserving accountability.

### 5.3: The Implementation-Debug Loop

### Problem

The current workflow treats implementation (Phase 3 in the simulation) and debugging
(Phase 4) as separate sequential phases. In reality they form a tight loop where every
playtest session feeds back into the next implementation cycle. More critically, the
loop sometimes reveals that the problem is not a parameter value or a code bug — it's a
wrong assumption in the concept, aesthetic, or dynamic spec.

The framework needs to distinguish between three types of corrections and handle each
differently:

1. **Tuning fix** — A parameter is out of range. Change the number, retest. No spec change.
2. **Implementation fix** — Code doesn't match the spec. Fix the bug, retest. No spec change.
3. **Vision change** — A core design assumption is wrong. The spec itself needs to change,
   and the change may cascade through multiple layers.

### The Loop

```
                    ┌──────────────────────────────────────────────────┐
                    │           THE IMPLEMENTATION-DEBUG LOOP           │
                    │                                                  │
                    │   This is NOT a waterfall. Implementation and    │
                    │   debugging are a single continuous cycle.       │
                    └──────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │  Implement  │ ◄──────────────────────┐
                              │  feature    │                        │
                              │  from spec  │                        │
                              └──────┬──────┘                        │
                                     │                               │
                                     ▼                               │
                              ┌─────────────┐                        │
                              │  Playtest   │                        │
                              │  in engine  │                        │
                              └──────┬──────┘                        │
                                     │                               │
                                     ▼                               │
                              ┌─────────────┐                        │
                              │  Analyze    │                        │
                              │  MDA logs   │                        │
                              └──────┬──────┘                        │
                                     │                               │
                            ┌────────┴────────┐                      │
                            ▼                 ▼                      │
                     All proxies         Some proxies                │
                     IN_RANGE            OUT_OF_RANGE                │
                     all invariants      or invariants               │
                     PASS                FAIL                        │
                            │                 │                      │
                            ▼                 ▼                      │
                     ┌─────────────┐   ┌─────────────┐              │
                     │  FEATURE    │   │  Diagnose   │              │
                     │  VALIDATED  │   │  A → D → M  │              │
                     └─────────────┘   └──────┬──────┘              │
                                              │                      │
                                     ┌────────┼────────┐             │
                                     ▼        ▼        ▼             │
                               ┌────────┐┌────────┐┌────────┐       │
                               │ Tuning ││  Bug   ││ Vision │       │
                               │  fix   ││  fix   ││ change │       │
                               └───┬────┘└───┬────┘└───┬────┘       │
                                   │         │         │             │
                                   │         │         ▼             │
                                   │         │    VISION CHANGE      │
                                   │         │    PROTOCOL           │
                                   │         │    (see below)        │
                                   │         │         │             │
                                   └─────────┴─────────┴─────────────┘
                                         loop back to Implement
```

### Tuning Fix Path (fast — minutes)

```
Diagnosis: Parameter is within spec range but the value is wrong.
Action:
  1. AI proposes new value within TUN range
  2. Designer confirms
  3. push_parameter via MCP → live game updates
  4. Retest immediately
  5. If proxy passes → update TUN iteration log, done
  6. If proxy still fails → re-diagnose (might escalate to bug or vision change)
Spec changes: TUN iteration log only. No other specs touched.
```

### Implementation Fix Path (medium — hours)

```
Diagnosis: Code doesn't match the mechanic spec's behavioral contract.
Action:
  1. AI identifies which MEC acceptance criterion is failing
  2. AI fixes the code to match the spec
  3. Resync to engine → retest
  4. If proxy passes → done
  5. If proxy still fails → re-diagnose
Spec changes: None. The spec was correct; the code was wrong.
```

### Vision Change Path (slow — may take a session)

```
Diagnosis: The A→D→M trace reveals that a spec-level assumption is wrong. The
mechanic can't produce the dynamic because the dynamic was designed around a
wrong assumption. OR the aesthetic proxy targets are unrealistic. OR a core loop
doesn't serve the primary aesthetic as assumed.

This is the hard case. The fix isn't a number or a bug — it's a design change.
```

#### Vision Change Protocol

When the implementation-debug loop reveals a spec-level problem, follow this protocol:

```
Step 1: IDENTIFY THE CHANGE SCOPE
────────────────────────────────

Ask: "Which layer is wrong?"

  a) MECHANIC only — the rules can't produce the dynamic, but the dynamic goal is correct
     Scope: Re-spec MEC → re-check gate → re-implement
     Example: "Creature detection uses raycasting but should use area detection"

  b) DYNAMIC — the feedback system design is wrong
     Scope: Re-spec DYN → cascades to MEC → re-check gates → re-implement
     Example: "Negative feedback loop should be positive — creatures should be HARDER
               to find as you discover more, not easier"

  c) AESTHETIC — the experience target is wrong or the proxy targets are unrealistic
     Scope: Re-spec AES → cascades to DYN → cascades to MEC → significant rework
     Example: "Discovery isn't the right primary aesthetic — this game is actually
               about Fellowship (playing together), Discovery is secondary"

  d) CONCEPT — the game vision itself needs to change
     Scope: Re-spec GAME → cascades through everything → major rework
     Example: "Co-op doesn't work for this game — it should be single-player"


Step 2: DRAFT THE CHANGE AS A PROPOSAL
───────────────────────────────────────

Before modifying any spec, AI writes a Vision Change Proposal (VCP):

  ┌──────────────────────────────────────────────────────────┐
  │ VISION CHANGE PROPOSAL                                   │
  │                                                          │
  │ Trigger: {What failed — which proxy/invariant/criterion} │
  │ Root cause: {Why the spec is wrong, not just a tuning}   │
  │ Change scope: Mechanic | Dynamic | Aesthetic | Concept   │
  │                                                          │
  │ Proposed change:                                         │
  │   {Spec ID}: {What changes — old value → new value}      │
  │   {Spec ID}: {What changes — old value → new value}      │
  │                                                          │
  │ Cascade impact:                                          │
  │   {List every downstream spec that needs updating}       │
  │   {List every implementation file that needs rewriting}  │
  │                                                          │
  │ What we KEEP:                                            │
  │   {Specs and code that are NOT affected}                 │
  │   {Why they survive the change}                          │
  │                                                          │
  │ Risk: {What could go wrong with this change}             │
  │ Alternative: {Is there a smaller change that might work?}│
  └──────────────────────────────────────────────────────────┘

The VCP is critical because it forces the AI and designer to:
  - Understand the full blast radius before making changes
  - Consider whether a smaller-scope fix exists
  - Explicitly identify what prior work survives (not everything is lost)


Step 3: DESIGNER DECIDES
─────────────────────────

The designer reviews the VCP and chooses:

  ACCEPT    → proceed to Step 4
  REDUCE    → "Can we fix this at a lower layer?" → AI re-analyzes for a smaller scope
  REJECT    → "The current spec is fine, find another approach" → AI re-diagnoses
  DEFER     → "Park this, work on other features first" → log as known issue


Step 4: APPLY THE CHANGE TOP-DOWN
──────────────────────────────────

Changes are applied in MDA order (top-down), re-running the quality gate at each layer:

  If scope is Concept:
    1. Modify GAME spec → re-run concept readiness gate
    2. Modify affected AES specs → re-run aesthetic gate
    3. Modify affected DYN specs → re-run dynamic gate
    4. Modify affected MEC specs → re-run mechanic gate
    5. Modify affected TUN/AST/BIND specs
    6. Re-implement affected code
    7. Retest

  If scope is Aesthetic:
    1. Modify AES spec → re-run aesthetic gate
    2. Modify affected DYN specs → re-run dynamic gate
    3. ... (same cascade, starting lower)

  If scope is Dynamic:
    1. Modify DYN spec → re-run dynamic gate
    2. Modify affected MEC specs → re-run mechanic gate
    3. ... (same cascade)

  If scope is Mechanic:
    1. Modify MEC spec → re-run mechanic gate
    2. Re-implement → retest

At each layer, only specs marked in the VCP's cascade list are modified.
Everything else is verified to still be valid (gates catch any breakage).


Step 5: LOG THE CHANGE
──────────────────────

Every vision change is recorded in `specs/traceability.md` under a new section:

  ### Vision Change Log

  | Date | Trigger | Scope | Specs Modified | Summary |
  |------|---------|-------|---------------|---------|
  | 2026-04-14 | INV-2 failing | Dynamic | DYN-002, MEC-004, TUN-002 | Changed creature reveal from instant to two-phase (peek + reveal) |

This creates an institutional memory of WHY specs changed, not just WHAT changed.
Future designers (and AI) can read this to understand the design's evolution.
```

#### Example: A vision change in practice

```
Context: Lantern Woods. During playtesting, the designer notices that players
in co-op are ignoring each other — they each explore alone.

Log data:
  [A:AES-002] [FAIL] [PROXY_CHECK] proxy=coop_clustering value=0.15 target=0.70

A→D→M trace:
  AES-002 → DYN-003 (Co-op Exploration) → MEC-004 (Lantern Merge)

Diagnosis:
  Lantern merge is a nice bonus but not necessary. Players can find every creature
  solo. There's no MECHANICAL REASON to cooperate. The co-op dynamic (DYN-003) assumed
  merge would be incentive enough, but it's not.

This is NOT a tuning fix (no parameter makes solo play impossible).
This is NOT a bug (merge works correctly when players are near each other).
This IS a vision change — DYN-003 needs a mechanic that REQUIRES cooperation.

VCP:
  Trigger: coop_clustering at 0.15 (target 0.70)
  Root cause: No creature requires 2+ lanterns to reveal. Solo is always sufficient.
  Scope: Dynamic (DYN-003) + Mechanic (MEC-005)
  Proposed: Add "Rare Creatures" that require merged lantern light to reveal.
            This forces co-op for completionists (Journal 100%) while keeping
            solo viable for casual play.
  Cascade: DYN-003 (add forced co-op pattern), MEC-005 (add rare creature rules),
           TUN-003 (add rare creature parameters), AST-007 (add rare creature variants)
  Keep: AES-002 (aesthetic goal unchanged), DYN-002 (solo reveal cycle unchanged),
        MEC-004 (lantern system unchanged, merge already works)
  Risk: Rare creatures may feel gated/frustrating for solo players
  Alternative: Could instead make merge reveal creatures FASTER (not exclusively)
               — less disruptive but may not be strong enough incentive

Designer chooses: ACCEPT the rare creature approach, but also add the "faster reveal"
as a secondary benefit of merge.

Apply top-down:
  1. DYN-003: Add "Forced Cooperation" interaction pattern → gate passes
  2. MEC-005: Add rare creature detection rules (require merged light) → gate passes
  3. TUN-003: Add rareCreatureCount, mergeRevealSpeedBonus params → gate passes
  4. Re-implement MEC-005 → retest → coop_clustering rises to 0.62 → retest with
     speed bonus → 0.71 → PASS
```

### 5.4: Implementation in the Validator

Add these gate commands to the CLI tool from Section 2:

```bash
# Run a specific gate
npx mda gate concept                    # Concept readiness gate
npx mda gate aesthetics                 # Aesthetic quality gate
npx mda gate dynamics                   # Dynamic quality gate
npx mda gate mechanics                  # Mechanic quality gate
npx mda gate implementation             # Pre-implementation gate (all above + bindings)

# Run all gates in sequence (full pipeline check)
npx mda gate all

# Override a failing gate (logs the override reason)
npx mda gate dynamics --override "Proxy method TBD — will define during implementation"

# Check what's blocking the next layer
npx mda gate next                       # Finds the lowest blocked gate
```

Gate check results are stored in `specs/.gate-status.json` so AI can read them:

```json
{
  "concept": { "status": "passed", "timestamp": "2026-04-14T10:30:00Z", "warnings": 1 },
  "aesthetics": { "status": "passed", "timestamp": "2026-04-14T11:00:00Z", "warnings": 0 },
  "dynamics": { "status": "blocked", "timestamp": "2026-04-14T11:30:00Z", "failures": [
    { "spec": "AES-003", "check": "anti_pattern_detection", "message": "..." }
  ]},
  "mechanics": { "status": "not_run" },
  "implementation": { "status": "not_run" }
}
```

---

## 6. Scaffolding CLI

### Problem

Creating a new spec requires manually:
- Choosing the next sequential ID
- Copying the schema template
- Filling in frontmatter
- Adding entries to the traceability matrix
- Adding entries to the asset catalog (for assets)

This is error-prone and tedious. A CLI tool can automate the mechanical parts.

### Implementation Steps

#### Step 6.1: Add CLI commands to the tools package

Extend the `tools/` TypeScript project from section 2 with scaffolding commands:

```bash
# Create a new game concept
npx mda new concept my-game

# Create a new aesthetic spec (auto-assigns AES-002 if AES-001 exists)
npx mda new aesthetic discovery-system

# Create a new mechanic spec (requires at least one DYN spec to exist)
npx mda new mechanic movement --traces-to DYN-001

# Create a new asset spec
npx mda new asset player-character --type model --traces-to MEC-001,AES-001

# Create a new binding spec
npx mda new binding roblox/movement --binds-to MEC-001

# Create a new tuning spec
npx mda new tuning difficulty --traces-to MEC-001,DYN-001,AES-001
```

#### Step 6.2: Auto-assign IDs

The CLI scans existing specs, finds the highest ID for the target layer, and assigns the
next sequential number. Example: if `AES-001` and `AES-002` exist, the next spec gets `AES-003`.

#### Step 6.3: Prerequisite checking

Before creating a spec, the CLI validates that prerequisites exist AND their quality gate
passes (see Section 5):

- Aesthetic spec: requires the concept gate to pass
- Dynamic spec: requires the aesthetic gate to pass
- Mechanic spec: requires the dynamic gate to pass
- Tuning/Asset/Binding spec: requires the mechanic gate to pass

If a gate hasn't passed, the CLI warns: "Aesthetic gate has not passed. Run `npx mda gate
aesthetics` first, or use `--skip-gate` to proceed anyway."

#### Step 6.4: Auto-update traceability

After creating a spec, the CLI:
1. Adds a row to `specs/traceability.md`
2. Updates the dependency graph section
3. For asset specs: adds a row to `specs/assets/catalog.md`

#### Step 6.5: Template customization

Allow projects to override the default templates. If `specs/{layer}/_template.md` exists,
use it instead of the schema's template block. This lets teams add project-specific sections.

---

## 7. AI Instructions Abstraction

### Problem

`CLAUDE.md` is specific to Claude Code. If users want to use this framework with Cursor,
GitHub Copilot, Windsurf, or other AI tools, they need equivalent instruction files. The
instructions also contain Roblox-specific guidance mixed with framework-general guidance.

### Goal

A layered instruction system:

```
framework-general instructions (any AI, any engine)
    └── engine-specific instructions (any AI, one engine)
        └── tool-specific instructions (one AI tool, one engine)
```

### Implementation Steps

#### Step 7.1: Create a generic AI instructions file

Create `AI_INSTRUCTIONS.md` at the project root with all engine-agnostic framework guidance:
- MDA dual perspective explanation
- How to read specs (concept → aesthetic → dynamic → mechanic)
- When to use designer perspective (M→D→A) vs player perspective (A→D→M)
- The 8 aesthetic categories
- How to read traceability
- Spec authoring workflow with quality gates
- The implementation-debug loop and vision change protocol
- Debugging workflow (without engine-specific log commands)

#### Step 7.2: Create engine-specific instruction fragments

```
docs/ai/
├── AI_INSTRUCTIONS.md              # Generic (imported by all tool-specific files)
├── engines/
│   ├── roblox.md                   # Roblox-specific: services, Luau patterns, Studio workflow
│   ├── unity.md                    # Unity-specific: C# patterns, Editor workflow
│   └── unreal.md                   # Unreal-specific: C++/BP patterns, Editor workflow
```

#### Step 7.3: Refactor CLAUDE.md to import the generic instructions

`CLAUDE.md` becomes a thin wrapper:
- Imports (references) `AI_INSTRUCTIONS.md` for the framework content
- Imports the engine-specific fragment for the project's target engine
- Adds Claude-specific guidance (MDA logger usage, MCP tool usage, etc.)

#### Step 7.4: Add other AI tool configs

- `.cursorrules` — Cursor-specific, referencing the same generic instructions
- `.github/copilot-instructions.md` — GitHub Copilot instructions
- These reference the same core `AI_INSTRUCTIONS.md` content

---

## 8. Playtest Protocol Spec Layer

### Problem

The framework defines observable proxies and invariants but has no structured way to define
HOW to validate them through playtesting. There's no spec for:
- What scenarios to test
- What data to collect during a playtest
- How to analyze results
- When a feature transitions from "needs tuning" to "validated"

### Goal

A new spec layer for playtest protocols that connects aesthetic proxies to concrete testing
procedures.

### Implementation Steps

#### Step 8.1: Create the playtest spec schema

Create `specs/playtests/_schema.md`:

```markdown
---
id: PLT-{NNN}
name: {Descriptive name}
traces_to_aesthetics: [{AES-NNN IDs being validated}]
traces_to_dynamics: [{DYN-NNN IDs being validated}]
target_engine: roblox | unity | unreal | any
---

# {Name}

## Test Goal
{What aesthetic/dynamic is being validated and what "passing" looks like.}

## Scenarios
### Scenario {N}: {Name}
- **Setup**: {Initial game state required}
- **Player action**: {What the tester does}
- **Expected dynamic**: {What behavior should emerge}
- **Proxies to measure**: [{list of observable proxies from AES spec}]
- **Invariants to check**: [{list of invariants from DYN spec}]
- **Pass criteria**: {Concrete threshold}

## Data Collection
{What data the MDA logger must capture during this test.}
- {Metric}: {How to collect it}

## Analysis
{How to interpret the collected data. Include formulas, thresholds, and decision rules.}

## Iteration Triggers
{When do test results indicate a need for tuning vs a design change?}
- If {condition}: adjust {TUN parameter}
- If {condition}: revisit {DYN spec}
- If {condition}: revisit {AES spec}
```

#### Step 8.2: Integrate with the MCP server

Add a `run_playtest` MCP tool that:
1. Reads the playtest spec
2. Configures the MDA logger to capture the required metrics
3. Runs the test scenario (or prompts the tester)
4. Collects and analyzes results
5. Returns a pass/fail report with recommendations

---

## 9. Test Generation Pattern

### Problem

Mechanic specs have acceptance criteria written as human-readable checklists. There's no
framework for turning these into actual automated tests. Each engine has its own test
framework (Roblox TestEZ, Unity NUnit/Test Runner, Unreal Gauntlet/Automation Framework),
and there's no bridge between the spec's criteria and runnable tests.

### Implementation Steps

#### Step 9.1: Define a test mapping convention

In binding specs, add a `## Test Mapping` section that maps each acceptance criterion to
an engine-specific test:

```markdown
## Test Mapping

| Acceptance Criterion (from MEC-001) | Test Function | Framework |
|--------------------------------------|--------------|-----------|
| Player moves at configured walk speed | `TestPlayerWalkSpeed()` | TestEZ |
| Baby never selects the same spot as previous cycle | `TestBabySpotVariation()` | TestEZ |
| Discovery triggers within 1 frame of range entry | `TestDiscoveryTriggerTiming()` | TestEZ |
```

#### Step 9.2: Create test templates per engine

```
engine-plugins/
├── roblox/tests/
│   └── _template.spec.luau         # TestEZ boilerplate that reads spec metadata
├── unity/tests/
│   └── _template.cs                # NUnit boilerplate
└── unreal/tests/
    └── _template.cpp               # Automation test boilerplate
```

Each template shows the canonical pattern for testing MDA invariants and acceptance
criteria in that engine.

#### Step 9.3: CLI command for test scaffolding

```bash
# Generate test stubs for a mechanic's acceptance criteria
npx mda gen-tests MEC-001 --engine roblox
# Output: engine-plugins/roblox/tests/MEC-001.spec.luau with one test per criterion
```

---

## 10. Minor Fixes & Cleanup

### Step 10.1: Fix mechanic schema rule inconsistency

`specs/dynamics/_schema.md` Rule 6 says "No code" but the example mechanic specs (MEC-001,
MEC-002) include Luau code in their "MDA Logger Integration" sections. This is actually
useful — update the dynamic schema rule to say:

> "No implementation code — dynamic specs describe behavior, not implementation. Code
> examples belong in mechanic specs."

And update the mechanic schema to explicitly encourage logger integration examples.

### Step 10.2: Fix MEC-003 traceability

`specs/mechanics/mda-logger.mec.md` traces to `DYN-001` which is the baby-chase example's
dynamic spec. The logger is a framework tool, not a game mechanic. Remove
`traces_to_dynamics: [DYN-001]` and add a `scope: framework` field that exempts it from
the "no vacuo" validation rule. Update the validator to skip "in vacuo" checks for
`scope: framework` specs.

### Step 10.3: Update the project structure in CLAUDE.md and README.md

After implementing the binding layer, MCP server, and tooling, the project structure
sections need to reflect the new directories:

```
specs/
├── bindings/                        # NEW: engine-specific mappings
│   ├── _schema.md
│   ├── equivalence.md
│   ├── roblox/
│   ├── unity/
│   └── unreal/
├── playtests/                       # NEW: test protocols
│   └── _schema.md

tools/                               # NEW: replaces src/tools/
├── package.json
├── src/
│   ├── cli.ts                       # Validator + scaffolding + gates
│   └── ...

mcp/                                 # NEW: MCP server
├── package.json
├── src/
│   └── server.ts
│   └── ...

engine-plugins/                      # NEW: engine-specific runtime code
├── roblox/
│   ├── MDALogger.luau               # Moved from src/shared/
│   ├── MDABridge.server.luau
│   └── MDAPlugin.luau
├── unity/
│   ├── MDALogger.cs
│   └── MDABridge.cs
└── unreal/
    ├── MDALogger.h / .cpp
    └── MDABridge.h / .cpp

docs/ai/                             # NEW: AI instructions
├── AI_INSTRUCTIONS.md
└── engines/
    ├── roblox.md
    ├── unity.md
    └── unreal.md
```

### Step 10.4: Update .gitignore

Add ignores for the new tooling:

```
.claude
node_modules/
tools/dist/
mcp/dist/
*.js.map
specs/.gate-status.json
```

### Step 10.5: Add a CONTRIBUTING.md

Since this is becoming a multi-engine framework, document:
- How to add a new engine (create adapter, binding schema, test templates)
- How to add a new spec layer (create schema, update validator, update CLI)
- How to extend the MCP server with new tools
- How to contribute example games

---

## Implementation Priority & Dependencies

```
Phase 1: Foundation (can be done in parallel)
├── [1] Engine Binding Layer          — unlocks multi-engine specs
├── [2] Engine-Neutral Validator      — unlocks CI and reliable validation
└── [5] Quality Gates                 — unlocks safe spec authoring

Phase 2: Bridge (requires Phase 1)
├── [4] MDALogger Protocol            — requires binding layer design
├── [3] MCP Server (spec tools only)  — requires validator
└── [6] Scaffolding CLI               — requires validator + gates

Phase 3: Engine Integration (requires Phase 2)
├── [3] MCP Server (runtime tools)    — requires engine plugins
├── [3] Roblox Plugin                 — requires MCP protocol
├── [3] Unity Extension               — requires MCP protocol
└── [3] Unreal Plugin                 — requires MCP protocol

Phase 4: Polish (requires Phase 3)
├── [7] AI Instructions Abstraction   — requires stable multi-engine structure
├── [8] Playtest Protocol Layer       — requires MCP runtime tools
├── [9] Test Generation Pattern       — requires binding layer + engine plugins
└── [10] Minor Fixes & Cleanup        — ongoing
```

### Suggested order of work

1. **Quality gates + validator** (Section 5 + 2) — the gates ARE the validator's most
   important rules; build them together
2. **Engine binding layer** (Section 1) — establishes the multi-engine architecture
3. **Scaffolding CLI** (Section 6) — accelerates everything after this point
4. **MDALogger protocol** (Section 4) — formalizes the runtime contract
5. **MCP server (spec tools)** (Section 3, steps 3.1-3.2) — Claude Code can read/validate specs
6. **Roblox engine plugin** (Section 3, step 3.4) — first engine integration
7. **MCP server (runtime tools)** (Section 3, step 3.3) — live game debugging
8. **Unity + Unreal plugins** (Section 3, steps 3.5-3.6) — additional engines
9. **AI instructions + playtest + test gen + cleanup** (Sections 7-10) — polish
