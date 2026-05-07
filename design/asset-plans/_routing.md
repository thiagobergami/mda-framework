---
id: ROUTING
title: Asset → Tool Routing (v1)
---

# Asset → Tool Routing

Default tool for each asset type. Override per-asset with `tool:` in the
`.asset.md` frontmatter. Validated against the loaded tool profiles in
`_tools/`.

Asset types match the `type:` field in `specs/assets/_schema.md`:
`model | animation | sound | music | texture | particle | ui`.

| Asset type | Tool      |
|------------|-----------|
| model      | blender   |
| animation  | mixamo    |
| sound      | reaper    |
| music      | reaper    |
| texture    | substance |
| particle   | houdini   |
| ui         | photoshop |

For simple particles, override per-asset with `tool: engine-native` and skip
external authoring — Roblox ParticleEmitter handles it directly. Houdini is
reserved for complex VFX (fluid sims, baked sequences).
