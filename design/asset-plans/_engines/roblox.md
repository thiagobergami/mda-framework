---
id: ENGINE-roblox
name: Roblox
mcp-required: roblox-studio-mcp
import-formats: [.fbx, .obj, .png, .jpg, .wav, .mp3, .ogg]
---

# Roblox — Engine Profile

> **Phase 3 minimal.** Frontmatter complete; full import-step body and
> tag/attribute wiring lands in Phase 5.

## Import path resolution

Reads `target-path:` from the asset spec frontmatter when present. Falls back
to `ReplicatedStorage/Assets/{type}/` (where `{type}` is the asset's
`type:` field, e.g. `model`).

## Import steps

1. Validate that the produced artifact's extension is in `import-formats`.
2. Invoke `studio.importAsset` via the Roblox Studio MCP.
3. Move the imported instance to the resolved target path.
4. Apply CollectionService tags from the asset spec's Placeholder Protocol.
5. Apply Attribute values from the asset spec's Engine Integration section.
6. Save the place file.

## Tag and attribute wiring

For each entry in the asset spec's `Tags / markers` and
`Attributes / properties` lists, the engine-import dispatcher calls
`studio.setTag` and `studio.setAttribute` on the imported instance.

## Notes

- Mesh imports (`.fbx`, `.obj`) become `MeshPart` or `Model` containers
  depending on rig presence.
- Texture imports (`.png`, `.jpg`) upload as `Image` assets and the URL is
  written to a custom Attribute.
- Audio imports (`.wav`, `.mp3`, `.ogg`) upload as `Sound` assets and follow
  the same Attribute pattern.
