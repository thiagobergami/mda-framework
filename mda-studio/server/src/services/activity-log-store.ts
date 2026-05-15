/**
 * In-memory activity-log ring buffer (phase U7).
 *
 * Subsystems call `recordActivity(...)` from their mutation paths to
 * append a human-readable entry. The buffer is capped at 500 to avoid
 * unbounded growth — when the persistent `activity_log` table arrives
 * the cap goes away.
 *
 * Reads are newest-first; `since` filters out entries older-than-or-equal
 * to an ISO timestamp for incremental fetches. The shape matches
 * `@mda-studio/shared/activity`.
 */

import type { ActivityEntry, ActivityKind } from "@mda-studio/shared";

const MAX_ENTRIES = 500;

const entries: ActivityEntry[] = [];
let seq = 0;

function nowIso(): string {
  return new Date().toISOString();
}

export interface RecordActivityInput {
  studioId: string;
  gameId?: string | null;
  specId?: string | null;
  kind: ActivityKind;
  summary: string;
  actor?: string | null;
}

export function recordActivity(input: RecordActivityInput): ActivityEntry {
  seq += 1;
  const entry: ActivityEntry = {
    id: `ACT-${String(seq).padStart(4, "0")}`,
    studioId: input.studioId,
    gameId: input.gameId ?? null,
    specId: input.specId ?? null,
    kind: input.kind,
    summary: input.summary,
    actor: input.actor ?? null,
    createdAt: nowIso(),
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
  return entry;
}

export interface ListActivityOptions {
  limit?: number;
  since?: string;
  gameId?: string;
}

/** Newest-first. Applies optional `limit`, `since`, and `gameId` filters. */
export function listActivityForStudio(
  studioId: string,
  opts: ListActivityOptions = {},
): ActivityEntry[] {
  const limit = opts.limit ?? 100;
  const filtered = entries.filter((e) => {
    if (e.studioId !== studioId) return false;
    if (opts.gameId && e.gameId !== opts.gameId) return false;
    if (opts.since && e.createdAt <= opts.since) return false;
    return true;
  });
  return filtered.reverse().slice(0, limit);
}

/** Test-only convenience. */
export function clearActivityLog(): void {
  entries.length = 0;
  seq = 0;
}

/** Test-only inspection. */
export function activityCount(): number {
  return entries.length;
}
