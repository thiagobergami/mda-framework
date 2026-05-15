/**
 * Subscribes to the server-side SSE feed (plan §9.1 / phase U6).
 *
 * Opens an `EventSource` against `/api/studios/:studioId/events`, parses
 * each `StudioEvent` frame, and invokes the latest `onEvent` handler. The
 * handler is stored in a ref so callers can pass an inline closure without
 * triggering a reconnect on every render.
 *
 * Test hooks:
 *   - `enabled: false` skips opening the stream (default in environments
 *     without `EventSource`, e.g. jsdom)
 *   - `eventSourceCtor` lets tests inject a fake `EventSource`
 */

import { useEffect, useRef } from "react";
import {
  STUDIO_EVENT_TYPES,
  studioEventSchema,
  type StudioEvent,
  type StudioEventType,
} from "@mda-studio/shared";

type EventSourceLike = {
  addEventListener(type: string, listener: (e: MessageEvent) => void): void;
  close(): void;
};
export type EventSourceCtor = (url: string) => EventSourceLike;

export interface UseStudioEventsOptions {
  studioId: string;
  onEvent: (event: StudioEvent) => void;
  /** When false, the hook is a no-op. Defaults to true. */
  enabled?: boolean;
  /** Inject an `EventSource` factory; defaults to `window.EventSource`. */
  eventSourceCtor?: EventSourceCtor;
}

export function useStudioEvents(options: UseStudioEventsOptions): void {
  const { studioId, enabled = true, eventSourceCtor } = options;

  // Keep the latest handler in a ref so we don't reconnect on every render.
  const handlerRef = useRef(options.onEvent);
  handlerRef.current = options.onEvent;

  useEffect(() => {
    if (!enabled) return;
    const factory =
      eventSourceCtor ??
      (typeof window !== "undefined" && "EventSource" in window
        ? (url: string) =>
            new (window as unknown as { EventSource: new (u: string) => EventSourceLike }).EventSource(url)
        : null);
    if (!factory) return;

    const source = factory(`/api/studios/${studioId}/events`);

    const dispatch = (evt: MessageEvent): void => {
      let json: unknown;
      try {
        json = JSON.parse(evt.data);
      } catch {
        return;
      }
      const parsed = studioEventSchema.safeParse(json);
      if (!parsed.success) return;
      handlerRef.current(parsed.data);
    };

    for (const type of STUDIO_EVENT_TYPES as readonly StudioEventType[]) {
      source.addEventListener(type, dispatch);
    }

    return () => source.close();
  }, [studioId, enabled, eventSourceCtor]);
}
