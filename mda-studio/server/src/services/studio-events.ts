/**
 * Process-local pub/sub for studio events (plan §9.1 / phase U6).
 *
 * The bus is intentionally tiny: one set of listeners; publish is sync;
 * subscribe returns an unsubscribe callback. The SSE route is the only
 * fan-out point for now, so cross-process delivery is a non-goal until a
 * studios cluster exists.
 *
 * Stores call `publishStudioEvent(...)` from their mutation paths. The bus
 * does not enforce scope — callers must include the right `gameId` /
 * `studioId` so SSE clients can filter.
 */

import type { StudioEvent } from "@mda-studio/shared";

export type StudioEventListener = (event: StudioEvent) => void;

const listeners = new Set<StudioEventListener>();

export function publishStudioEvent(event: StudioEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // A failing listener must not block other consumers (e.g. one
      // disconnected SSE socket should not break the rest).
    }
  }
}

export function subscribeStudioEvents(
  listener: StudioEventListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only: drops all listeners between specs. */
export function clearStudioEventListeners(): void {
  listeners.clear();
}

/** Test-only inspection. */
export function studioEventListenerCount(): number {
  return listeners.size;
}
