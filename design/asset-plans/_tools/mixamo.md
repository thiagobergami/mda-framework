---
id: TOOL-mixamo
name: Mixamo
mcp-required: none
asset-types: [animation]
---

# Mixamo — Tool Profile

> **Doc-only profile.** Mixamo is a hosted web service with no available
> MCP server (spec OQ-2). Every milestone in this profile is a manual
> instruction; the executor will print them and prompt for verdict but
> won't dispatch any calls. When/if a Mixamo MCP appears, swap
> `mcp-required: none` for the server name and add `mcp` blocks per
> milestone — no executor changes required.

## Inputs: animation

- model3d (required) — Humanoid mesh in T-pose, exported as FBX from Blender (Y-up, scale 1.0)
- text (optional) — Animation description (idle? walk? attack? specific mood?)
- video (optional) — Reference footage of the desired motion

## Milestones: animation

### M1 — Upload character

Upload the FBX to mixamo.com. Mixamo will detect the rig — if the upload
fails, re-export with **Add Leaf Bones** off and try again.

**Validation.** Mixamo accepts the rig with no warnings; preview pose looks correct (no inverted limbs).
**Expected artifact.** _(none — character lives in the Mixamo cloud)_

### M2 — Auto-rig

Run the Mixamo Auto-Rigger. Place the joint markers (chin, wrists,
elbows, knees, groin) precisely — bad placement here causes deformation
artifacts on every animation. The rig has 65 bones; preserve all of
them through downstream cleanup.

**Validation.** Auto-rigger completes without errors; finger detail preserved if the source mesh had separate finger bones.
**Expected artifact.** _(rigged character in Mixamo)_

### M3 — Pick animations

Browse the Mixamo library and select the clips that match the asset spec.
Use the `In-place` toggle deliberately: in-place clips are required for
characters whose movement is driven by code; full-motion clips for
canned cinematics.

**Validation.** Each selected clip plays cleanly on the rigged character; no foot sliding (or expected sliding) at the chosen In-place setting.
**Expected artifact.** _(staged in Mixamo download queue)_

### M4 — Download

Download each animation as **FBX for Unity** with **Skin: Without Skin**
and **Frames per Second: 30** (or whatever the style-guide says). The
"Without Skin" setting strips the mesh, leaving only the animation curves
ready to bind to the source character on the engine side.

**Validation.** All requested animations downloaded; FPS matches style-guide; no extra root motion in In-place clips.
**Expected artifact.** mixamo-downloads/{anim_name}.fbx (×N)

### M5 — Cleanup in Blender

Open each FBX in Blender, verify the timeline range, trim leading
breaths, fix any root-motion artifacts, and rename clips to match the
asset spec's naming convention.

**Validation.** Each clip plays in Blender NLA without errors; clip names match asset spec; no duplicate F-curves on the root.
**Expected artifact.** M5-cleaned.blend

### M6 — Export

Re-export the cleaned animations as a single FBX with all clips on the
NLA stack. This is what Roblox imports.

**Validation.** Roblox Studio import shows every clip as a separate Animation child of the AnimationController; durations match the source; AnimationPriority matches the asset spec.
**Expected artifact.** {asset-id}.fbx
