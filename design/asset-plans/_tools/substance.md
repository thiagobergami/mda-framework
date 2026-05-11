---
id: TOOL-substance
name: Substance Painter
mcp-required: substance-mcp
asset-types: [texture]
---

# Substance Painter — Tool Profile

Authoring profile for PBR texture sets bound to a 3D model from the
Blender pipeline. Outputs a packed channel set (BaseColor, Normal,
Roughness/Metallic) that Roblox imports as separate texture maps.

## Inputs: texture

- model3d (required) — `.fbx` from the Blender M6 export milestone
- image (optional) — Style or material reference (e.g. metal vs. weathered, smooth vs. rough)
- text (optional) — Material description (era, condition, manufacturing process)

## Milestones: texture

### M1 — Project setup

Import the FBX. Pick the resolution from the asset spec's
`Texture resolution` field and the channel set per the engine profile's
expectations.

**Validation.** Model imports without UV warnings; map resolution matches spec; channels include BaseColor, Normal, Roughness, Metallic.
**Expected artifact.** M1-project.spp

```mcp
tool: substance
call: project.new
args: { fbx_path: "{blender_fbx}", resolution: "{texture_resolution}", channels: ["base_color", "normal", "roughness", "metallic"] }
```

### M2 — Bake maps

Bake the supporting maps (curvature, ambient occlusion, position, world
normal) that the smart material layers will rely on.

**Validation.** Curvature shows clean edges (no shading errors); AO has no light leaks at concavities; bake time under budget.
**Expected artifact.** M2-baked.spp

```mcp
tool: substance
call: baker.bake_all
args: { maps: ["curvature", "ao", "position", "world_normal"], samples: 16 }
```

### M3 — Base materials

Apply the foundation: a smart material set that gives the asset its
fundamental look (metal? leather? painted wood?). Stay neutral — detail
and personality go in M4.

**Validation.** Material reads correctly across the model in default lighting; matches the AES spec's tonal direction.
**Expected artifact.** M3-base.spp

### M4 — Detail / wear

Layer dirt, scratches, edge wear, decals, gradients per the asset's
emotional intent. New and pristine vs. weathered and used is a major
storytelling decision — defer to the AES spec.

**Validation.** Wear pattern matches reference imagery and AES tone; no obvious tiling or repetition; readability preserved at game distance.
**Expected artifact.** M4-detailed.spp

```mcp
tool: substance
call: layer.add_smart_mask
args: { mask: "edge_wear", intensity: "{wear_intensity}" }
```

### M5 — Export

Bake to the channel-packed map set the engine profile expects. Roblox
defaults: BaseColor as RGB, Normal as RGB (DirectX or OpenGL per engine
profile), Roughness in R, Metallic in G of a packed map.

**Validation.** Maps tile only if the asset spec says so; no compression artifacts; channel-pack layout matches engine profile.
**Expected artifact.** {asset-id}_BaseColor.png, {asset-id}_Normal.png, {asset-id}_Pack.png

```mcp
tool: substance
call: export.preset
args: {
  preset: "roblox-pbr",
  output_dir: "output/textures/",
  prefix: "{asset_id}_"
}
```
