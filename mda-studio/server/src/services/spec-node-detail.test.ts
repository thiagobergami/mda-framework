import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { join } from "node:path";
import { specNodeDetailSchema } from "@mda-studio/shared";
import { assembleSpecTreeResponse } from "./spec-tree-assembly";
import { clearCache, rebuildSpecCache } from "./spec-cache";
import {
  clearIssuesStore,
  findActiveIssueForSpec,
} from "./issues-store";
import { seedFixtureIssues } from "./fixture-seed";
import { buildSpecNodeDetail } from "./spec-node-detail";

const FIXTURE_ROOT = join(__dirname, "__fixtures__/specs-virus-hunter");

beforeEach(() => {
  clearCache();
  clearIssuesStore();
});

afterEach(() => {
  clearCache();
  clearIssuesStore();
});

describe("buildSpecNodeDetail", () => {
  it("composes a SpecNodeDetail that validates against the shared schema", async () => {
    const entry = await rebuildSpecCache("virus-hunter", FIXTURE_ROOT);
    seedFixtureIssues("virus-hunter");
    const activeMap = new Map(
      entry.specs
        .map((s) => [s.specId, findActiveIssueForSpec("virus-hunter", s.specId)])
        .filter((p): p is [string, NonNullable<ReturnType<typeof findActiveIssueForSpec>>] => Boolean(p[1])),
    );
    const tree = assembleSpecTreeResponse({
      gameId: "virus-hunter",
      concept: { path: "x", primaryAesthetic: "Fellowship", title: "x" },
      specs: entry.specs,
      activeIssueBySpecId: activeMap,
    });
    const node = tree.nodes.find((n) => n.specId === "MEC-001")!;
    const parsed = entry.specs.find((s) => s.specId === "MEC-001")!;

    const detail = await buildSpecNodeDetail({
      gameId: "virus-hunter",
      specsRoot: FIXTURE_ROOT,
      allSpecs: entry.specs,
      node,
      parsedSpec: parsed,
    });

    expect(() => specNodeDetailSchema.parse(detail)).not.toThrow();
    expect(detail.spec.path).toBe("specs/mechanics/revive.mec.md");
    expect(detail.spec.body).toMatch(/Hold E for 3 seconds/);
    expect(detail.issues.length).toBeGreaterThan(0);
    expect(detail.issues[0]?.specId).toBe("MEC-001");
  });

  it("builds the upward trace from a MEC up to its AES root", async () => {
    const entry = await rebuildSpecCache("virus-hunter", FIXTURE_ROOT);
    const node = assembleSpecTreeResponse({
      gameId: "virus-hunter",
      concept: { path: "x", primaryAesthetic: "Fellowship", title: "x" },
      specs: entry.specs,
    }).nodes.find((n) => n.specId === "MEC-001")!;
    const parsed = entry.specs.find((s) => s.specId === "MEC-001")!;
    const detail = await buildSpecNodeDetail({
      gameId: "virus-hunter",
      specsRoot: FIXTURE_ROOT,
      allSpecs: entry.specs,
      node,
      parsedSpec: parsed,
    });
    expect(detail.trace.upward.map((r) => r.specId)).toEqual([
      "AES-001",
      "DYN-001",
    ]);
  });

  it("MEC-003 surfaces its secondary parent in the trace", async () => {
    const entry = await rebuildSpecCache("virus-hunter", FIXTURE_ROOT);
    const node = assembleSpecTreeResponse({
      gameId: "virus-hunter",
      concept: { path: "x", primaryAesthetic: "Fellowship", title: "x" },
      specs: entry.specs,
    }).nodes.find((n) => n.specId === "MEC-003")!;
    const parsed = entry.specs.find((s) => s.specId === "MEC-003")!;
    const detail = await buildSpecNodeDetail({
      gameId: "virus-hunter",
      specsRoot: FIXTURE_ROOT,
      allSpecs: entry.specs,
      node,
      parsedSpec: parsed,
    });
    expect(detail.trace.secondaryParents.map((r) => r.specId)).toEqual([
      "DYN-001",
    ]);
  });
});
