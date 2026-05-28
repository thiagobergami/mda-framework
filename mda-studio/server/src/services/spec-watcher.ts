/**
 * Per-game filesystem watcher.
 *
 * Watches the same directories the spec-cache scans
 * (`specs/aesthetics/*.md`, `specs/dynamics/*.md`, etc.) and emits a
 * `node-changed` studio event whenever a relevant file is added, modified, or
 * deleted. The watcher is started in `games-registry.registerGame` and torn
 * down in `unregisterGame` so the lifecycle follows registration.
 *
 * Why chokidar: filesystem-event delivery on Windows / WSL / Linux is
 * inconsistent. Chokidar's `usePolling` fallback (plan risk R3) keeps the
 * UI live on platforms where native fsevents miss writes. We default polling
 * on when the host looks like WSL.
 *
 * See plan task D3.EN3 for full context.
 */

import chokidar, { type FSWatcher } from "chokidar";
import { basename, extname, join, posix, relative, sep } from "node:path";
import { publishStudioEvent } from "./studio-events.js";

// Chokidar v4 dropped built-in glob expansion. We watch directories directly
// and filter in the event handler instead.
const WATCH_DIRS: readonly string[] = [
  "specs/aesthetics",
  "specs/dynamics",
  "specs/mechanics",
  "specs/assets",
  "specs/tuning",
  "design/levels",
];

const DEBOUNCE_MS = 250;

/**
 * Best-effort spec-id detection from a filename + a snippet of the file's
 * frontmatter. Returns null when no id can be derived; callers should
 * invalidate the whole game in that case.
 */
function specIdFromBaseName(file: string): string | null {
  // Filenames in this tree are not authoritative for the spec id, but the
  // slug-from-frontmatter mapping lives in spec-parser. For watcher events we
  // accept losing the id and let the consumer refetch.
  const name = basename(file);
  if (name.startsWith("_")) return null; // schema / example files
  return null;
}

export interface SpecWatcherHandle {
  /** Stop the watcher and release filesystem listeners. */
  close(): Promise<void>;
  /** Promise that resolves once the initial scan has completed. */
  ready(): Promise<void>;
}

export interface StartSpecWatcherOptions {
  /** Force polling mode (default: true on WSL / Windows). */
  usePolling?: boolean;
}

/**
 * Start a watcher for one game. The studio publishes a `node-changed` event
 * for every relevant filesystem change inside `workspaceRoot`. When the spec
 * id can't be derived from the filename, `specId` falls back to "*" so
 * downstream consumers know to invalidate the whole tree for this game.
 */
export function startSpecWatcher(
  gameId: string,
  workspaceRoot: string,
  options: StartSpecWatcherOptions = {},
): SpecWatcherHandle {
  const polling = options.usePolling ?? isPollingPlatform();
  const dirs = WATCH_DIRS.map((d) => join(workspaceRoot, d));

  const watcher: FSWatcher = chokidar.watch(dirs, {
    ignoreInitial: true,
    usePolling: polling,
    interval: 100,
    binaryInterval: 200,
    ignored: (path, stats) => {
      // We must allow directories so chokidar descends into them. For files
      // we filter on the extension and on the leading-underscore convention.
      // Whichever check we make has to work both with and without `stats`.
      const name = basename(path);
      if (stats?.isDirectory()) return false;
      // If `name` has no extension we treat it as a directory candidate.
      const ext = extname(name);
      if (!ext) return false;
      if (name.startsWith("_")) return true;
      if (ext !== ".md") return true;
      return false;
    },
  });

  const pending = new Set<string>();
  let timer: NodeJS.Timeout | null = null;

  const flush = (): void => {
    timer = null;
    const files = [...pending];
    pending.clear();
    if (files.length === 0) {
      publishStudioEvent({ type: "node-changed", gameId, specId: "*" });
      return;
    }
    const specIds = new Set<string>();
    for (const file of files) {
      const id = specIdFromBaseName(file);
      if (id) specIds.add(id);
    }
    if (specIds.size === 0) {
      publishStudioEvent({ type: "node-changed", gameId, specId: "*" });
      return;
    }
    for (const specId of specIds) {
      publishStudioEvent({ type: "node-changed", gameId, specId });
    }
  };

  const schedule = (file: string): void => {
    const name = basename(file);
    if (name.startsWith("_")) return;
    if (extname(name) !== ".md") return;
    pending.add(file);
    if (!timer) timer = setTimeout(flush, DEBOUNCE_MS);
  };

  watcher.on("add", schedule);
  watcher.on("change", schedule);
  watcher.on("unlink", schedule);

  let readyResolve: (() => void) | null = null;
  const readyPromise = new Promise<void>((r) => {
    readyResolve = r;
  });
  watcher.on("ready", () => {
    readyResolve?.();
  });

  return {
    async close() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await watcher.close();
    },
    ready() {
      return readyPromise;
    },
  };
}

function toPosix(p: string): string {
  return sep === "\\" ? p.replaceAll("\\", "/") : p;
}

function isPollingPlatform(): boolean {
  if (process.platform === "win32") return true;
  // WSL exposes /proc/version with "microsoft" in the kernel string.
  try {
    // Lazy require to keep top-level import surface minimal.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const proc = readFileSync("/proc/version", "utf-8");
    if (/microsoft/i.test(proc)) return true;
  } catch {
    /* not Linux or no /proc */
  }
  return false;
}
