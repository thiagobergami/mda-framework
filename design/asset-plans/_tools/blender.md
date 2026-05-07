---
id: TOOL-blender
name: Blender
mcp-required: blender-mcp
asset-types: [model]
---

# Blender — Tool Profile

Authoring profile for 3D models destined for the Roblox engine. Hands off
texturing to Substance (via the Substance profile) and rigging/animation to
Mixamo when those layers are needed.

## Inputs: model

- image (required) — Reference photo or sketch (front view recommended; side view raises plan quality)
- text (optional) — Style or mood description, character/prop role
- model3d (optional) — Existing base mesh to extend rather than start from scratch

## Milestones: model

### M1 — Blockout

Establish the silhouette with primitive volumes only. No detail, no edge flow
yet — the goal is a recognizable form from the reference image.

**Validation.** Silhouette readable from front and side orthographic views; bounding box matches reference proportions within ±5%.
**Expected artifact.** M1-blockout.blend

```mcp
tool: blender
call: scene.new
args: { units: meters, scale: 1.0 }

tool: blender
call: import.reference_image
args: { path: "{refs_dir}/{primary_image}", view: "front" }

tool: blender
call: mesh.add_primitive
args: { kind: "cube", scale: "{ref_bounding_scale}" }
```

### M2 — Topology

Convert blockout volumes into a clean quad mesh with intentional edge flow.
For deformable parts (faces, joints), edge loops follow muscle/movement
direction. Triangles only on static props.

**Validation.** No n-gons; quad ratio ≥ 95% on deformable parts; edge loops follow joints; mesh closed (no holes).
**Expected artifact.** M2-topology.blend

```mcp
tool: blender
call: mesh.retopologize
args: { target: "{blockout_mesh}", method: "quad-remesh", target_quads: "{target_quad_count}" }

tool: blender
call: mesh.validate_topology
args: { check: ["n-gons", "non-manifold", "loose-geometry"] }
```

### M3 — UV

Unwrap the topology into 0–1 UV space with no overlapping islands on
deformable parts. Texel density consistent across the mesh.

**Validation.** All islands inside 0–1 space; no overlaps on deformable parts; texel density variance ≤ 10%; seams hidden behind natural edges where possible.
**Expected artifact.** M3-uv.blend

```mcp
tool: blender
call: mesh.mark_seams
args: { strategy: "auto-edges-by-angle", angle: 45 }

tool: blender
call: mesh.unwrap
args: { method: "smart-uv", island_margin: 0.005 }

tool: blender
call: mesh.validate_uv
args: { check: ["overlaps", "outside-bounds", "texel-density"] }
```

### M4 — Texture

Assign a base material set: BaseColor, Normal, Roughness/Metallic. Hand off
to Substance for the full texturing pass when the asset budget warrants it
(see TOOL-substance) — for simple props, a Blender procedural pass is enough.

**Validation.** All maps fit the texture-resolution budget from the asset spec; PBR-correct (roughness in 0.2–0.9 range for non-metals); no compression artifacts at game distance.
**Expected artifact.** M4-textured.blend (+ texture set in `output/textures/`)

```mcp
tool: blender
call: material.assign_pbr
args: { base_color: "{primary_hex}", roughness: 0.6, metallic: 0.0 }

tool: blender
call: texture.bake
args: { maps: ["base_color", "normal", "roughness"], size: "{texture_resolution}" }
```

### M5 — Rig

Add an armature and weight-paint the mesh. Skip entirely for static props
(set `rig: none` in the asset spec). For humanoids, route to Mixamo via the
Mixamo profile after export — Blender just produces a clean mesh.

**Validation.** Bone count ≤ rig budget from asset spec; no zero-weight verts; deformations clean at extreme poses (90° joints); root bone at world origin.
**Expected artifact.** M5-rigged.blend

```mcp
tool: blender
call: armature.create
args: { template: "{rig_template}", scale_to_mesh: true }

tool: blender
call: armature.auto_weight
args: { mesh: "{textured_mesh}", method: "envelope" }

tool: blender
call: armature.validate
args: { check: ["zero-weights", "non-zero-influence-overflow"] }
```

### M6 — Export

Bake to `.fbx` for Roblox import. Y-up axis, scale 1.0, apply all transforms.
Embed textures or write them alongside per the engine profile's
`import-formats`.

**Validation.** File opens in Roblox Studio without warnings; scale matches `Scale: <studs>` from the asset spec; bone hierarchy preserved (if rigged); texture paths resolve.
**Expected artifact.** {asset-id}.fbx

```mcp
tool: blender
call: scene.apply_transforms
args: { location: true, rotation: true, scale: true }

tool: blender
call: export.fbx
args: {
  path: "output/{asset_id}.fbx",
  axis_forward: "-Z",
  axis_up: "Y",
  bake_anim: false,
  embed_textures: true,
  add_leaf_bones: false
}
```
