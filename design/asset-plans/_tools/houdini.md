---
id: TOOL-houdini
name: Houdini
mcp-required: houdini-mcp
asset-types: [particle]
---

# Houdini — Tool Profile

Authoring profile for complex VFX (fluid sims, dense particle systems,
baked sequences). For simple one-off particles, override the asset spec's
`tool:` field to `engine-native` and skip Houdini entirely — Roblox
ParticleEmitter handles those directly.

## Inputs: particle

- text (required) — Description of the effect (kind, size, mood, duration)
- video (optional) — Reference footage of the desired motion
- image (optional) — Reference still or color guide

## Milestones: particle

### M1 — Solver setup

Build the Houdini network: source geometry, solver kind (POP for sparse
particles, FLIP for fluid, Pyro for fire/smoke), and the output writer.

**Validation.** Solver type matches the asset spec's effect description; emitter density is in a sensible range for the duration; iteration count won't blow simulation budget.
**Expected artifact.** M1-solver.hip

```mcp
tool: houdini
call: scene.new
args: { units: meters }

tool: houdini
call: solver.add
args: { kind: "{solver_kind}", source: "{source_geometry}" }
```

### M2 — Parameter tuning

Iterate on the parameters until the playback matches the reference. This
is the bulk of authoring time — keep checkpoints.

**Validation.** Visual reference passes a side-by-side review; no obvious solver artifacts (popping particles, exploding velocities); duration matches asset spec.
**Expected artifact.** M2-tuned.hip

### M3 — Caching

Cache the simulation to disk. This is non-negotiable for any sim that
takes more than ~10 seconds to compute — without a cache, every
adjustment downstream is unbearable.

**Validation.** Cache files written; total cache size under disk budget; cache scrubs in the timeline at real-time speed.
**Expected artifact.** M3-cache/{frames}.bgeo

```mcp
tool: houdini
call: cache.write
args: { path: "M3-cache/$F4.bgeo", range: "{frame_range}" }
```

### M4 — Render or bake

For Roblox, the practical output is one of two things:

1. **Image strip / sprite sheet** — render a flipbook (e.g. 8×8 grid) of
   the effect from a fixed camera, then play back via Roblox's
   ParticleEmitter `Spritesheet` properties.
2. **Particle data export** — bake to a format that Roblox can replay
   with native primitives (rare for complex sims; usually requires
   substantial simplification).

Choose at this milestone based on the engine profile's capabilities.

**Validation.** Output preserves the visual character of the simulation; file size within the texture budget (sprite sheet) or particle count budget (data export).
**Expected artifact.** M4-flipbook.png OR M4-particles.json

```mcp
tool: houdini
call: render.flipbook
args: { grid: "8x8", resolution: 256, output: "M4-flipbook.png" }
```

### M5 — Engine packaging

Package the output into the form the engine expects. For sprite sheets,
this means UV layout metadata; for particle data, the runtime
deserialization scaffold.

**Validation.** Roblox import accepts the file without warnings; runtime preview matches Houdini playback within tolerance.
**Expected artifact.** {asset-id}.png (sprite sheet) or {asset-id}.json (particle data)
