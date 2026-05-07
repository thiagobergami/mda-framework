---
id: ROUTING
title: Asset → Tool Routing (v1)
---

# Asset → Tool Routing

Default tool for each asset type. Override per-asset with `tool:` in the
`.asset.md` frontmatter. Validated against the loaded tool profiles in
`_tools/`.

| Asset type    | Tool          |
|---------------|---------------|
| 3d-model      | blender       |
| 2d-art        | photoshop     |
| music         | reaper        |
| texture       | substance     |
| animation     | mixamo        |
| vfx-complex   | houdini       |
| vfx-simple    | engine-native |
| terrain       | engine        |
| lighting      | engine        |
