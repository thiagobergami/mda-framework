/**
 * In-memory validator-runs store. Holds the latest run per game; older
 * runs are not retained in V1 (the API only needs the latest payload).
 *
 * When the persistent `validator_runs` table arrives this file is
 * replaced by a Drizzle-backed query keeping the same shape.
 */

import {
  DEFAULT_STUDIO_ID,
  type ValidatorRun,
  type ValidatorWarning,
} from "@mda-studio/shared";
import { recordActivity } from "./activity-log-store.js";
import { publishStudioEvent } from "./studio-events.js";

const latestByGame = new Map<string, ValidatorRun>();
let seq = 0;

export function recordValidatorRun(
  gameId: string,
  warnings: readonly ValidatorWarning[],
): ValidatorRun {
  seq += 1;
  const run: ValidatorRun = {
    id: `VR-${String(seq).padStart(3, "0")}`,
    gameId,
    ranAt: new Date().toISOString(),
    warnings: [...warnings],
  };
  latestByGame.set(gameId, run);
  publishStudioEvent({
    type: "validator-run-completed",
    gameId,
  });
  recordActivity({
    studioId: DEFAULT_STUDIO_ID,
    gameId,
    specId: null,
    kind: "validator-run-completed",
    summary: `Validator run ${run.id} completed — ${run.warnings.length} warning${run.warnings.length === 1 ? "" : "s"}`,
    actor: null,
  });
  return run;
}

export function latestValidatorRun(gameId: string): ValidatorRun | undefined {
  return latestByGame.get(gameId);
}

export function listValidatorWarnings(gameId: string): ValidatorWarning[] {
  return latestByGame.get(gameId)?.warnings ?? [];
}

export function clearValidatorRunsStore(): void {
  latestByGame.clear();
  seq = 0;
}
