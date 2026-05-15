import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGlobalShortcuts } from "./useGlobalShortcuts";

function fireKey(opts: KeyboardEventInit & { key: string }, target?: Element): void {
  const ev = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...opts });
  if (target) {
    Object.defineProperty(ev, "target", { value: target });
  }
  window.dispatchEvent(ev);
}

describe("useGlobalShortcuts", () => {
  it("⌘K toggles the palette", () => {
    const onTogglePalette = vi.fn();
    renderHook(() =>
      useGlobalShortcuts({
        onTogglePalette,
        onFocusSearch: () => {},
        onToggleHelp: () => {},
        onEscape: () => {},
      }),
    );
    fireKey({ key: "k", metaKey: true });
    expect(onTogglePalette).toHaveBeenCalled();
  });

  it("Ctrl+K also toggles the palette", () => {
    const onTogglePalette = vi.fn();
    renderHook(() =>
      useGlobalShortcuts({
        onTogglePalette,
        onFocusSearch: () => {},
        onToggleHelp: () => {},
        onEscape: () => {},
      }),
    );
    fireKey({ key: "k", ctrlKey: true });
    expect(onTogglePalette).toHaveBeenCalled();
  });

  it("/ focuses search, ? toggles help", () => {
    const onFocusSearch = vi.fn();
    const onToggleHelp = vi.fn();
    renderHook(() =>
      useGlobalShortcuts({
        onTogglePalette: () => {},
        onFocusSearch,
        onToggleHelp,
        onEscape: () => {},
      }),
    );
    fireKey({ key: "/" });
    fireKey({ key: "?" });
    expect(onFocusSearch).toHaveBeenCalled();
    expect(onToggleHelp).toHaveBeenCalled();
  });

  it("Esc always reaches the handler, even from inside an input", () => {
    const onEscape = vi.fn();
    const input = document.createElement("input");
    document.body.appendChild(input);
    renderHook(() =>
      useGlobalShortcuts({
        onTogglePalette: () => {},
        onFocusSearch: () => {},
        onToggleHelp: () => {},
        onEscape,
      }),
    );
    fireKey({ key: "Escape" }, input);
    expect(onEscape).toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("Other shortcuts no-op when focus is in an input", () => {
    const onTogglePalette = vi.fn();
    const onFocusSearch = vi.fn();
    const input = document.createElement("input");
    document.body.appendChild(input);
    renderHook(() =>
      useGlobalShortcuts({
        onTogglePalette,
        onFocusSearch,
        onToggleHelp: () => {},
        onEscape: () => {},
      }),
    );
    fireKey({ key: "/" }, input);
    fireKey({ key: "k", metaKey: true }, input);
    expect(onFocusSearch).not.toHaveBeenCalled();
    expect(onTogglePalette).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });
});
