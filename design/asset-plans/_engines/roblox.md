---
id: ENGINE-roblox
name: Roblox
mcp-required: roblox-studio-mcp
import-formats: [.fbx, .obj, .png, .jpg, .wav, .mp3, .ogg]
default-target: ReplicatedStorage/Assets
---

# Roblox — Engine Profile

The engine import dispatcher uses this profile to translate a finished plan
artifact into a Roblox Studio instance with the tags, attributes, and
location declared by the asset spec.

## Import path resolution

Resolution precedence:

1. The asset spec's frontmatter `target-path:` field, if present.
2. The asset spec's `## Engine Integration` → **Container** field, parsed
   from the body if frontmatter is absent.
3. `{default-target}/{type}/` from this profile + the asset spec's `type:`
   field. For example, a `model` asset with no override lands at
   `ReplicatedStorage/Assets/Model/`.

The dispatcher creates intermediate folders if missing.

## Import formats

Only artifacts whose extension is in `import-formats` are accepted.
`.fbx` / `.obj` become `MeshPart` or `Model` instances depending on rig
presence; `.png` / `.jpg` upload as `Image` content; `.wav` / `.mp3` /
`.ogg` upload as `Sound` content. Anything else aborts the import with a
clear error.

## Import steps

1. Validate that the latest plan version's status is `executed`. Abort if
   `draft`, `approved`, or `imported` — the pipeline doesn't import a plan
   that hasn't finished executing, and won't double-import.
2. Locate the import artifact. Order: the last milestone's
   `Expected artifact.` path under `output/`; or the most recent file in
   `output/` whose extension is in `import-formats`.
3. Validate the artifact's extension against `import-formats`.
4. Resolve the target path per the rules above.
5. Invoke `studio.importAsset { path, target, name }` via the Roblox Studio
   MCP. The server returns the imported instance's full Roblox path.
6. Apply CollectionService tags from the asset spec's
   `## Engine Integration` → **Tags / markers** list. Each tag flows
   through `studio.addTag { instance, tag }`.
7. Apply attributes from the asset spec's `## Engine Integration` →
   **Attributes / properties** list. Each entry flows through
   `studio.setAttribute { instance, name, value }`.
8. Save the place file (`studio.savePlace`).
9. Transition the plan's status from `executed` to `imported` and append
   an iteration-log row recording the import event.
10. Print a *suggestion* that the user advance the asset spec's status
    field (`concept → placeholder` or `placeholder → final`) — the
    dispatcher does not edit the asset spec automatically.

## Tag and attribute wiring

The asset spec's `## Engine Integration` section is the source of truth
for runtime metadata. The dispatcher reads two parts of it:

- **Tags / markers**: parsed as a comma- or newline-separated list of
  CollectionService tag names. Empty list → no tags applied.
- **Attributes / properties**: parsed as `name = value` pairs (one per
  line or as a markdown list). Values are coerced: numeric literals
  become numbers, `true`/`false` become booleans, everything else stays
  as a string.

If the section is absent, the import succeeds with no metadata applied —
this is acceptable for early `concept`-status assets.

## MCP-unavailable path

If `roblox-studio-mcp` is not configured in `.mcp-servers.json`, the
dispatcher prints the resolved target path, the artifact path, and the
tag/attribute commands that *would* have been invoked, then leaves the
plan in `executed` state. Re-run `mda asset-plan import <asset-id>` once
the MCP is available to complete the transition to `imported`.

## Notes

- Roblox uses studs for length; the asset spec's `Scale: <studs>` field
  is honored as-is. Blender exports already apply `scale 1.0` so the FBX
  unit (meter) maps 1:1 to one stud unless the artist explicitly scales.
- For rigged meshes, the dispatcher does not auto-rename the resulting
  `Humanoid` — it preserves whatever the FBX exporter produced. Asset
  specs that require a specific Humanoid name should declare it as an
  attribute.
