import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import { composePlan } from "./compose.js";
import type { ToolProfile, SpecContent } from "../types.js";
import type { IntakeReport } from "./intake.js";
import type { StyleSource } from "./style.js";

const PROFILE: ToolProfile = {
  id: "TOOL-blender",
  name: "Blender",
  mcpRequired: "blender-mcp",
  assetTypes: ["model"],
  inputsByType: { model: [] },
  milestonesByType: {
    model: [
      {
        id: "M1",
        description: "Blockout",
        validation: "Silhouette readable.",
        expectedArtifact: "M1.blend",
        mcpCalls: "tool: blender\ncall: scene.new",
      },
      {
        id: "M2",
        description: "Topology",
        validation: "Quads only.",
        expectedArtifact: "M2.blend",
        mcpCalls: "",
      },
    ],
  },
};

const ASSET: SpecContent = {
  id: "AST-007",
  name: "Hero Character",
  layer: "AST",
  file: "specs/assets/hero.asset.md",
  tracesTo: ["MEC-001", "AES-002"],
  frontmatter: { id: "AST-007", name: "Hero Character", type: "model" },
  body: "## Purpose\n\nA hero the player controls.\n",
  sections: new Map([["purpose", "A hero the player controls."]]),
};

const CONCEPT: SpecContent = {
  id: "GAME-001",
  name: "Test Game",
  layer: "GAME",
  file: "specs/concept/test.concept.md",
  tracesTo: [],
  frontmatter: { id: "GAME-001", name: "Test Game" },
  body: "",
  sections: new Map([["aesthetic profile", "Cozy adventure."]]),
};

const AES: SpecContent = {
  id: "AES-002",
  name: "Cozy Discovery",
  layer: "AES",
  file: "specs/aesthetics/cozy.aes.md",
  tracesTo: [],
  frontmatter: { id: "AES-002", name: "Cozy Discovery" },
  body: "",
  sections: new Map([
    ["mood", "warm and curious"],
    ["visual style", "soft palette"],
  ]),
};

const INTAKE: IntakeReport = {
  refsDir: "/tmp/refs",
  required: [],
  optional: [],
  presentByKind: { image: ["front.png"] },
  missing: [],
  files: ["front.png"],
  ok: true,
};

const STYLE_SOURCES: StyleSource[] = [
  { layer: "aes", ref: "AES-002", file: "specs/aesthetics/cozy.aes.md", highlights: ["mood", "visual style"] },
  { layer: "concept", ref: "GAME-001", file: "specs/concept/test.concept.md", highlights: ["aesthetic profile"] },
  { layer: "asset", ref: "AST-007", file: "specs/assets/hero.asset.md", highlights: ["purpose"] },
  { layer: "style-guide", ref: "STYLE-GUIDE", file: "design/asset-plans/_style-guide.md", highlights: ["3d", "texture"] },
];

describe("composePlan", () => {
  it("renders frontmatter with required fields", () => {
    const md = composePlan({
      assetSpec: ASSET,
      profile: PROFILE,
      assetType: "model",
      intake: INTAKE,
      styleSources: STYLE_SOURCES,
      conceptSpec: CONCEPT,
      aesSpecs: [AES],
      version: 1,
      engine: "roblox",
      today: "2026-05-06",
    });

    assert.match(md, /^---\n/);
    assert.match(md, /\nid: PLAN-AST-007-v1\n/);
    assert.match(md, /\nasset-id: AST-007\n/);
    assert.match(md, /\nversion: 1\n/);
    assert.match(md, /\nstatus: draft\n/);
    assert.match(md, /\ntool: blender\n/);
    assert.match(md, /\nengine: roblox\n/);
    assert.match(md, /\ncreated: 2026-05-06\n/);
    assert.match(md, /aes-specs: \[AES-002\]/);
    assert.match(md, /concept: specs\/concept\/test\.concept\.md/);
    assert.match(md, /asset-spec: specs\/assets\/hero\.asset\.md/);
  });

  it("renders milestones from the tool profile, including MCP block", () => {
    const md = composePlan({
      assetSpec: ASSET,
      profile: PROFILE,
      assetType: "model",
      intake: INTAKE,
      styleSources: STYLE_SOURCES,
      conceptSpec: CONCEPT,
      aesSpecs: [AES],
      version: 1,
      engine: "roblox",
    });

    assert.match(md, /### M1 — Blockout/);
    assert.match(md, /### M2 — Topology/);
    assert.match(md, /\*\*Validation\.\*\* Silhouette readable\./);
    assert.match(md, /\*\*Expected artifact\.\*\* `output\/M1\.blend`/);
    assert.match(md, /```mcp\ntool: blender\ncall: scene\.new\n```/);
  });

  it("renders style sources grouped by layer with attribution", () => {
    const md = composePlan({
      assetSpec: ASSET,
      profile: PROFILE,
      assetType: "model",
      intake: INTAKE,
      styleSources: STYLE_SOURCES,
      conceptSpec: CONCEPT,
      aesSpecs: [AES],
      version: 1,
      engine: "roblox",
    });

    assert.match(md, /## Style Sources/);
    assert.match(md, /### AES specs/);
    assert.match(md, /AES-002 — `specs\/aesthetics\/cozy\.aes\.md`/);
    assert.match(md, /Focus on: §Mood, §Visual Style/);
    assert.match(md, /### Concept spec/);
    assert.match(md, /### Asset's own intent/);
    assert.match(md, /### Global style guide/);
  });

  it("includes an empty iteration log table", () => {
    const md = composePlan({
      assetSpec: ASSET,
      profile: PROFILE,
      assetType: "model",
      intake: INTAKE,
      styleSources: STYLE_SOURCES,
      conceptSpec: CONCEPT,
      aesSpecs: [AES],
      version: 1,
      engine: "roblox",
    });

    assert.match(md, /## Iteration Log/);
    assert.match(md, /\| When \| Milestone \| Verdict \| Notes \|/);
    assert.match(md, /_no entries yet_/);
  });

  it("falls back gracefully when no milestones are declared", () => {
    const emptyProfile: ToolProfile = { ...PROFILE, milestonesByType: { model: [] } };
    const md = composePlan({
      assetSpec: ASSET,
      profile: emptyProfile,
      assetType: "model",
      intake: INTAKE,
      styleSources: STYLE_SOURCES,
      conceptSpec: CONCEPT,
      aesSpecs: [AES],
      version: 1,
      engine: "roblox",
    });

    assert.match(md, /No milestones declared for this asset type/);
  });

  it("renders the Goal section from the asset's Purpose", () => {
    const md = composePlan({
      assetSpec: ASSET,
      profile: PROFILE,
      assetType: "model",
      intake: INTAKE,
      styleSources: STYLE_SOURCES,
      conceptSpec: CONCEPT,
      aesSpecs: [AES],
      version: 1,
      engine: "roblox",
    });

    assert.match(md, /## Goal/);
    assert.match(md, /Build \*\*Hero Character\*\* \(AST-007\) using Blender\./);
    assert.match(md, /> A hero the player controls\./);
  });
});
