import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSpecFile } from "./spec-parser";

const FIXTURE_ROOT = join(__dirname, "__fixtures__/specs-virus-hunter");

function read(relPath: string): string {
  return readFileSync(join(FIXTURE_ROOT, relPath), "utf8");
}

describe("parseSpecFile", () => {
  it("parses an AES root with no parents", () => {
    const r = parseSpecFile(
      "specs/aesthetics/fellowship.aes.md",
      read("specs/aesthetics/fellowship.aes.md"),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.specId).toBe("AES-001");
    expect(r.spec.layer).toBe("A");
    expect(r.spec.title).toBe("Fellowship under pressure");
    expect(r.spec.status).toBe("draft");
    expect(r.spec.canonicalParentSpecId).toBeNull();
    expect(r.spec.secondaryParentSpecIds).toEqual([]);
  });

  it("parses a DYN and takes its first AES as canonical parent", () => {
    const r = parseSpecFile(
      "specs/dynamics/revive-loop.dyn.md",
      read("specs/dynamics/revive-loop.dyn.md"),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.specId).toBe("DYN-001");
    expect(r.spec.layer).toBe("D");
    expect(r.spec.canonicalParentSpecId).toBe("AES-001");
  });

  it("parses a multi-parent MEC, canonical = first DYN, secondaries = rest", () => {
    const r = parseSpecFile(
      "specs/mechanics/mda-logger.mec.md",
      read("specs/mechanics/mda-logger.mec.md"),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.specId).toBe("MEC-003");
    expect(r.spec.canonicalParentSpecId).toBe("DYN-002");
    expect(r.spec.secondaryParentSpecIds).toEqual(["DYN-001"]);
  });

  it("parses an AST with its declared status", () => {
    const r = parseSpecFile(
      "specs/assets/revive-vfx.asset.md",
      read("specs/assets/revive-vfx.asset.md"),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.layer).toBe("AST");
    expect(r.spec.status).toBe("concept");
    expect(r.spec.canonicalParentSpecId).toBe("MEC-001");
    expect(r.spec.secondaryParentSpecIds).toEqual(["AES-001"]);
  });

  it("parses a TUN spec with MEC as canonical parent", () => {
    const r = parseSpecFile(
      "specs/tuning/revive-timing.tune.md",
      read("specs/tuning/revive-timing.tune.md"),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.layer).toBe("TUNE");
    expect(r.spec.canonicalParentSpecId).toBe("MEC-001");
    expect(r.spec.secondaryParentSpecIds).toEqual(["DYN-001", "AES-001"]);
  });

  it("parses a LVL with outgoing refs and no canonical parent", () => {
    const r = parseSpecFile(
      "design/levels/tutorial-lab.level.md",
      read("design/levels/tutorial-lab.level.md"),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.layer).toBe("LEVEL");
    expect(r.spec.canonicalParentSpecId).toBeNull();
    expect(r.spec.outgoingRefSpecIds).toEqual(["AES-001", "DYN-001", "MEC-001"]);
    expect(r.spec.status).toBe("blockout");
  });

  it("skips the GAME-001 concept (unrecognized layer prefix)", () => {
    const r = parseSpecFile(
      "specs/concept/virus-hunter.concept.md",
      read("specs/concept/virus-hunter.concept.md"),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issue.reason).toMatch(/unrecognized id prefix/);
  });

  it("skips a file without frontmatter", () => {
    const r = parseSpecFile("README.md", "# README\n\nno frontmatter here");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issue.reason).toBe("no frontmatter block");
  });

  it("skips a file with frontmatter but no id", () => {
    const r = parseSpecFile(
      "broken.md",
      "---\nname: missing id\n---\n\nbody",
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issue.reason).toBe("missing or empty `id`");
  });

  it("falls back to the body H1 when frontmatter has no name", () => {
    const r = parseSpecFile(
      "x.md",
      "---\nid: MEC-999\n---\n\n# Body Title\n\ntext",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.title).toBe("Body Title");
  });

  it("ignores an unknown status string and falls back to the layer default", () => {
    const r = parseSpecFile(
      "x.md",
      "---\nid: AST-100\nname: x\nstatus: not-a-status\n---\n\nbody",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.status).toBe("concept");
  });

  it("surfaces a yaml syntax error as a skipped issue", () => {
    const r = parseSpecFile("bad.md", "---\nid: [unclosed\n---\n\nbody");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issue.reason).toMatch(/yaml parse error/);
  });
});
