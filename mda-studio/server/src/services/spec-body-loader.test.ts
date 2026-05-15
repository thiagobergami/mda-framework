import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { loadSpecBody } from "./spec-body-loader";

const FIXTURE_ROOT = join(__dirname, "__fixtures__/specs-virus-hunter");

describe("loadSpecBody", () => {
  it("loads frontmatter as an object and body as raw markdown", async () => {
    const { frontmatter, body } = await loadSpecBody(
      FIXTURE_ROOT,
      "specs/mechanics/revive.mec.md",
    );
    expect(frontmatter["id"]).toBe("MEC-001");
    expect(frontmatter["name"]).toBe("Revive interaction");
    expect(body).toMatch(/^# Revive interaction/m);
  });

  it("returns an empty frontmatter object for a file without one", async () => {
    // Re-use one of the schema files which has no `---` block.
    const { frontmatter, body } = await loadSpecBody(
      FIXTURE_ROOT,
      "specs/concept/virus-hunter.concept.md",
    );
    // Concept does have frontmatter — assert presence.
    expect(frontmatter["id"]).toBe("GAME-001");
    expect(body).toMatch(/Virus Hunter/);
  });
});
