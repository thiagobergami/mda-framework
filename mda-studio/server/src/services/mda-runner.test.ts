/**
 * Tests for mda-runner use a tiny `node` subprocess as the fake CLI. Each
 * test invokes runMda with `bin = { command: "node", baseArgs: ["-e", "..."] }`
 * which lets the suite assert the parsing behaviour without depending on a
 * real `npx mda` install.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

import { runMda } from "./mda-runner.js";

const passthroughSchema = z
  .object({ ok: z.boolean() })
  .passthrough();

function fakeBin(script: string) {
  return {
    command: process.execPath,
    baseArgs: ["-e", script],
  };
}

describe("runMda", () => {
  it("parses the last non-empty stdout line through the schema", async () => {
    const script =
      `console.log("hello");\n` +
      `process.stdout.write(JSON.stringify({ok:true, scope:"specs"}) + "\\n");`;
    const result = await runMda(process.cwd(), [], passthroughSchema, {
      bin: fakeBin(script),
    });
    expect(result.exitCode).toBe(0);
    expect(result.parsed).toEqual({ ok: true, scope: "specs" });
  });

  it("returns parsed=null when the last line is not JSON", async () => {
    const script = `console.log("not json");`;
    const result = await runMda(process.cwd(), [], passthroughSchema, {
      bin: fakeBin(script),
    });
    expect(result.parsed).toBeNull();
    expect(result.rawStdout).toContain("not json");
  });

  it("returns parsed=null when the JSON does not match the schema", async () => {
    const script = `console.log(JSON.stringify({unexpected: true}))`;
    const result = await runMda(process.cwd(), [], passthroughSchema, {
      bin: fakeBin(script),
    });
    expect(result.parsed).toBeNull();
  });

  it("streams NDJSON to onEvent", async () => {
    const script =
      `process.stdout.write(JSON.stringify({event:"a"}) + "\\n");\n` +
      `process.stdout.write(JSON.stringify({event:"b"}) + "\\n");`;
    const events: unknown[] = [];
    const result = await runMda(
      process.cwd(),
      [],
      z.object({ event: z.string() }),
      {
        bin: fakeBin(script),
        onEvent: (e) => events.push(e),
      },
    );
    expect(events).toEqual([{ event: "a" }, { event: "b" }]);
    expect(result.parsed).toEqual({ event: "b" });
  });

  it("captures stderr separately", async () => {
    const script = `console.error("boom"); process.exit(2);`;
    const result = await runMda(process.cwd(), [], passthroughSchema, {
      bin: fakeBin(script),
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("boom");
    expect(result.parsed).toBeNull();
  });
});
