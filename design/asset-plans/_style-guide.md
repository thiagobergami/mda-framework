---
id: STYLE-GUIDE
title: Global Style Guide
---

# Global Style Guide

Project-wide constraints applied to every asset plan unless overridden by the
parent AES spec or the concept spec. Style precedence (lowest to highest):

```
_style-guide.md  →  specs/concept/{game}.concept.md  →  specs/aesthetics/*.aes.md
```

The plan composer cites the *winning* source for each constraint so the
reasoning is auditable.

> **Status: skeleton.** Fill these in once the project's first AES spec lands.
> Empty sections fall through to the AES/concept layer at compose time.

## Color

- Palette ranges: TBD
- Saturation bounds: TBD
- Mood-to-hue mapping: TBD

## 3D

- Polycount targets per category: TBD (e.g. character: ~5k tris, prop: ~500 tris)
- Topology rules: quads where deformable, triangles allowed for static props
- UV: 0–1 space, no overlapping islands on deformable parts

## Texture

- Texel density target: TBD
- Texture map size ladder: 256 / 512 / 1024 / 2048
- Channel layout: BaseColor / Normal / RoughnessMetallic packed

## Audio

- Sample rate: 48 kHz
- Music key/tempo conventions: TBD (per AES spec)
- Loudness target: -14 LUFS integrated

## Animation

- Frame rate: 30 fps
- Loop length conventions: TBD

## Naming

- File names: `kebab-case.{ext}`
- Asset IDs: `AST-XXX` (3-digit, padded)
- Plan files: `{asset-id}.v{N}.plan.md`
