import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanAssetPlans } from "./asset-plans-scan";

async function makeRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "mda-asset-plans-"));
}

async function makeAsset(
  root: string,
  assetId: string,
  shape: {
    planVersions?: number[];
    refs?: string[];
    outputs?: string[];
    imported?: boolean;
  },
): Promise<void> {
  const dir = join(root, "design", "asset-plans", assetId);
  await mkdir(dir, { recursive: true });
  for (const v of shape.planVersions ?? []) {
    await writeFile(join(dir, `${assetId}.v${v}.plan.md`), "# plan\n");
  }
  if (shape.refs && shape.refs.length > 0) {
    await mkdir(join(dir, "refs"), { recursive: true });
    for (const r of shape.refs) {
      await writeFile(join(dir, "refs", r), "");
    }
  }
  if (shape.outputs && shape.outputs.length > 0) {
    await mkdir(join(dir, "output"), { recursive: true });
    for (const o of shape.outputs) {
      await writeFile(join(dir, "output", o), "");
    }
  }
  if (shape.imported) {
    await writeFile(join(dir, ".imported"), "");
  }
}

describe("scanAssetPlans", () => {
  it("returns an empty list when design/asset-plans/ does not exist", async () => {
    const root = await makeRoot();
    try {
      const r = await scanAssetPlans(root);
      expect(r.entries).toEqual([]);
      expect(r.rootPath).toBe("design/asset-plans");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("derives state from on-disk shape", async () => {
    const root = await makeRoot();
    try {
      await makeAsset(root, "revive-vfx", {
        planVersions: [1, 2],
        outputs: ["revive-vfx.glb"],
        refs: ["concept.png"],
      });
      await makeAsset(root, "downed-overlay", {});
      await makeAsset(root, "menu-bg", { planVersions: [1] });
      await makeAsset(root, "intro-cinema", {
        planVersions: [1],
        outputs: ["intro.mp4"],
        imported: true,
      });
      const r = await scanAssetPlans(root);
      const byId = Object.fromEntries(r.entries.map((e) => [e.assetId, e]));
      expect(byId["revive-vfx"]?.state).toBe("in-progress");
      expect(byId["revive-vfx"]?.latestPlanVersion).toBe(2);
      expect(byId["revive-vfx"]?.latestPlanFile).toBe(
        "design/asset-plans/revive-vfx/revive-vfx.v2.plan.md",
      );
      expect(byId["revive-vfx"]?.refsCount).toBe(1);
      expect(byId["revive-vfx"]?.artifactCount).toBe(1);
      expect(byId["downed-overlay"]?.state).toBe("no-plan");
      expect(byId["menu-bg"]?.state).toBe("planned");
      expect(byId["intro-cinema"]?.state).toBe("imported");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("skips underscore-prefixed top-level entries (profile/style docs)", async () => {
    const root = await makeRoot();
    try {
      await mkdir(join(root, "design", "asset-plans", "_tools"), {
        recursive: true,
      });
      await writeFile(
        join(root, "design", "asset-plans", "_routing.md"),
        "# routing\n",
      );
      await makeAsset(root, "revive-vfx", { planVersions: [1] });
      const r = await scanAssetPlans(root);
      expect(r.entries.map((e) => e.assetId)).toEqual(["revive-vfx"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("sorts entries by assetId", async () => {
    const root = await makeRoot();
    try {
      await makeAsset(root, "z-asset", { planVersions: [1] });
      await makeAsset(root, "a-asset", { planVersions: [1] });
      await makeAsset(root, "m-asset", { planVersions: [1] });
      const r = await scanAssetPlans(root);
      expect(r.entries.map((e) => e.assetId)).toEqual([
        "a-asset",
        "m-asset",
        "z-asset",
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
