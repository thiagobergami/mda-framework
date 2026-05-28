/**
 * Helpers for emitting NDJSON events from `mda asset-plan --json`.
 *
 * Events are a stable contract between this CLI and the `mda-runner` service
 * in `mda-studio/server/`. Each event is one compact JSON object per line on
 * stdout. The studio's SSE bridge re-emits these as `studio-events`.
 *
 * When `--json` is off, the helpers are inert; existing chalk output runs
 * normally.
 */

export interface AssetPlanEvent {
  event: string;
  ts: string;
  [k: string]: unknown;
}

export interface EventEmitter {
  emit(event: string, payload?: Record<string, unknown>): void;
  /** True when `--json` was supplied; library code uses this to gate prompts. */
  jsonMode: boolean;
}

export function makeEmitter(jsonMode: boolean): EventEmitter {
  return {
    jsonMode,
    emit(event, payload = {}) {
      if (!jsonMode) return;
      const obj: AssetPlanEvent = {
        event,
        ts: new Date().toISOString(),
        ...payload,
      };
      process.stdout.write(JSON.stringify(obj) + "\n");
    },
  };
}
