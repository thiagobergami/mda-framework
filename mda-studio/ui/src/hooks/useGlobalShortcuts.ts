/**
 * Global keyboard shortcuts for the spec-tree UI.
 *
 *   ⌘K / Ctrl+K   toggle command palette
 *   /             focus the chrome search input
 *   ?             toggle the keymap help overlay
 *   Esc           close any open overlay
 *
 * Shortcuts NO-OP when an input/textarea/contenteditable element is the
 * focused target (except for Esc, which should still close overlays).
 */

import { useEffect } from "react";

export interface ShortcutHandlers {
  onTogglePalette: () => void;
  onFocusSearch: () => void;
  onToggleHelp: () => void;
  onEscape: () => void;
}

export function useGlobalShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as Element | null;
      const inField = isEditable(target);

      if (e.key === "Escape") {
        handlers.onEscape();
        return;
      }

      if (inField) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handlers.onTogglePalette();
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        handlers.onFocusSearch();
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        handlers.onToggleHelp();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}

function isEditable(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}
