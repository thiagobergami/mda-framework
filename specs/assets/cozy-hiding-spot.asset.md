---
id: AST-001
name: Cozy Hiding Spot Variants
type: model
traces_to_mechanics: [MEC-005]
traces_to_aesthetics: [AES-002, AES-003]
status: concept
---

# Cozy Hiding Spot Variants

## Purpose

A small set (3–5) of distinct hiding-spot prop models that act as the
physical anchors for MEC-005 Rule 1 (Hide Eligibility). Each variant is a
tagged Instance with a trigger volume that the Hide action reads. Without
this asset MEC-005 cannot fire and the spot-novelty loop (DYN-003) has
nothing to count.

The variants exist to deliver **AES-003 Hiding Spot Discovery** — the
player's session-long pleasure of finding new corners. Three identical
spots wouldn't read as "different corners"; the variants give the level
designer a vocabulary for placing distinguishable nooks. They also serve
**AES-002 Cozy Register** by leaning into pastel, soft, rounded silhouettes
rather than sharp or threatening cover.

## Emotional Intent

- **Primary emotion**: Cozy invitation — "you could fit right in there."
- **Energy level**: Low.
- **Tone**: Soft, pastel, slightly oversized props that read as
  "snug-fit-for-a-small-person". Think *Animal Crossing* furniture
  density, not *Among Us* vent.
- **Reference**: Animal Crossing house interiors; the hiding-prop set in
  Roblox "Hide and Seek Extreme" but warmer/softer; the cardboard-box
  comedy of small spaces in Studio Ghibli films.

## Technical Requirements

### For Models:
- **Poly count**: ≤ 1,500 triangles per variant. Roblox mobile budget.
- **Texture resolution**: 512 × 512 max per variant. Pastel palette
  (see AST-002 for the shared colour anchors).
- **Rig**: None — props are static.
- **Collision**: Convex hull around the visible silhouette; the trigger
  volume is a separate child Part with `CanCollide = false`.
- **Scale**: Each variant fits inside an ~8 × 8 × 8 stud bounding box so
  that any spot is reachable in well under one walking second from any
  adjacent tile.

## Variants

| Variant     | Trigger                 | Difference from base                            |
|-------------|-------------------------|-------------------------------------------------|
| Basket      | Always available        | Wicker basket with a folded blanket — sits flat |
| Wardrobe    | Always available        | Tall pastel wardrobe with cracked-open door     |
| Curtain     | Always available        | Long curtain along a wall, trigger behind it    |
| TableSkirt  | Always available        | Round table with floor-length tablecloth        |
| WindowSeat  | Always available        | Built-in bench with a cushion lid that opens    |

Variant choice is purely cosmetic for the mechanic — all variants expose the
same Attribute and tag contract. The level designer uses variant identity
to distribute "different feeling" spots around the map per AES-003.

## Engine Integration

- **Container**: `ReplicatedStorage.Assets.Props.HidingSpots/` —
  one Model per variant, named e.g. `Prop_HidingSpot_Basket`.
- **Instance type**: Roblox `Model` with a child `Part` named
  `TriggerVolume` (transparent, `CanCollide = false`) and a child `Part`
  named `HideStandPoint` marking where the hider snaps to.
- **Tags / markers**: `HidingSpot` on the Model (CollectionService); used
  by MEC-005 Rule 1 to enumerate spots within a player's reach.
- **Attributes / properties**: `HidingCapacity` (Integer, default 1 per
  TUN-001); `SpotId` (String, unique within the level, used by DYN-003 to
  key the session spot-set).
- **Binding**: BIND-NNN — deferred, see
  [`design/decisions/2026-05-27-multi-engine.md`](../../design/decisions/2026-05-27-multi-engine.md).

## Placeholder Protocol

- **Placeholder description**: Each variant is a single pastel-tinted
  `Part` (e.g. a flat-coloured 4 × 4 × 4 cube) labelled with the variant
  name as a `BillboardGui` text label. The Trigger and StandPoint child
  Parts are present and correctly sized, so MEC-005 fires identically.
- **Placeholder location**: `ReplicatedStorage.Assets.Props.HidingSpots/`
  — same path as the final asset. Build them inline in Studio for the
  blockout pass.
- **Behavioral equivalence**: The placeholder MUST expose the
  `HidingSpot` tag, `HidingCapacity` Attribute, `SpotId` Attribute,
  `TriggerVolume` child, and `HideStandPoint` child. Code written against
  these names works identically when the final art is swapped in.
- **Swap protocol**: Replace the placeholder Model in place (same parent,
  same name). Tags, Attributes, and child Part names are preserved on the
  final model. No code changes required.
