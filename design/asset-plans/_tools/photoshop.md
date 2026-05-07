---
id: TOOL-photoshop
name: Photoshop
mcp-required: photoshop-mcp
asset-types: [ui]
---

# Photoshop — Tool Profile

Authoring profile for 2D screen art: HUD elements, icons, panels, splash
screens. Hands off finished assets as `.png` for engine import.

## Inputs: ui

- image (optional) — Reference mockup, sketch, or competitor analog
- text (optional) — Functional description (what does this UI element do?)

## Milestones: ui

### M1 — Composition

Lay out the canvas at the spec's target resolution. Block in the major
shapes and hierarchy with neutral grays — establish read order before any
color or detail.

**Validation.** Read order matches the asset spec's functional priority; primary action obvious within 1 second of viewing; safe areas respected (no critical content within 8% of edges).
**Expected artifact.** M1-composition.psd

```mcp
tool: photoshop
call: document.new
args: { width: "{target_width}", height: "{target_height}", dpi: 72, color_mode: "rgb" }

tool: photoshop
call: layer.add_group
args: { name: "composition", visible: true }
```

### M2 — Line art / wireframe

Sharpen the composition into clean line work. For icons, this is the
final silhouette; for panels, the structural frame.

**Validation.** All lines pixel-aligned; stroke width consistent within element class; no doubled strokes from overlap.
**Expected artifact.** M2-lineart.psd

```mcp
tool: photoshop
call: layer.add_group
args: { name: "lineart" }

tool: photoshop
call: brush.preset
args: { name: "hard-round", size: "{stroke_size}", hardness: 100 }
```

### M3 — Flats

Apply base color blocks under the line art. Each flat region on its own
layer for ease of selection in M4.

**Validation.** No transparent gaps inside any region; flats stay below line art; palette matches AES spec / style-guide swatches.
**Expected artifact.** M3-flats.psd

```mcp
tool: photoshop
call: layer.fill_below_lineart
args: { palette: "{aes_palette}" }
```

### M4 — Shading / depth

Add light, shadow, and any rim/glow that gives the element volume. Stay
within the energy level declared in the asset spec — don't out-emote the
intended mood.

**Validation.** Light direction consistent across the asset; shadow contrast doesn't violate readability; no banding artifacts from hand-painted gradients.
**Expected artifact.** M4-shaded.psd

```mcp
tool: photoshop
call: layer.add_adjustment
args: { kind: "curves", target: "flats" }
```

### M5 — Polish

Final pass: outline glow if appropriate, subtle texture grain, level the
overall contrast against the reference.

**Validation.** Renders correctly against the engine's likely backgrounds (light + dark); zooms cleanly to 50% and 200% without falling apart.
**Expected artifact.** M5-final.psd

### M6 — Export

Slice and export each variant per the asset spec's `Variants` section.
PNG with alpha, sRGB colorspace, no embedded color profile (Roblox import
is happiest with bare PNG).

**Validation.** File size within budget from asset spec; transparency clean (no fringing); pixel-perfect alignment to the target grid.
**Expected artifact.** {asset-id}.png (and per-variant exports)

```mcp
tool: photoshop
call: export.png
args: {
  path: "output/{asset_id}.png",
  alpha: true,
  color_profile: "none",
  trim_transparent: true
}
```
