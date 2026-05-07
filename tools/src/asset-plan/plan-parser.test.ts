import { describe, it, before, after } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parsePlan, readPlan, writePlan, appendIterationLog } from "./plan-parser.js";

const PLAN_FIXTURE = `---
id: PLAN-AST-001-v1
asset-id: AST-001
version: 1
status: draft
tool: blender
engine: roblox
created: 2026-05-06
references:
  asset-spec: specs/assets/cube.asset.md
  aes-specs: [AES-001, AES-002]
  concept: specs/concept/game.concept.md
  style-guide: design/asset-plans/_style-guide.md
inputs:
  - refs/front.png
milestones:
  - id: M1
    status: pending
  - id: M2
    status: pending
---

# Cube — Implementation Plan v1

## Goal

Build a cube.

## Milestones

### M1 — Blockout

**Validation.** Looks like a cube.
**Expected artifact.** \`output/M1.blend\`

\`\`\`mcp
tool: blender
call: scene.new
args: { units: meters }
\`\`\`

### M2 — Topology

**Validation.** Quads only.

\`\`\`mcp
tool: blender
call: mesh.retopologize
args: { method: "quad-remesh" }
\`\`\`

## Iteration Log

| When | Milestone | Verdict | Notes |
|------|-----------|---------|-------|
| _no entries yet_ | | | |
`;

describe("parsePlan", () => {
  it("parses frontmatter into a typed PlanFile", () => {
    const p = parsePlan(PLAN_FIXTURE, "/tmp/plan.md");
    assert.equal(p.file.id, "PLAN-AST-001-v1");
    assert.equal(p.file.assetId, "AST-001");
    assert.equal(p.file.version, 1);
    assert.equal(p.file.status, "draft");
    assert.equal(p.file.tool, "blender");
    assert.equal(p.file.engine, "roblox");
    assert.deepEqual(p.file.references.aesSpecs, ["AES-001", "AES-002"]);
    assert.deepEqual(p.file.inputs, ["refs/front.png"]);
    assert.equal(p.file.milestones.length, 2);
    assert.deepEqual(p.file.milestones[0], { id: "M1", status: "pending" });
  });

  it("extracts each milestone's body and MCP block", () => {
    const p = parsePlan(PLAN_FIXTURE, "/tmp/plan.md");
    assert.ok(p.milestones.M1);
    assert.equal(p.milestones.M1.description, "Blockout");
    assert.match(p.milestones.M1.mcpCalls, /scene\.new/);
    assert.match(p.milestones.M2.mcpCalls, /mesh\.retopologize/);
  });

  it("rejects illegal status values", () => {
    const bad = PLAN_FIXTURE.replace("status: draft", "status: bogus");
    assert.throws(() => parsePlan(bad, "/tmp/bad.md"), /must be one of/);
  });
});

describe("writePlan", () => {
  let tmp: string;
  let path: string;

  before(async () => {
    tmp = await mkdtemp(join(tmpdir(), "plan-write-"));
    path = join(tmp, "p.md");
    await writeFile(path, PLAN_FIXTURE, "utf-8");
  });

  after(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("preserves unrelated frontmatter (created, references) when only mutating status", async () => {
    const plan = await readPlan(path);
    plan.file.status = "approved";
    plan.file.milestones[0].status = "executed";
    await writePlan(plan);

    const content = await readFile(path, "utf-8");
    assert.match(content, /created: 2026-05-06/);
    assert.match(content, /aes-specs: \[AES-001, AES-002\]/);
    assert.match(content, /\nstatus: approved\n/);
    assert.match(content, /-\s+id:\s+M1\s*\n\s+status:\s+executed/);
    assert.match(content, /-\s+id:\s+M2\s*\n\s+status:\s+pending/);
  });
});

describe("appendIterationLog", () => {
  it("replaces the placeholder row on first append", () => {
    const p = parsePlan(PLAN_FIXTURE, "/tmp/plan.md");
    appendIterationLog(p, {
      when: "2026-05-07 14:00",
      milestone: "M1",
      verdict: "accepted",
    });
    assert.match(p.rawBody, /\| 2026-05-07 14:00 \| M1 \| accepted \|/);
    assert.doesNotMatch(p.rawBody, /_no entries yet_/);
  });

  it("appends below existing rows on subsequent calls", () => {
    const p = parsePlan(PLAN_FIXTURE, "/tmp/plan.md");
    appendIterationLog(p, { when: "t1", milestone: "M1", verdict: "accepted" });
    appendIterationLog(p, { when: "t2", milestone: "M2", verdict: "rejected" });
    const lines = p.rawBody.split("\n").filter((l) => /^\| t[12] \|/.test(l));
    assert.equal(lines.length, 2);
    assert.match(lines[0], /t1.*M1.*accepted/);
    assert.match(lines[1], /t2.*M2.*rejected/);
  });
});
