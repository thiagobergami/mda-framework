import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { STUDIO_EVENT_TYPES, type StudioEvent } from "@mda-studio/shared";
import {
  useStudioEvents,
  type EventSourceCtor,
} from "./useStudioEvents";

interface FakeEventSource {
  url: string;
  closed: boolean;
  listeners: Map<string, Array<(e: MessageEvent) => void>>;
  emit(type: string, payload: unknown): void;
  addEventListener(type: string, listener: (e: MessageEvent) => void): void;
  close(): void;
}

function makeFakeFactory(): {
  ctor: EventSourceCtor;
  instances: FakeEventSource[];
} {
  const instances: FakeEventSource[] = [];
  const ctor: EventSourceCtor = (url: string) => {
    const fake: FakeEventSource = {
      url,
      closed: false,
      listeners: new Map(),
      emit(type, payload) {
        const event = {
          data: typeof payload === "string" ? payload : JSON.stringify(payload),
        } as MessageEvent;
        for (const fn of this.listeners.get(type) ?? []) fn(event);
      },
      addEventListener(type, listener) {
        const arr = this.listeners.get(type) ?? [];
        arr.push(listener);
        this.listeners.set(type, arr);
      },
      close() {
        this.closed = true;
      },
    };
    instances.push(fake);
    return fake;
  };
  return { ctor, instances };
}

describe("useStudioEvents", () => {
  it("opens an EventSource against the studio-specific URL", () => {
    const { ctor, instances } = makeFakeFactory();
    renderHook(() =>
      useStudioEvents({
        studioId: "default",
        onEvent: () => undefined,
        eventSourceCtor: ctor,
      }),
    );
    expect(instances).toHaveLength(1);
    expect(instances[0]?.url).toBe("/api/studios/default/events");
  });

  it("subscribes to every known StudioEvent type", () => {
    const { ctor, instances } = makeFakeFactory();
    renderHook(() =>
      useStudioEvents({
        studioId: "default",
        onEvent: () => undefined,
        eventSourceCtor: ctor,
      }),
    );
    const fake = instances[0]!;
    for (const t of STUDIO_EVENT_TYPES) {
      expect(fake.listeners.get(t)?.length).toBe(1);
    }
  });

  it("dispatches parsed events to the handler", () => {
    const { ctor, instances } = makeFakeFactory();
    const handler = vi.fn();
    renderHook(() =>
      useStudioEvents({
        studioId: "default",
        onEvent: handler,
        eventSourceCtor: ctor,
      }),
    );
    const fake = instances[0]!;
    const event: StudioEvent = {
      type: "node-changed",
      gameId: "g",
      specId: "MEC-001",
    };
    fake.emit("node-changed", event);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it("ignores malformed JSON", () => {
    const { ctor, instances } = makeFakeFactory();
    const handler = vi.fn();
    renderHook(() =>
      useStudioEvents({
        studioId: "default",
        onEvent: handler,
        eventSourceCtor: ctor,
      }),
    );
    instances[0]!.emit("node-changed", "definitely-not-json");
    expect(handler).not.toHaveBeenCalled();
  });

  it("ignores payloads that don't validate against the schema", () => {
    const { ctor, instances } = makeFakeFactory();
    const handler = vi.fn();
    renderHook(() =>
      useStudioEvents({
        studioId: "default",
        onEvent: handler,
        eventSourceCtor: ctor,
      }),
    );
    instances[0]!.emit("node-changed", { type: "not-a-real-event" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("closes the EventSource on unmount", () => {
    const { ctor, instances } = makeFakeFactory();
    const { unmount } = renderHook(() =>
      useStudioEvents({
        studioId: "default",
        onEvent: () => undefined,
        eventSourceCtor: ctor,
      }),
    );
    unmount();
    expect(instances[0]?.closed).toBe(true);
  });

  it("no-ops when disabled", () => {
    const { ctor, instances } = makeFakeFactory();
    renderHook(() =>
      useStudioEvents({
        studioId: "default",
        onEvent: () => undefined,
        eventSourceCtor: ctor,
        enabled: false,
      }),
    );
    expect(instances).toHaveLength(0);
  });
});
