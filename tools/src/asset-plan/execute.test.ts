import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import { parseMcpCalls } from "./execute.js";

describe("parseMcpCalls", () => {
  it("parses a single strict-JSON args block", () => {
    const calls = parseMcpCalls(`tool: blender
call: scene.new
args: {"units": "meters", "scale": 1.0}`);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].tool, "blender");
    assert.equal(calls[0].callName, "scene.new");
    assert.deepEqual(calls[0].args, { units: "meters", scale: 1.0 });
  });

  it("parses loose form with bare keys, single quotes, trailing commas", () => {
    const calls = parseMcpCalls(`tool: blender
call: mesh.add
args: { kind: 'cube', size: 1, }`);

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].args, { kind: "cube", size: 1 });
  });

  it("preserves {placeholder} values as strings", () => {
    const calls = parseMcpCalls(`tool: blender
call: import
args: { path: "{refs_dir}/front.png" }`);

    assert.equal(calls[0].args.path, "{refs_dir}/front.png");
  });

  it("parses multiple calls separated by blank lines", () => {
    const calls = parseMcpCalls(`tool: blender
call: scene.new
args: { units: meters }

tool: blender
call: mesh.add_primitive
args: { kind: cube }`);

    assert.equal(calls.length, 2);
    assert.equal(calls[0].callName, "scene.new");
    assert.equal(calls[1].callName, "mesh.add_primitive");
  });

  it("handles calls with no args block", () => {
    const calls = parseMcpCalls(`tool: blender
call: ping`);

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].args, {});
  });

  it("returns empty when block has no recognizable calls", () => {
    assert.deepEqual(parseMcpCalls("just some text"), []);
    assert.deepEqual(parseMcpCalls(""), []);
  });
});
