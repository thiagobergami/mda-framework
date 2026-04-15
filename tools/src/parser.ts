import matter from "gray-matter";
import { glob } from "glob";
import { readFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import type { SpecLayer, SpecMeta, SpecContent } from "./types.js";

const LAYER_PREFIXES: Set<string> = new Set([
  "AES", "DYN", "MEC", "TUN", "AST", "GAME", "BIND",
]);

/** Extract layer from an ID like "MEC-003" */
function extractLayer(id: string): SpecLayer | null {
  const match = id.match(/^([A-Z]+)-/);
  if (match && LAYER_PREFIXES.has(match[1])) {
    return match[1] as SpecLayer;
  }
  return null;
}

/** Parse all trace_to_* fields into a flat array of spec IDs */
function collectTraces(data: Record<string, unknown>): string[] {
  const traces: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith("traces_to_")) {
      const items = Array.isArray(value) ? value : [value];
      for (const item of items) {
        const str = String(item);
        // Extract all spec IDs from the value (handles "MEC-001, MEC-002" strings)
        const ids = str.match(/[A-Z]+-\d+/g);
        if (ids) {
          traces.push(...ids);
        }
      }
    }
  }
  return traces;
}

/** Parse IDs from the id field (supports comma-separated like "AST-001, AST-005") */
function parseIds(idField: unknown): string[] {
  const str = String(idField);
  return str.match(/[A-Z]+-\d+/g) ?? [];
}

/** Parse markdown body into section map keyed by lowercase heading text */
function parseSections(body: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = body.split("\n");
  let currentHeading: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s+(.+)/);
    if (headingMatch) {
      // Save previous section
      if (currentHeading !== null) {
        sections.set(currentHeading, currentContent.join("\n").trim());
      }
      currentHeading = headingMatch[1].toLowerCase().trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  // Save last section
  if (currentHeading !== null) {
    sections.set(currentHeading, currentContent.join("\n").trim());
  }

  return sections;
}

/** Parse a single markdown file into SpecMeta entries (one per ID in the file) */
export function parseFile(
  content: string,
  filePath: string,
): SpecContent[] {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(content);
  } catch {
    return [];
  }

  const data = parsed.data as Record<string, unknown>;

  // Skip files without frontmatter or without an id field
  if (!data || !data.id) {
    return [];
  }

  const ids = parseIds(data.id);
  if (ids.length === 0) {
    return [];
  }

  const name = typeof data.name === "string" ? data.name : "unknown";
  const scope = typeof data.scope === "string" ? data.scope : undefined;
  const traces = collectTraces(data);
  const body = parsed.content;
  const sections = parseSections(body);

  const results: SpecContent[] = [];
  for (const id of ids) {
    const layer = extractLayer(id);
    if (!layer) continue;
    const spec: SpecContent = {
      id,
      name,
      layer,
      file: filePath,
      tracesTo: traces,
      frontmatter: data,
      body,
      sections,
    };
    if (scope !== undefined) {
      spec.scope = scope;
    }
    results.push(spec);
  }
  return results;
}

/** Discover validation scopes: specs/ is the main scope, each examples/{name}/ is isolated */
export async function discoverScopes(root: string): Promise<Map<string, string>> {
  const scopes = new Map<string, string>();

  // Main scope
  scopes.set("specs", resolve(root, "specs"));

  // Example scopes
  const exampleDirs = await glob("examples/*/specs", { cwd: root });
  for (const dir of exampleDirs) {
    const scopeName = dir.split("/")[1];
    scopes.set(`example:${scopeName}`, resolve(root, dir));
  }

  return scopes;
}

/** Parse all specs in a directory tree */
export async function parseScope(specsDir: string, root: string): Promise<SpecContent[]> {
  const files = await glob("**/*.md", { cwd: specsDir, absolute: true });
  const results: SpecContent[] = [];

  for (const absPath of files) {
    const content = await readFile(absPath, "utf-8");
    const relPath = relative(root, absPath);
    const specs = parseFile(content, relPath);
    results.push(...specs);
  }

  return results;
}

/** Parse all scopes and return a map of scope name → specs */
export async function parseAll(root: string): Promise<Map<string, SpecContent[]>> {
  const scopes = await discoverScopes(root);
  const result = new Map<string, SpecContent[]>();

  for (const [name, dir] of scopes) {
    const specs = await parseScope(dir, root);
    result.set(name, specs);
  }

  return result;
}
