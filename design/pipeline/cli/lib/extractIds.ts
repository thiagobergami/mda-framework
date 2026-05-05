/**
 * Reads markdown files in a directory and extracts (id, name) pairs from frontmatter.
 * Used by prompts that need to ask "which AES does this trace to?" with real choices.
 */

import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface SpecRef {
  id: string;
  name: string;
  file: string;
}

const ID_REGEX = /^id:\s*(\S+)\s*$/m;
const NAME_REGEX = /^name:\s*(.+?)\s*$/m;

export async function extractIds(root: string, relDir: string): Promise<SpecRef[]> {
  const dir = resolve(root, relDir);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const refs: SpecRef[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md") || entry.startsWith("_")) continue;
    const filePath = resolve(dir, entry);
    try {
      const content = await readFile(filePath, "utf-8");
      const idMatch = content.match(ID_REGEX);
      const nameMatch = content.match(NAME_REGEX);
      if (idMatch && nameMatch) {
        refs.push({
          id: idMatch[1],
          name: nameMatch[1],
          file: filePath,
        });
      }
    } catch {
      // Unreadable files are skipped silently
    }
  }

  refs.sort((a, b) => a.id.localeCompare(b.id));
  return refs;
}
