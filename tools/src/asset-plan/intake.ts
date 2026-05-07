import { readdir, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import type { InputRequirement, ToolProfile } from "../types.js";
import { ASSET_PLAN_ROOT } from "./profile.js";

/** Map file extensions (lowercase, with leading dot) to a content "kind". */
const KIND_BY_EXT: Record<string, string> = {
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".webp": "image",
  ".gif": "image",
  ".bmp": "image",
  ".tiff": "image",
  ".wav": "audio",
  ".mp3": "audio",
  ".ogg": "audio",
  ".flac": "audio",
  ".m4a": "audio",
  ".aac": "audio",
  ".mp4": "video",
  ".mov": "video",
  ".webm": "video",
  ".avi": "video",
  ".txt": "text",
  ".md": "text",
  ".fbx": "model3d",
  ".obj": "model3d",
  ".blend": "model3d",
  ".gltf": "model3d",
  ".glb": "model3d",
};

/** Result of checking the refs/ folder against a tool profile's requirements. */
export interface IntakeReport {
  /** Absolute path to the asset's refs/ folder */
  refsDir: string;
  /** Required inputs, declared by the tool profile for this asset type */
  required: InputRequirement[];
  /** Optional inputs declared by the tool profile */
  optional: InputRequirement[];
  /** Files found, grouped by inferred kind */
  presentByKind: Record<string, string[]>;
  /** Required inputs whose kind has no matching file in refs/ */
  missing: InputRequirement[];
  /** All filenames found in refs/, sorted alphabetically */
  files: string[];
  /** True iff every required input is satisfied */
  ok: boolean;
}

/**
 * Inspect the refs/ directory for an asset and report whether the inputs
 * required by its tool profile are present. Creates the refs/ folder if it
 * doesn't exist (so the user has somewhere to drop files on first run).
 */
export async function checkIntake(
  root: string,
  assetId: string,
  profile: ToolProfile,
  assetType: string,
): Promise<IntakeReport> {
  const refsDir = resolve(root, ASSET_PLAN_ROOT, assetId, "refs");
  await mkdir(refsDir, { recursive: true });

  const inputs = profile.inputsByType[assetType] ?? [];
  const required = inputs.filter((i) => i.required);
  const optional = inputs.filter((i) => !i.required);

  const files = (await readdir(refsDir))
    .filter((name) => !name.startsWith("."))
    .sort();

  const presentByKind: Record<string, string[]> = {};
  for (const file of files) {
    const ext = extensionOf(file);
    const kind = KIND_BY_EXT[ext] ?? "unknown";
    (presentByKind[kind] ??= []).push(file);
  }

  const missing = required.filter((req) => {
    const matches = presentByKind[req.kind];
    return !matches || matches.length === 0;
  });

  return {
    refsDir,
    required,
    optional,
    presentByKind,
    missing,
    files,
    ok: missing.length === 0,
  };
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "";
  return filename.slice(dot).toLowerCase();
}
