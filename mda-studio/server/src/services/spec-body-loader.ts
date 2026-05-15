/**
 * Reads one spec file from disk and returns its parsed frontmatter and raw
 * markdown body. Distinct from `spec-parser.ts`, which converts a parsed
 * spec into the studio's normalized `ParsedSpec` — this loader is purely
 * I/O + frontmatter extraction for the drawer Spec tab.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export interface LoadedSpecBody {
  frontmatter: Record<string, unknown>;
  body: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export async function loadSpecBody(
  specsRoot: string,
  sourcePath: string,
): Promise<LoadedSpecBody> {
  const abs = join(specsRoot, sourcePath);
  const contents = await readFile(abs, "utf8");
  const match = FRONTMATTER_RE.exec(contents);
  if (!match) {
    return { frontmatter: {}, body: contents };
  }
  const [, yamlBlock = "", body = ""] = match;
  let frontmatter: Record<string, unknown> = {};
  try {
    const parsed = parseYaml(yamlBlock);
    if (parsed && typeof parsed === "object") {
      frontmatter = parsed as Record<string, unknown>;
    }
  } catch {
    // Malformed frontmatter is surfaced upstream by the parser; here we
    // just return an empty object and let the UI render the body anyway.
  }
  return { frontmatter, body };
}
