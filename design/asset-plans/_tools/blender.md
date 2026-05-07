---
id: TOOL-blender
name: Blender
mcp-required: blender-mcp
asset-types: [model]
---

# Blender — Tool Profile

> **Phase 1 minimal stub.** Inputs and the first milestone are real; remaining
> milestones for `model`, plus `animation` and `vfx-simple`, are filled in
> by Phase 3 (full Blender profile) and Phase 4 (executor + MCP integration).

## Inputs: model

- image (required) — Reference photo or sketch (front view recommended)
- text (optional) — Style or mood description

## Milestones: model

### M1 — Blockout

Primitive volumes match the silhouette in the reference image.

**Validation.** Silhouette readable from front and side orthographic views.
**Artifact.** M1-blockout.blend

```mcp
tool: blender
call: scene.new
args: { units: meters, scale: 1.0 }
```
