/**
 * `mda` CLI subprocess driver.
 *
 * Spawns `npx mda <args> --json` against a game's workspace root, buffers
 * stdout/stderr, then parses the last non-empty stdout line through a
 * caller-supplied zod schema. NDJSON-emitting subcommands (asset-plan) can
 * also subscribe to an `onEvent` callback that receives one parsed event per
 * line, so the studio's SSE bridge can re-broadcast them live.
 *
 * The shared schemas live in `@mda-studio/shared` so the CLI emitter and the
 * runner read from the same source. See plan task D3.EN2a.
 */

import { spawn } from "node:child_process";
import { resolve as resolvePath } from "node:path";
import { z } from "zod";

import {
  validateResultSchema,
  gateResultArraySchema,
  newResultSchema,
  assetPlanEventSchema,
  type MdaValidateResult,
  type MdaGateResult,
  type MdaNewResult,
  type MdaAssetPlanEvent,
} from "@mda-studio/shared";

export interface MdaResult<T> {
  exitCode: number;
  parsed: T | null;
  stderr: string;
  rawStdout: string;
}

export interface RunOptions {
  /** Override the CLI binary. Defaults to `npx mda`. */
  bin?: { command: string; baseArgs: string[] };
  /** Streaming callback for NDJSON event lines. */
  onEvent?: (event: unknown) => void;
  /** Abort signal — kills the subprocess if fired. */
  signal?: AbortSignal;
  /** Override the environment passed to the child. Defaults to process.env. */
  env?: NodeJS.ProcessEnv;
}

/**
 * Resolve the default `mda` binary. In typical operator use, `npx mda` works
 * because the studio is launched from the framework repo's root. In tests,
 * or when the studio drives a workspace that doesn't have `mda` in its
 * node_modules, set MDA_BIN to an absolute path so `npx` doesn't hit the
 * registry.
 */
function defaultBin(): { command: string; baseArgs: string[] } {
  const explicit = process.env["MDA_BIN"];
  if (explicit && explicit.length > 0) {
    return { command: explicit, baseArgs: [] };
  }
  return { command: "npx", baseArgs: ["mda"] };
}

/**
 * Spawn `mda` and parse its last stdout line. Stream NDJSON to `onEvent` if
 * supplied (useful for asset-plan exec).
 */
export async function runMda<T>(
  workspaceRoot: string,
  args: string[],
  schema: z.ZodType<T>,
  options: RunOptions = {},
): Promise<MdaResult<T>> {
  const bin = options.bin ?? defaultBin();
  const cwd = resolvePath(workspaceRoot);

  return new Promise<MdaResult<T>>((resolveFn, rejectFn) => {
    const child = spawn(bin.command, [...bin.baseArgs, ...args], {
      cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdoutBuf = "";
    let stderrBuf = "";
    let lineBuf = "";

    const handleLine = (line: string): void => {
      if (!options.onEvent) return;
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        options.onEvent(JSON.parse(trimmed));
      } catch {
        // Non-JSON lines (warnings, etc) — ignore; the buffer below still
        // captures them for last-line parsing at exit.
      }
    };

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf-8");
      stdoutBuf += text;
      lineBuf += text;
      let nl: number;
      while ((nl = lineBuf.indexOf("\n")) >= 0) {
        const line = lineBuf.slice(0, nl);
        lineBuf = lineBuf.slice(nl + 1);
        handleLine(line);
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBuf += chunk.toString("utf-8");
    });

    options.signal?.addEventListener("abort", () => {
      child.kill("SIGTERM");
    });

    child.on("error", rejectFn);
    child.on("close", (code) => {
      if (lineBuf.trim()) handleLine(lineBuf);
      const lastLine = lastNonEmptyLine(stdoutBuf);
      let parsed: T | null = null;
      if (lastLine) {
        try {
          const value = JSON.parse(lastLine);
          const result = schema.safeParse(value);
          parsed = result.success ? result.data : null;
        } catch {
          parsed = null;
        }
      }
      resolveFn({
        exitCode: code ?? 1,
        parsed,
        stderr: stderrBuf,
        rawStdout: stdoutBuf,
      });
    });
  });
}

function lastNonEmptyLine(text: string): string | null {
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line === undefined) continue;
    const trimmed = line.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Per-command helpers
// ---------------------------------------------------------------------------

export async function runValidate(
  workspaceRoot: string,
  options: RunOptions = {},
): Promise<MdaResult<MdaValidateResult>> {
  return runMda(workspaceRoot, ["validate", "--json"], validateResultSchema, options);
}

export async function runGate(
  workspaceRoot: string,
  layer: string,
  options: RunOptions = {},
): Promise<MdaResult<MdaGateResult[]>> {
  return runMda(
    workspaceRoot,
    ["gate", layer, "--json"],
    gateResultArraySchema,
    options,
  );
}

export async function runNew(
  workspaceRoot: string,
  layer: string,
  name: string,
  overrides: Record<string, unknown> = {},
  options: RunOptions = {},
): Promise<MdaResult<MdaNewResult>> {
  // Pass overrides via stdin would require CLI changes; instead, write to a
  // tmp file and feed it via --from-json.
  const { writeFile } = await import("node:fs/promises");
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "mda-new-"));
  const path = join(dir, "overrides.json");
  await writeFile(path, JSON.stringify(overrides), "utf-8");
  return runMda(
    workspaceRoot,
    ["new", layer, name, "--from-json", path, "--no-prompt", "--json"],
    newResultSchema,
    options,
  );
}

export async function runAssetPlanGenerate(
  workspaceRoot: string,
  assetId: string,
  options: RunOptions = {},
): Promise<MdaResult<MdaAssetPlanEvent>> {
  return runMda(
    workspaceRoot,
    ["asset-plan", "generate", assetId, "--json"],
    assetPlanEventSchema,
    options,
  );
}

export async function runAssetPlanExec(
  workspaceRoot: string,
  assetId: string,
  options: RunOptions = {},
): Promise<MdaResult<MdaAssetPlanEvent>> {
  return runMda(
    workspaceRoot,
    ["asset-plan", "exec", assetId, "--json"],
    assetPlanEventSchema,
    options,
  );
}

export async function runAssetPlanImport(
  workspaceRoot: string,
  assetId: string,
  options: RunOptions = {},
): Promise<MdaResult<MdaAssetPlanEvent>> {
  return runMda(
    workspaceRoot,
    ["asset-plan", "import", assetId, "--json"],
    assetPlanEventSchema,
    options,
  );
}
