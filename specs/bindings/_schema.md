# Binding Spec Schema

Binding specs define the **engine-specific mapping** between MDA behavioral specs and a target
game engine. They answer: "How does this mechanic or asset translate to engine X?"

MDA specs describe behavior engine-agnostically. Binding specs are the bridge — they map
behavioral contracts to concrete engine APIs, scene graph structures, and data representations.

## Template

```markdown
---
id: BIND-{NNN}
name: {Descriptive name}
engine: roblox | unity | unreal
binds_to: [{MEC-NNN, AST-NNN — the specs this binding implements}]
language: luau | csharp | cpp | blueprint
---

# {Name}

## Bound Specs

{List each spec this binding covers and what aspect it maps.}

| Spec | What is bound |
|------|---------------|
| {MEC-NNN} | {Which behavioral contract or rule} |
| {AST-NNN} | {Which asset integration} |

## Scene Structure

{How the behavioral model maps to the engine's scene graph.}

### Instance Hierarchy

{Engine-specific hierarchy. For Roblox: Instance tree with services, for Unity:
GameObject hierarchy with components, for Unreal: Actor/Component tree.}

```
{Diagram of the instance/object hierarchy}
```

### Tags & Markers

{How game objects are identified and queried at runtime.}

| Concept | Engine Mapping |
|---------|---------------|
| {tag name} | {e.g., CollectionService tag, Unity tag, UE gameplay tag} |
| {attribute} | {e.g., Instance Attribute, MonoBehaviour field, UProperty} |

## API Surface

{Engine-specific APIs used to implement the behavioral contracts.}

### Services / Subsystems

| MDA Concept | Engine API |
|-------------|-----------|
| {behavioral concept} | {engine service/class/API} |

### Events

| MDA Event | Engine Event |
|-----------|-------------|
| {spec event} | {engine signal/event/delegate} |

## Data Representation

{How game state from mechanic specs maps to engine data types.}

| MDA State | Engine Representation |
|-----------|---------------------|
| {state from MEC spec} | {engine data type and location} |

## Network Model

{How this binding handles client-server or replication concerns.}

- **Authority**: {Where game logic runs — server, client, or shared}
- **Replication**: {What state is replicated and how}
- **Input handling**: {How player input reaches the authority}

## Platform Considerations

{Performance, memory, or platform-specific concerns for this engine.}

- **Performance budget**: {Target frame time, draw call limits, etc.}
- **Mobile constraints**: {If applicable — touch input, reduced fidelity}
```

## Rules

1. **One binding per engine per spec set** — Don't combine Roblox and Unity bindings in one file
2. **Reference behavioral specs** — The `binds_to` field must list actual MEC/AST spec IDs
3. **No behavioral logic** — Bindings describe HOW to implement, not WHAT to implement. The WHAT is in the MEC/DYN specs
4. **Engine idioms** — Use the target engine's standard patterns. Don't force Roblox patterns into Unity or vice versa
5. **Keep in sync** — When a MEC spec changes, review its bindings. When an engine API changes, update the binding
6. **Completeness** — Every aspect of the behavioral contract should have a mapping. Unmapped behavior = unimplemented behavior
