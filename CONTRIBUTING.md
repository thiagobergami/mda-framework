# Contributing to MDA Spec Framework

## Development Setup

```bash
# Clone and install
git clone <this-repo>
cd framework
npm install

# Build the CLI tool
cd tools
npx tsc

# Verify it works
cd ..
npx mda validate
```

### Rebuilding After Changes

The CLI source lives in `tools/src/`. After editing TypeScript files:

```bash
cd tools && npx tsc && cd ..
```

Or use watch mode during development:

```bash
cd tools && npx tsc --watch
```

## Project Layout

| Directory | Contents | Language |
|-----------|----------|----------|
| `tools/src/` | CLI tool (validator, gates, scaffolding) | TypeScript |
| `specs/` | Spec schemas, glossary, workflow | Markdown |
| `src/shared/` | Runtime logger module | Luau |
| `src/tools/` | Legacy Luau validator | Luau |

## How to Contribute

### Adding a New Validation Rule

1. Create `tools/src/rules/{rule-name}.ts` exporting a `ValidationRule`
2. The rule receives a `SpecGraph` and returns `Diagnostic[]`
3. Register it in `tools/src/rules/index.ts` by importing and adding to `allRules`
4. Rebuild and test: `npx tsc && cd .. && npx mda validate`

```typescript
import type { Diagnostic, ValidationRule, SpecGraph } from "../types.js";

export const myRule: ValidationRule = {
  name: "my-rule",
  description: "What this rule checks",
  run(graph: SpecGraph): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    // Check specs via graph.specs, graph.byLayer, graph.inbound, graph.outbound
    return diagnostics;
  },
};
```

### Adding a New Quality Gate

1. Create `tools/src/gates/{layer}-gate.ts` with a function returning `GateCheckResult[]`
2. Register it in `tools/src/gates/index.ts`
3. Gate checks inspect `SpecContent` (body text + sections), not just frontmatter

### Adding a New Spec Layer

1. Create the directory under `specs/` with a `_schema.md`
2. Add the layer prefix to `LAYER_PREFIXES` in `tools/src/parser.ts`
3. Add the layer to the `SpecLayer` type in `tools/src/types.ts`
4. Add scaffolding template in `tools/src/scaffold.ts`
5. Add relevant validation rules and gate checks

### Modifying Spec Schemas

Spec schemas (`specs/*/_schema.md`) define the template for each layer. When changing them:

- Keep schemas engine-agnostic — engine details go in binding specs
- Update the corresponding scaffold template in `tools/src/scaffold.ts`
- Update any gate checks that reference section names
- Run `npx mda validate` to ensure existing specs still pass

## Conventions

### Spec IDs

- Format: `{LAYER}-{NNN}` (e.g., `AES-001`, `MEC-003`)
- IDs are sequential within each layer
- Use `npx mda new` to auto-assign the next ID

### Traces

- Frontmatter fields like `traces_to_dynamics: [DYN-001]` create edges in the spec graph
- Every trace must resolve to an existing spec ID (validated by `trace-resolution` rule)
- Mechanics must trace to dynamics (no "in vacuo" mechanics)
- Assets must trace to both mechanics and aesthetics

### Framework-Tool Exemption

Specs with `scope: framework-tool` (or any `scope` starting with `framework`) are exempt
from trace-resolution, no-vacuo, and orphan checks. This is for cross-cutting tools like
the MDA Logger that don't fit the normal M->D->A chain.

### Scoped Validation

- `specs/` is the main validation scope
- Each `examples/*/` directory is an isolated scope
- Cross-scope trace references are not validated

## Commit Messages

Use conventional-style messages that describe the *why*:

```
Add quality gates to enforce spec completeness between layers

Gates check markdown body content (not just frontmatter) to verify
specs are ready before proceeding to the next MDA layer.
```

## Running Checks

```bash
# Full validation
npx mda validate

# Specific gate
npx mda gate concept

# JSON output for scripting
npx mda validate --json
npx mda gate aesthetic --json
```

## Architecture Decisions

- **TypeScript over Luau for tooling**: The Luau validator can't run standalone outside
  Roblox. The TS CLI runs anywhere with Node.js and serves as the single source of truth
  for validation. The Luau validator is kept for in-engine use.

- **Gates vs Rules**: Rules check structural integrity (frontmatter, traces, IDs). Gates
  check semantic completeness (does the body have enough content to proceed?). Rules are
  always enforced. Gates are advisory by default (`--strict` makes them enforced).

- **Engine-agnostic specs + binding layer**: Behavioral specs describe *what* the game does.
  Binding specs describe *how* a specific engine implements it. This separation allows the
  same game design to target Roblox, Unity, or Unreal without rewriting specs.

- **Scoped validation**: Examples are isolated scopes so their specs don't interfere with
  the main project's validation. An example can have its own AES-001 without conflicting
  with the project's AES-001.
