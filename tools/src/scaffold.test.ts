import { describe, it, before, after } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import matter from "gray-matter";

import { scaffold } from "./scaffold.js";

let tempRoot: string;

before(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), "scaffold-test-"));
  for (const dir of ["specs/aesthetics", "specs/dynamics", "specs/mechanics", "specs/tuning", "specs/assets", "specs/concept", "specs/bindings", "design/levels"]) {
    await mkdir(join(tempRoot, dir), { recursive: true });
  }
  await writeFile(join(tempRoot, "specs", "traceability.md"), "# Traceability\n\n## Matrix\n\n## Levels\n\n## Reading Guide\n");
});

after(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("scaffold with overrides", () => {
  it("merges frontmatter overrides on top of the template", async () => {
    const result = await scaffold(tempRoot, "dynamic", "Override Demo", {
      traces_to_aesthetics: ["AES-001", "AES-002"],
    });
    const body = await readFile(join(tempRoot, result.file), "utf-8");
    const parsed = matter(body);
    assert.deepEqual(parsed.data.traces_to_aesthetics, ["AES-001", "AES-002"]);
    assert.equal(parsed.data.id, result.id);
  });

  it("ignores attempts to override the id field", async () => {
    const result = await scaffold(tempRoot, "aesthetic", "Locked Id", {
      id: "AES-999",
      primary_aesthetic: "Fellowship",
    });
    const body = await readFile(join(tempRoot, result.file), "utf-8");
    const parsed = matter(body);
    assert.equal(parsed.data.id, result.id);
    assert.notEqual(parsed.data.id, "AES-999");
    assert.equal(parsed.data.primary_aesthetic, "Fellowship");
  });

  it("is a no-op when overrides is omitted", async () => {
    const result = await scaffold(tempRoot, "mechanic", "Default Shape");
    const body = await readFile(join(tempRoot, result.file), "utf-8");
    const parsed = matter(body);
    assert.equal(parsed.data.id, result.id);
    assert.ok(parsed.data.traces_to_dynamics);
  });
});
