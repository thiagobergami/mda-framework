---
id: MEC-003
name: MDA Logger — Structured Runtime Logging
traces_to_dynamics: [DYN-001]
scope: framework-tool
platform: roblox
language: luau
---

# MDA Logger — Structured Runtime Logging

## Purpose

A development-time logging system that tags every runtime event with its MDA layer and spec ID.
This enables AI to trace player experience issues back through the D→M chain using real runtime
data, rather than guessing from code alone.

**This is a framework tool, not a gameplay mechanic.** It has no player-facing aesthetics. It
exists to support the A→D→M debugging workflow described in CLAUDE.md. Every game mechanic
in the project should emit structured logs through this system.

The paper says: *"Seemingly inconsequential decisions about data, representation, algorithms,
tools, vocabulary and methodology will trickle upward, shaping the final gameplay."* The logger
makes that trickle-up visible.

## Player Affordances

None. This system is invisible to players. It outputs to the Roblox Developer Console (Output)
and optionally to an in-memory buffer for session analysis.

## Game Content

None.

## Core Concepts

### Log Entry Format

Every log entry follows this exact pattern:

```
[{TIMESTAMP}] [{LAYER}:{SPEC_ID}] [{LEVEL}] [{EVENT_TYPE}] {key=value pairs}
```

| Field | Format | Example |
|-------|--------|---------|
| TIMESTAMP | `MM:SS.mmm` relative to session start | `01:25.891` |
| LAYER | Single letter: `M`, `D`, `A`, `T` | `M` |
| SPEC_ID | Full spec ID | `MEC-001` |
| LEVEL | `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `PASS`, `FAIL` | `INFO` |
| EVENT_TYPE | UPPER_SNAKE_CASE action noun | `DISCOVERY` |
| Data | Space-separated `key=value` pairs | `spot=kitchen time=25.8s` |

### Log Levels

| Level | Purpose | When to use |
|-------|---------|-------------|
| `TRACE` | Per-frame data, very verbose | Position updates, continuous state (disabled by default) |
| `DEBUG` | Internal state changes | Variable assignments, branch decisions |
| `INFO` | Game events | Discoveries, hints, expressions, state transitions |
| `WARN` | Degraded behavior or near-miss | Invariant nearly violated, metric drifting out of range |
| `ERROR` | Broken contract or invariant | Invariant violation, impossible state reached |
| `PASS` | Invariant or proxy validated | Runtime check confirmed a spec constraint holds |
| `FAIL` | Invariant or proxy violated | Runtime check detected a spec constraint is broken |

### Correlation Groups

Events that happen in the same logical moment (e.g., a discovery triggers a log in MEC-001,
MEC-002, and DYN-001 simultaneously) share a **correlation ID**. This lets AI reconstruct
causal chains:

```
[00:25.891] [M:MEC-001] [INFO] [DISCOVERY] cid=7 spot=kitchen time=25.8s
[00:25.891] [M:MEC-002] [INFO] [EXPRESSION] cid=7 emotion=Giggle anim=giggle_02
[00:25.892] [D:DYN-001] [INFO] [FEEDBACK] cid=7 loop=DiscoveryAssistance hintsUsed=1
[00:25.892] [D:DYN-001] [PASS] [INVARIANT] cid=7 inv=INV-1 detail="25.8s < 50s"
```

Filtering by `cid=7` reconstructs the full causal chain for that discovery.

### Session Summaries

At session end (or on demand), the logger emits aggregate metrics that map directly to
aesthetic observable proxies:

```
[03:12.000] [A:AES-001] [INFO] [SESSION_SUMMARY] discoveries=6 median_time=24.1s duration=192s completed=true
[03:12.000] [A:AES-001] [PASS] [PROXY_CHECK] proxy=discovery_rate value=24.1s target=25s±10 status=IN_RANGE
[03:12.000] [A:AES-001] [PASS] [PROXY_CHECK] proxy=session_completion value=true target=>80%
[03:12.000] [D:DYN-001] [PASS] [INVARIANT_SUMMARY] passed=23 failed=0 warnings=1
```

## Rules

### Rule 1: Every Game Event Must Be Logged
- **Condition**: Any mechanic fires an event (DiscoveryEvent, HintEvent, ExpressionStarted, etc.)
- **Effect**: A structured log entry is emitted with correct layer, spec ID, and correlation ID
- **Guarantee**: No game event occurs silently. If it happened, it's in the log.

### Rule 2: Level Filtering
- **Condition**: Logger has a configured minimum level
- **Effect**: Entries below the minimum level are suppressed (not formatted, not printed)
- **Default**: `INFO` in production, `DEBUG` during development, `TRACE` when investigating specific issues

### Rule 3: Invariant Checks Are Logged
- **Condition**: A dynamic spec has invariants (INV-1, INV-2, etc.)
- **Effect**: Each invariant is checked at the relevant moment and logged as PASS or FAIL
- **Guarantee**: Every invariant check produces a log entry. FAIL entries also emit ERROR level.

### Rule 4: Session Summary at End
- **Condition**: Session ends (BedtimeEvent, player leaves, or manual trigger)
- **Effect**: Aggregated metrics are computed and logged as aesthetic proxy checks
- **Guarantee**: Every observable proxy from the aesthetic spec gets a PASS/FAIL entry

### Rule 5: Correlation ID Assignment
- **Condition**: A mechanic triggers a chain of events across specs
- **Effect**: The originating mechanic creates a correlation ID; all downstream events inherit it
- **Guarantee**: `cid` is present on every log entry within a causal chain

### Rule 6: No Performance Impact in Production
- **Condition**: Logger is disabled or set to ERROR level
- **Effect**: Log calls short-circuit before formatting. No string allocations, no table creation.
- **Guarantee**: Disabled logging adds < 0.01ms per frame overhead

## Behavioral Contract

### Inputs
- `layer`: String — "M", "D", "A", or "T"
- `specId`: String — Full spec ID (e.g., "MEC-001")
- `level`: LogLevel enum
- `eventType`: String — UPPER_SNAKE_CASE
- `data`: Dictionary of key-value pairs
- `correlationId`: Optional number — inherited from triggering event

### Outputs
- Formatted string to Roblox Output (`print` / `warn` / `error`)
- Entry appended to in-memory session buffer (for summary computation)
- `SessionSummary` table on session end

### Guarantees
- Log format is ALWAYS consistent (never free-form strings)
- Timestamps are ALWAYS relative to session start (never wall clock)
- Correlation IDs are ALWAYS monotonically increasing
- Session buffer does NOT grow unbounded (ring buffer with configurable max size)

## Acceptance Criteria

- [ ] `MDALogger.log(layer, specId, level, eventType, data)` produces correctly formatted output
- [ ] Output matches the exact pattern: `[{TS}] [{L}:{SID}] [{LVL}] [{EVT}] {k=v pairs}`
- [ ] Entries below configured level are suppressed entirely (no print call)
- [ ] `MDALogger.correlate()` returns a new monotonically increasing ID
- [ ] `MDALogger.checkInvariant(specId, invId, condition, detail)` logs PASS or FAIL
- [ ] `MDALogger.checkProxy(specId, proxyName, value, target, tolerance)` logs PASS/WARN/FAIL
- [ ] `MDALogger.summary()` computes and logs aggregate metrics for all tracked proxies
- [ ] Session buffer respects max size (oldest entries evicted)
- [ ] When level is set to `NONE`, no output is produced and no strings are allocated
- [ ] Timestamp rolls correctly past 59:59.999

## Integration Points

- **Fires**: None (it's a sink, not a source)
- **Listens**: All game events — every mechanic calls `MDALogger.log()`
- **Reads**: Session buffer (for summary computation), spec metadata (invariant/proxy definitions)
- **Writes**: Roblox Output, in-memory session buffer
