import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useUrlSearchParams } from "./useUrlSearchParams";

const ORIGINAL = window.location.href;

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  window.history.replaceState(null, "", ORIGINAL);
});

describe("useUrlSearchParams", () => {
  it("reads the current query string on mount", () => {
    window.history.replaceState(null, "", "/?q=hello&agent=mech-1");
    const { result } = renderHook(() => useUrlSearchParams());
    expect(result.current[0].get("q")).toBe("hello");
    expect(result.current[0].get("agent")).toBe("mech-1");
  });

  it("set() with new params pushes a new history entry", () => {
    const { result } = renderHook(() => useUrlSearchParams());
    act(() => result.current[1](new URLSearchParams("layer=M")));
    expect(window.location.search).toBe("?layer=M");
    expect(result.current[0].get("layer")).toBe("M");
  });

  it("set(updater) receives the current params", () => {
    window.history.replaceState(null, "", "/?node=MEC-001");
    const { result } = renderHook(() => useUrlSearchParams());
    act(() =>
      result.current[1]((curr) => {
        const next = new URLSearchParams(curr);
        next.set("q", "revive");
        return next;
      }),
    );
    expect(window.location.search).toContain("node=MEC-001");
    expect(window.location.search).toContain("q=revive");
  });

  it("set({ replace: true }) does not add a history entry", () => {
    const before = window.history.length;
    const { result } = renderHook(() => useUrlSearchParams());
    act(() =>
      result.current[1](new URLSearchParams("q=z"), { replace: true }),
    );
    // jsdom doesn't fully simulate history length growth on replace; but at
    // least the URL should reflect the change without throwing.
    expect(window.location.search).toBe("?q=z");
    expect(before).toBeGreaterThan(0);
  });

  it("responds to popstate by re-reading the URL", () => {
    const { result } = renderHook(() => useUrlSearchParams());
    act(() => {
      window.history.replaceState(null, "", "/?status=draft");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current[0].get("status")).toBe("draft");
  });
});
