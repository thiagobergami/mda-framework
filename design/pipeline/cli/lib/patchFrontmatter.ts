/**
 * Patches frontmatter values in a markdown file in place. Used after `mda new <layer>` to
 * fold the user's answers (vision, primary aesthetic, etc.) into the scaffolded template
 * without forcing them to re-enter the data in an editor.
 *
 * Operates on the raw frontmatter block (between the leading `---` lines) to avoid
 * pulling in a YAML dependency for a few simple key replacements.
 */

import { readFile, writeFile } from "node:fs/promises";

export interface FrontmatterPatch {
  [key: string]: string | string[];
}

function formatValue(value: string | string[]): string {
  if (Array.isArray(value)) {
    return `[${value.map((v) => JSON.stringify(v)).join(", ")}]`;
  }
  return value;
}

export async function patchFrontmatter(filePath: string, patch: FrontmatterPatch): Promise<void> {
  const content = await readFile(filePath, "utf-8");

  if (!content.startsWith("---\n")) {
    throw new Error(`File ${filePath} has no frontmatter block`);
  }

  const closeIdx = content.indexOf("\n---\n", 4);
  if (closeIdx === -1) {
    throw new Error(`File ${filePath} has unterminated frontmatter`);
  }

  const fmBlock = content.slice(4, closeIdx);
  const body = content.slice(closeIdx + 5);

  const lines = fmBlock.split("\n");
  const seenKeys = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^([A-Za-z_][A-Za-z0-9_]*):\s*/);
    if (match && match[1] in patch) {
      lines[i] = `${match[1]}: ${formatValue(patch[match[1]])}`;
      seenKeys.add(match[1]);
    }
  }

  for (const [key, value] of Object.entries(patch)) {
    if (!seenKeys.has(key)) {
      lines.push(`${key}: ${formatValue(value)}`);
    }
  }

  const newContent = `---\n${lines.join("\n")}\n---\n${body}`;
  await writeFile(filePath, newContent);
}
