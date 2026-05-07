import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { resolve } from "node:path";

import { parseRoutingTable, loadRouting, resolveTool } from "./routing.js";

const ROOT = resolve(import.meta.dirname, "../../..");

const TABLE_FIXTURE = `---
id: ROUTING
---

# Routing

| Asset type | Tool      |
|------------|-----------|
| 3d-model   | blender   |
| 2d-art     | photoshop |
| music      | reaper    |

Some prose after the table that should not be parsed.
`;

describe("parseRoutingTable", () => {
  it("parses asset-type → tool entries", () => {
    const t = parseRoutingTable(TABLE_FIXTURE);
    assert.equal(t.get("3d-model"), "blender");
    assert.equal(t.get("2d-art"), "photoshop");
    assert.equal(t.get("music"), "reaper");
    assert.equal(t.size, 3);
  });

  it("ignores headers, separators, and non-table lines", () => {
    const t = parseRoutingTable(TABLE_FIXTURE);
    assert.equal(t.has("asset type"), false);
    assert.equal(t.has(""), false);
  });

  it("returns an empty map when there is no table", () => {
    const t = parseRoutingTable("# No table\n\nJust prose.\n");
    assert.equal(t.size, 0);
  });
});

describe("loadRouting", () => {
  it("loads the project's _routing.md", async () => {
    const t = await loadRouting(ROOT);
    assert.equal(t.get("model"), "blender");
    assert.equal(t.get("ui"), "photoshop");
    assert.equal(t.get("music"), "reaper");
    assert.equal(t.get("sound"), "reaper");
    assert.equal(t.get("texture"), "substance");
    assert.equal(t.get("animation"), "mixamo");
    assert.equal(t.get("particle"), "houdini");
  });
});

describe("resolveTool", () => {
  it("resolves model to the Blender profile", async () => {
    const profile = await resolveTool(ROOT, "model");
    assert.equal(profile.id, "TOOL-blender");
    assert.equal(profile.name, "Blender");
  });

  it("honors a per-asset override", async () => {
    // Override forces resolution to "blender" even with an unknown asset type.
    const profile = await resolveTool(ROOT, "totally-unknown", "blender");
    assert.equal(profile.id, "TOOL-blender");
  });

  it("throws when no row matches and no override is given", async () => {
    await assert.rejects(
      () => resolveTool(ROOT, "totally-unknown"),
      /No tool routed for asset type/,
    );
  });

  it("throws when routing points to a tool whose profile does not list the type", async () => {
    // ui routes to photoshop, but no _tools/photoshop.md exists yet (Phase 6).
    await assert.rejects(() => resolveTool(ROOT, "ui"), /Tool profile not found/);
  });
});
