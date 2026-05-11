import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { resolve } from "node:path";

import {
  parseToolProfile,
  parseEngineProfile,
  loadToolProfile,
} from "./profile.js";

const ROOT = resolve(import.meta.dirname, "../../..");

const TOOL_FIXTURE = `---
id: TOOL-fixture
name: Fixture Tool
mcp-required: fixture-mcp
asset-types: [demo, other]
---

# Fixture — Tool Profile

## Inputs: demo

- image (required) — Front view photo
- text (optional) — Mood description

## Milestones: demo

### M1 — Blockout

Primitive volumes match silhouette.

**Validation.** Silhouette readable.
**Artifact.** M1.blend

\`\`\`mcp
tool: fixture
call: scene.new
\`\`\`

### M2 — Topology

Clean quad mesh.

**Validation.** No n-gons.
**Expected artifact.** M2.blend

## Inputs: other

- model3d (required) — Existing rigged model

## Milestones: other

### M1 — Setup

Load the model.

**Validation.** Loads without errors.
**Artifact.** other-M1.blend
`;

const ENGINE_FIXTURE = `---
id: ENGINE-fixture
name: Fixture Engine
mcp-required: fixture-engine-mcp
import-formats: [.fbx, .png]
---

# Fixture Engine

## Import steps

1. Validate format
2. Import
3. Tag
`;

describe("parseToolProfile", () => {
  it("parses frontmatter into typed fields", () => {
    const p = parseToolProfile(TOOL_FIXTURE, "fixture.md");
    assert.equal(p.id, "TOOL-fixture");
    assert.equal(p.name, "Fixture Tool");
    assert.equal(p.mcpRequired, "fixture-mcp");
    assert.deepEqual(p.assetTypes, ["demo", "other"]);
  });

  it("parses inputs per asset type", () => {
    const p = parseToolProfile(TOOL_FIXTURE, "fixture.md");
    assert.deepEqual(p.inputsByType.demo, [
      { kind: "image", required: true, description: "Front view photo" },
      { kind: "text", required: false, description: "Mood description" },
    ]);
    assert.deepEqual(p.inputsByType.other, [
      { kind: "model3d", required: true, description: "Existing rigged model" },
    ]);
  });

  it("parses milestones per asset type with description, validation, artifact, mcp", () => {
    const p = parseToolProfile(TOOL_FIXTURE, "fixture.md");
    const demo = p.milestonesByType.demo;
    assert.equal(demo.length, 2);

    assert.equal(demo[0].id, "M1");
    assert.equal(demo[0].description, "Blockout");
    assert.equal(demo[0].validation, "Silhouette readable.");
    assert.equal(demo[0].expectedArtifact, "M1.blend");
    assert.match(demo[0].mcpCalls, /tool: fixture/);
    assert.match(demo[0].mcpCalls, /call: scene\.new/);

    assert.equal(demo[1].id, "M2");
    assert.equal(demo[1].expectedArtifact, "M2.blend");
    assert.equal(demo[1].mcpCalls, "");

    assert.equal(p.milestonesByType.other.length, 1);
    assert.equal(p.milestonesByType.other[0].description, "Setup");
  });

  it("rejects missing frontmatter fields", () => {
    const bad = "---\nid: TOOL-x\n---\n# x";
    assert.throws(() => parseToolProfile(bad, "bad.md"), /missing or invalid/i);
  });

  it("rejects asset-types when not a string array", () => {
    const bad = `---
id: TOOL-x
name: x
mcp-required: x
asset-types: "not-an-array"
---
`;
    assert.throws(() => parseToolProfile(bad, "bad.md"), /string array/i);
  });
});

describe("parseEngineProfile", () => {
  it("parses frontmatter and import-steps section", () => {
    const e = parseEngineProfile(ENGINE_FIXTURE, "engine.md");
    assert.equal(e.id, "ENGINE-fixture");
    assert.equal(e.name, "Fixture Engine");
    assert.equal(e.mcpRequired, "fixture-engine-mcp");
    assert.deepEqual(e.importFormats, [".fbx", ".png"]);
    assert.match(e.importSteps, /Validate format/);
    assert.match(e.importSteps, /Tag/);
  });
});

describe("loadToolProfile (real Blender stub)", () => {
  it("loads design/asset-plans/_tools/blender.md", async () => {
    const p = await loadToolProfile(ROOT, "blender");
    assert.equal(p.id, "TOOL-blender");
    assert.equal(p.name, "Blender");
    assert.equal(p.mcpRequired, "blender-mcp");
    assert.ok(p.assetTypes.includes("model"));
    assert.ok(p.inputsByType["model"].length >= 1);
    assert.ok(p.milestonesByType["model"].length >= 1);
  });

  it("throws clearly when the profile file is missing", async () => {
    await assert.rejects(
      () => loadToolProfile(ROOT, "does-not-exist"),
      /Tool profile not found/,
    );
  });
});
