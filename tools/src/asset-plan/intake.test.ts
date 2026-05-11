import { describe, it, before, after } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { checkIntake } from "./intake.js";
import type { ToolProfile } from "../types.js";
import { ASSET_PLAN_ROOT } from "./profile.js";

const FIXTURE_PROFILE: ToolProfile = {
  id: "TOOL-fixture",
  name: "Fixture",
  mcpRequired: "fixture-mcp",
  assetTypes: ["model"],
  inputsByType: {
    model: [
      { kind: "image", required: true, description: "Reference image" },
      { kind: "text", required: false, description: "Optional mood text" },
    ],
  },
  milestonesByType: {
    model: [
      { id: "M1", description: "stub", validation: "", expectedArtifact: "", mcpCalls: "" },
    ],
  },
};

let tempRoot: string;
const ASSET_ID = "AST-001";

before(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), "intake-test-"));
});

after(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("checkIntake", () => {
  it("creates the refs/ folder if missing", async () => {
    const report = await checkIntake(tempRoot, ASSET_ID, FIXTURE_PROFILE, "model");
    assert.equal(report.refsDir, resolve(tempRoot, ASSET_PLAN_ROOT, ASSET_ID, "refs"));
    assert.equal(report.files.length, 0);
    assert.equal(report.ok, false); // image required but absent
    assert.equal(report.missing.length, 1);
    assert.equal(report.missing[0].kind, "image");
  });

  it("reports ok when a required image is present", async () => {
    const refs = resolve(tempRoot, ASSET_PLAN_ROOT, ASSET_ID, "refs");
    await mkdir(refs, { recursive: true });
    await writeFile(join(refs, "front.png"), "stub");

    const report = await checkIntake(tempRoot, ASSET_ID, FIXTURE_PROFILE, "model");
    assert.equal(report.ok, true);
    assert.equal(report.missing.length, 0);
    assert.deepEqual(report.presentByKind.image, ["front.png"]);
    assert.deepEqual(report.files, ["front.png"]);
  });

  it("ignores hidden files like .DS_Store", async () => {
    const refs = resolve(tempRoot, ASSET_PLAN_ROOT, ASSET_ID, "refs");
    await writeFile(join(refs, ".DS_Store"), "junk");
    const report = await checkIntake(tempRoot, ASSET_ID, FIXTURE_PROFILE, "model");
    assert.ok(!report.files.includes(".DS_Store"));
  });

  it("classifies optional inputs separately and never marks them missing", async () => {
    const report = await checkIntake(tempRoot, ASSET_ID, FIXTURE_PROFILE, "model");
    assert.equal(report.optional.length, 1);
    assert.equal(report.optional[0].kind, "text");
    assert.equal(report.missing.find((m) => m.kind === "text"), undefined);
  });

  it("returns empty report when the asset type is not in the profile", async () => {
    const report = await checkIntake(tempRoot, "AST-002", FIXTURE_PROFILE, "music");
    assert.equal(report.required.length, 0);
    assert.equal(report.optional.length, 0);
    assert.equal(report.ok, true);
  });
});
