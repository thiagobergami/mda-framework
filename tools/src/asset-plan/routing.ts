import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { ToolProfile } from "../types.js";
import { ASSET_PLAN_ROOT, loadToolProfile } from "./profile.js";

/** Parse the routing markdown table into an `assetType → toolName` map. */
export function parseRoutingTable(content: string): Map<string, string> {
  const map = new Map<string, string>();
  let dataMode = false;

  for (const raw of content.split("\n")) {
    const line = raw.trim();

    if (!line.startsWith("|")) {
      dataMode = false;
      continue;
    }

    if (/^\|[\s\-:|]+\|$/.test(line)) {
      dataMode = true;
      continue;
    }

    if (!dataMode) continue;

    const cells = line.split("|").map((c) => c.trim()).filter((c) => c.length > 0);
    if (cells.length < 2) continue;

    const assetType = cells[0].toLowerCase();
    const tool = cells[1].toLowerCase();
    if (!assetType || !tool) continue;

    map.set(assetType, tool);
  }

  return map;
}

/** Load the routing table from `design/asset-plans/_routing.md`. */
export async function loadRouting(root: string): Promise<Map<string, string>> {
  const path = resolve(root, ASSET_PLAN_ROOT, "_routing.md");
  const content = await readFile(path, "utf-8").catch((err: NodeJS.ErrnoException) => {
    if (err.code === "ENOENT") {
      throw new Error(`Routing table not found: ${path}`);
    }
    throw err;
  });
  return parseRoutingTable(content);
}

/**
 * Resolve the tool profile for an asset type, honoring an optional override
 * (typically read from the `.asset.md` frontmatter `tool:` field).
 */
export async function resolveTool(
  root: string,
  assetType: string,
  override?: string,
): Promise<ToolProfile> {
  const toolName = override ?? (await loadRouting(root)).get(assetType.toLowerCase());

  if (!toolName) {
    throw new Error(
      `No tool routed for asset type "${assetType}". ` +
        `Add a row to design/asset-plans/_routing.md or set "tool:" in the asset spec.`,
    );
  }

  const profile = await loadToolProfile(root, toolName);

  if (!override && !profile.assetTypes.includes(assetType)) {
    throw new Error(
      `Routing inconsistent: asset type "${assetType}" → "${toolName}", ` +
        `but tool profile lists asset-types [${profile.assetTypes.join(", ")}]. ` +
        `Fix _routing.md or _tools/${toolName}.md.`,
    );
  }

  return profile;
}
