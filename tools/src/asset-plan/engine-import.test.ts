import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import { resolveTargetPath, extractTags, extractAttributes } from "./engine-import.js";
import type { EngineProfile, SpecContent } from "../types.js";

const ENGINE: EngineProfile = {
  id: "ENGINE-roblox",
  name: "Roblox",
  mcpRequired: "roblox-studio-mcp",
  importFormats: [".fbx", ".png"],
  importSteps: "",
};

function asset(
  frontmatter: Record<string, unknown>,
  sections: Record<string, string> = {},
): SpecContent {
  return {
    id: "AST-001",
    name: "Cube",
    layer: "AST",
    file: "specs/assets/cube.asset.md",
    tracesTo: [],
    frontmatter: { id: "AST-001", name: "Cube", type: "model", ...frontmatter },
    body: "",
    sections: new Map(Object.entries(sections)),
  };
}

describe("resolveTargetPath", () => {
  it("uses frontmatter target-path when present", () => {
    const a = asset({ "target-path": "Workspace/Heroes/Cube" });
    assert.equal(resolveTargetPath(a, ENGINE, "model"), "Workspace/Heroes/Cube");
  });

  it("falls back to body Engine Integration → Container", () => {
    const a = asset(
      {},
      {
        "engine integration":
          "- **Container**: ServerStorage/Props\n- **Tags / markers**: cube",
      },
    );
    assert.equal(resolveTargetPath(a, ENGINE, "model"), "ServerStorage/Props");
  });

  it("ignores placeholder {token} container values", () => {
    const a = asset({}, { "engine integration": "- **Container**: {asset storage folder}" });
    assert.equal(
      resolveTargetPath(a, ENGINE, "model"),
      "ReplicatedStorage/Assets/Model",
    );
  });

  it("defaults to ReplicatedStorage/Assets/{Type} when nothing else matches", () => {
    const a = asset({});
    assert.equal(resolveTargetPath(a, ENGINE, "model"), "ReplicatedStorage/Assets/Model");
    assert.equal(resolveTargetPath(a, ENGINE, "music"), "ReplicatedStorage/Assets/Music");
  });
});

describe("extractTags", () => {
  it("parses comma-separated tag list", () => {
    const a = asset(
      {},
      { "engine integration": "- **Tags / markers**: enemy, melee, boss" },
    );
    assert.deepEqual(extractTags(a), ["enemy", "melee", "boss"]);
  });

  it("strips backticks from tag names", () => {
    const a = asset({}, { "engine integration": "- **Tags / markers**: `enemy`, `melee`" });
    assert.deepEqual(extractTags(a), ["enemy", "melee"]);
  });

  it("ignores placeholder {token} values", () => {
    const a = asset({}, { "engine integration": "- **Tags / markers**: {tags applied for runtime queries}" });
    assert.deepEqual(extractTags(a), []);
  });

  it("returns empty when section is absent", () => {
    assert.deepEqual(extractTags(asset({})), []);
  });
});

describe("extractAttributes", () => {
  it("parses name = value pairs and coerces types", () => {
    const a = asset(
      {},
      {
        "engine integration": `- **Attributes / properties**:
  - speed = 16
  - healable = true
  - role = healer
  - dropChance = 0.25`,
      },
    );
    assert.deepEqual(extractAttributes(a), {
      speed: 16,
      healable: true,
      role: "healer",
      dropChance: 0.25,
    });
  });

  it("returns empty object when section is absent", () => {
    assert.deepEqual(extractAttributes(asset({})), {});
  });

  it("ignores placeholder {token} values", () => {
    const a = asset({}, { "engine integration": "- **Attributes / properties**: {custom data}" });
    assert.deepEqual(extractAttributes(a), {});
  });
});
