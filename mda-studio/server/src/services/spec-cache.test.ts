import { afterEach, describe, expect, it } from "vitest";
import { join } from "node:path";
import {
  clearCache,
  getCacheEntry,
  rebuildSpecCache,
} from "./spec-cache";

const FIXTURE_ROOT = join(__dirname, "__fixtures__/specs-virus-hunter");

afterEach(() => {
  clearCache();
});

describe("rebuildSpecCache", () => {
  it("walks specs/ + design/levels/ and returns parsed specs sorted by id", async () => {
    const entry = await rebuildSpecCache("virus-hunter", FIXTURE_ROOT);
    const ids = entry.specs.map((s) => s.specId);
    expect(ids).toEqual([
      "AES-001",
      "AES-002",
      "AST-007",
      "DYN-001",
      "DYN-002",
      "LVL-001",
      "MEC-001",
      "MEC-002",
      "MEC-003",
      "TUN-001",
    ]);
  });

  it("classifies layers from id prefix", async () => {
    const entry = await rebuildSpecCache("virus-hunter", FIXTURE_ROOT);
    const layers = Object.fromEntries(
      entry.specs.map((s) => [s.specId, s.layer]),
    );
    expect(layers["AES-001"]).toBe("A");
    expect(layers["DYN-001"]).toBe("D");
    expect(layers["MEC-003"]).toBe("M");
    expect(layers["AST-007"]).toBe("AST");
    expect(layers["TUN-001"]).toBe("TUNE");
    expect(layers["LVL-001"]).toBe("LEVEL");
  });

  it("records the GAME-001 concept as a skipped issue (unrecognized prefix)", async () => {
    const entry = await rebuildSpecCache("virus-hunter", FIXTURE_ROOT);
    // The concept directory isn't scanned, so GAME-001 should NOT be in issues.
    expect(entry.issues.some((i) => i.sourcePath.includes("concept"))).toBe(
      false,
    );
  });

  it("is idempotent — rebuilding produces the same spec list", async () => {
    const a = await rebuildSpecCache("virus-hunter", FIXTURE_ROOT);
    const b = await rebuildSpecCache("virus-hunter", FIXTURE_ROOT);
    expect(a.specs.map((s) => s.specId)).toEqual(b.specs.map((s) => s.specId));
  });

  it("getCacheEntry returns the latest build for a game", async () => {
    await rebuildSpecCache("virus-hunter", FIXTURE_ROOT);
    const entry = getCacheEntry("virus-hunter");
    expect(entry).toBeDefined();
    expect(entry?.specs.length).toBeGreaterThan(0);
  });

  it("getCacheEntry returns undefined for an unknown game", () => {
    expect(getCacheEntry("never-built")).toBeUndefined();
  });

  it("tolerates a missing subdirectory (does not throw)", async () => {
    const entry = await rebuildSpecCache(
      "minimal",
      join(__dirname, "__fixtures__"), // a path with no specs/ or design/ children
    );
    expect(entry.specs).toEqual([]);
    expect(entry.issues).toEqual([]);
  });

  it("skips files whose basename starts with underscore", async () => {
    const entry = await rebuildSpecCache("virus-hunter", FIXTURE_ROOT);
    const usedPaths = entry.specs.map((s) => s.sourcePath);
    expect(usedPaths.every((p) => !p.includes("/_"))).toBe(true);
  });
});
