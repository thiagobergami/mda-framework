---
id: AST-002
name: Cozy HUD Palette
type: ui
traces_to_mechanics: [MEC-004, MEC-005, MEC-006]
traces_to_aesthetics: [AES-002]
status: concept
---

# Cozy HUD Palette

## Purpose

The shared visual vocabulary for every on-screen UI element in cozy
hide-and-seek: the round timer (MEC-004), the seeker reticle (MEC-005), and
the presentation-layer hints (MEC-006). A single asset spec lets all three
mechanics pull from the same palette, type ramp, and shape language so the
game reads as one piece of cloth instead of three loose surfaces.

The asset serves **AES-002 Cozy Register** as its sole primary aesthetic
target — it does not exist to deliver Discovery or Fellowship directly,
but it must not undermine them (no sharp red countdown, no harsh sirens,
no aggressive iconography).

## Emotional Intent

- **Primary emotion**: Warmth, soft attention. UI should feel like a felt
  badge on a knitted scarf, not a heads-up display in a fighter cockpit.
- **Energy level**: Low.
- **Tone**: Pastel, rounded, slightly hand-drawn. Friendly typography
  (no stencil, no monospace, no condensed display fonts).
- **Reference**: Stardew Valley UI; the bottom bar of Untitled Goose
  Game; the inventory cards in *A Short Hike*.

## Technical Requirements

### For UI:
- **Frame language**: Rounded rectangles (corner radius ≥ 12 px at
  1080p). No drop shadows. Hairline 1 px outlines in the palette's
  "ink" colour only.
- **Palette anchors** — six named colours, all shared with AST-001:
  - `cozy/cream` `#F8F1E4` — primary background.
  - `cozy/peach` `#F3C5A4` — primary accent (timer band).
  - `cozy/sage`  `#A9C9A4` — success / found accent.
  - `cozy/lilac` `#C7B8E1` — passive / hint accent.
  - `cozy/ink`   `#3A3239` — text and hairlines (never pure black).
  - `cozy/dust`  `#E8DECD` — disabled / inactive.
- **Type ramp**: Roblox `FontFace = "FredokaOne"` (display) and
  `"Nunito"` (body); sizes 28 / 20 / 14 sp.
- **Iconography**: Outline-only, 2 px stroke, terminated with rounded
  end caps. No filled icons.
- **Animation**: All transitions tween over 0.2 s with
  `EasingStyle = Sine`. No bouncing, no overshoot.

## Variants

| Variant       | Trigger                              | Difference from base                                  |
|---------------|--------------------------------------|-------------------------------------------------------|
| Timer/Wide    | MEC-004 Rule 2 — round in progress   | Full-width band along top of screen                   |
| Timer/Pulse   | MEC-004 — last 10 s of round         | Same band, gentle peach pulse (DYN-001 small spike)   |
| Reticle/Idle  | MEC-005 — seeker is looking          | Small ring, `cozy/lilac` outline, no fill             |
| Reticle/Lock  | MEC-005 — within findRange + LOS     | Ring fills with `cozy/sage`, hairline pulse           |
| Hint/Spot     | MEC-006 — spot-novelty hint fires    | Floating card, `cozy/lilac` background, 4 s autodism. |
| Summary/Card  | MEC-004 Rule 5 — round summary       | Centred card, `cozy/cream` background, peach trim     |

## Engine Integration

- **Container**: `ReplicatedStorage.Assets.UI.Cozy/` — one ScreenGui
  template per variant, named e.g. `UI_CozyTimer_Wide`.
- **Instance type**: `ScreenGui` templates with named child frames.
  Variants are sibling templates, not toggled states, so the runtime
  swaps them by parent.
- **Tags / markers**: `CozyHUD` on each ScreenGui root; `CozyTimer`,
  `CozyReticle`, `CozyHint`, `CozySummary` on the relevant child frame
  inside each template.
- **Attributes / properties**: `Variant` (String) on the ScreenGui root
  — the runtime reads this to know which template it just cloned.
- **Binding**: BIND-NNN — deferred, see
  [`design/decisions/2026-05-27-multi-engine.md`](../../design/decisions/2026-05-27-multi-engine.md).

## Placeholder Protocol

- **Placeholder description**: A single `ScreenGui` template per variant
  containing a `Frame` with the correct named tag and a `TextLabel` that
  says "PLACEHOLDER {variant}". Colours are the palette anchors above
  but no rounded corners, no custom fonts (Roblox default font is fine).
- **Placeholder location**: `ReplicatedStorage.Assets.UI.Cozy/` — same
  path as the final assets.
- **Behavioral equivalence**: The placeholder MUST expose the variant
  name, the same child-frame tags, and the same `Variant` Attribute so
  MEC-004/005/006 can locate and bind to elements identically.
- **Swap protocol**: Replace each ScreenGui template Model in place
  (same parent path, same name). All tags, Attributes, and child names
  are preserved on the final art. No code changes required.
