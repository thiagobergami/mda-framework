import { afterEach, describe, expect, it, vi } from "vitest";
import type { StudioEvent } from "@mda-studio/shared";
import {
  clearStudioEventListeners,
  publishStudioEvent,
  studioEventListenerCount,
  subscribeStudioEvents,
} from "./studio-events";

afterEach(() => {
  clearStudioEventListeners();
});

describe("studio-events bus", () => {
  it("delivers published events to every subscriber", () => {
    const a = vi.fn();
    const b = vi.fn();
    subscribeStudioEvents(a);
    subscribeStudioEvents(b);
    const event: StudioEvent = {
      type: "node-changed",
      gameId: "g",
      specId: "MEC-001",
    };
    publishStudioEvent(event);
    expect(a).toHaveBeenCalledWith(event);
    expect(b).toHaveBeenCalledWith(event);
  });

  it("unsubscribe removes the listener", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeStudioEvents(listener);
    unsubscribe();
    publishStudioEvent({
      type: "validator-run-completed",
      gameId: "g",
    });
    expect(listener).not.toHaveBeenCalled();
    expect(studioEventListenerCount()).toBe(0);
  });

  it("a throwing listener does not block the rest", () => {
    const noisy = vi.fn(() => {
      throw new Error("boom");
    });
    const quiet = vi.fn();
    subscribeStudioEvents(noisy);
    subscribeStudioEvents(quiet);
    publishStudioEvent({
      type: "node-changed",
      gameId: "g",
      specId: "MEC-001",
    });
    expect(noisy).toHaveBeenCalledOnce();
    expect(quiet).toHaveBeenCalledOnce();
  });
});
