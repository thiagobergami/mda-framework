import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as axeMatchers from "vitest-axe/matchers";

expect.extend(axeMatchers);

/**
 * Default fetch mock: rejects so any component using `useSpecTree` falls
 * back to its bundled fixture. Tests that need a specific response should
 * override with `vi.spyOn(globalThis, "fetch")`.
 */
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.reject(new Error("fetch disabled in tests by default")),
    ),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
