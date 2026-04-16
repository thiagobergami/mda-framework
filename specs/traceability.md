# Traceability Matrix

Bidirectional links between all spec layers. Use this to navigate in both directions:

- **Designer (M → D → A)**: Read left-to-right to understand what mechanics produce what experience
- **Player (A → D → M)**: Read right-to-left to trace an experience problem to its mechanical cause

## Matrix

| Aesthetic | Dynamic | Mechanic | Tuning | Assets | Validation Method |
|-----------|---------|----------|--------|--------|-------------------|
| *Add rows as specs are created* | | | | | |

| GAME-001 Test Game | — | — | — | — | Concept gate |

| GAME-001 Don't get virus | — | — | — | — | Concept gate |

## Reading Guide

### When implementing a new feature (M → D → A):

```
1. Find your MEC-* row
2. Read the DYN-* it traces to → understand what behavior should emerge
3. Read the AES-* it traces to → understand why this behavior matters
4. Read the TUN-* → know which parameters you can adjust
5. Check AST-* → know what assets exist and their status
6. Implement the mechanic
7. Validate: does the dynamic's invariants hold?
8. Validate: do the aesthetic's observable proxies hit their targets?
```

### When debugging a player experience issue (A → D → M):

```
1. Identify which AES-* aesthetic is failing (use the 8 categories)
2. Check the observable proxies — which one is out of range?
3. Find the DYN-* rows for that aesthetic → which feedback loop is broken?
4. Check the dynamic's invariants — are any violated?
5. Find the MEC-* rows → which rule or parameter is the cause?
6. Check the TUN-* → is the parameter within its valid range?
7. Adjust and re-validate
```

### When debugging with MDA logs (A → D → M with runtime data):

```
1. Read session output — filter for [FAIL] and [WARN] entries
2. Check [A:*] PROXY_CHECK lines — which aesthetic proxy is out of range?
3. Check [D:*] INVARIANT lines — which dynamic invariant failed?
4. Filter by the correlation ID (cid=N) of a failure — trace the full event chain
5. Read [M:*] lines in that chain — which mechanic event preceded the failure?
6. Cross-reference the mechanic spec — which rule or parameter is off?
7. Check the tuning spec — is the parameter within its valid range?
8. Adjust, re-run, compare new log output
```

### When tuning (A ↔ D ↔ M):

```
1. Read the TUN-* spec for the feature
2. Identify which parameter to adjust based on the target metric that's off
3. Check tuning constraints — will this change break any coupling?
4. Check known trade-offs — will improving one aesthetic degrade another?
5. Make the change (one parameter at a time)
6. Validate against DYN invariants first, then AES proxies
7. Log the iteration in the tuning spec
```

## Dependency Graph

```
GAME-001 {Game Concept}
  │
  ├──▶ AES-* {Aesthetic Specs}
  │      │
  │      └──▶ DYN-* {Dynamic Specs}
  │             │
  │             ├──▶ MEC-* {Mechanic Specs}
  │             │      ├──▶ TUN-* {Tuning Specs}
  │             │      └──▶ AST-* {Asset Specs}
  │             │
  │             └──▶ ... (more mechanics)
  │
  └──▶ ... (more aesthetics)

Framework Tools (cross-cutting):

  MEC-003 MDA Logger ◀── all MEC-*, DYN-*, AES-* specs
    ├── Validates DYN-* invariants at runtime
    ├── Validates AES-* observable proxies via session summaries
    └── Enables A→D→M debugging trace from log output

  Asset Catalog: specs/assets/catalog.md
    ├── Every AST-* traces to at least one MEC-* (where used)
    ├── Every AST-* traces to at least one AES-* (why it exists)
    └── Status: concept → placeholder → draft → final
```

*Update the graph above with actual spec IDs as features are specced.*

## Adding New Specs

When adding a new spec at any layer:

1. Assign the next sequential ID for that layer (AES-002, DYN-002, etc.)
2. Add its traceability links in the spec's frontmatter
3. Add a row to the matrix above
4. Update the dependency graph with actual spec IDs
5. Verify that no mechanic exists without a dynamic link (no "in vacuo" mechanics)
6. Run `src/tools/validate-specs.luau` to check integrity

When adding a new asset:

1. Assign the next `AST-{NNN}` ID
2. Create an asset spec in `specs/assets/` following `_schema.md`
3. Add it to `specs/assets/catalog.md` in the correct category table
4. Update the mechanic spec's Game Content section to reference the asset by ID
5. Update the dependency graph above to show the asset under its mechanic
6. Verify: asset traces to at least one MEC-* AND one AES-*
