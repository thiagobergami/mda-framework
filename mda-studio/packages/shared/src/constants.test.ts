import { describe, it, expect } from "vitest";
import {
  DEFAULT_PORT,
  DEFAULT_HOST_LOOPBACK,
  HEARTBEAT_MIN_INTERVAL_SEC,
  HEARTBEAT_DEFAULT_MAX_CONCURRENT_RUNS,
  HEARTBEAT_MAX_CONCURRENT_RUNS_CAP,
} from "./constants";

describe("network defaults", () => {
  it("DEFAULT_PORT matches the documented onboarding port (3100)", () => {
    expect(DEFAULT_PORT).toBe(3100);
  });

  it("DEFAULT_HOST_LOOPBACK is 127.0.0.1 — never 0.0.0.0", () => {
    expect(DEFAULT_HOST_LOOPBACK).toBe("127.0.0.1");
  });
});

describe("heartbeat scheduler bounds (spec FR-36)", () => {
  it("minimum interval is 30 seconds", () => {
    expect(HEARTBEAT_MIN_INTERVAL_SEC).toBe(30);
  });

  it("default max concurrent runs is 20", () => {
    expect(HEARTBEAT_DEFAULT_MAX_CONCURRENT_RUNS).toBe(20);
  });

  it("max concurrent runs cap is 50", () => {
    expect(HEARTBEAT_MAX_CONCURRENT_RUNS_CAP).toBe(50);
  });
});
