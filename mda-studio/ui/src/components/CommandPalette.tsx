import { useEffect, useMemo, useRef, useState } from "react";
import type { SpecTreeNode } from "@mda-studio/shared";

export type PaletteItem =
  | { kind: "spec"; specId: string; title: string; layer: SpecTreeNode["layer"] }
  | { kind: "agent"; handle: string }
  | { kind: "issue"; issueId: string; specId: string; title: string };

interface CommandPaletteProps {
  open: boolean;
  nodes: readonly SpecTreeNode[];
  onClose: () => void;
  /** Called when the user activates a spec result. */
  onPickSpec: (specId: string) => void;
  /** Called when the user activates an agent result — applies the agent lens. */
  onPickAgent: (handle: string) => void;
  /** Called when the user activates an issue result — selects the spec. */
  onPickIssue: (issueId: string, specId: string) => void;
}

/**
 * Modal fuzzy search over specs, agents, and issues already known to
 * the client from `SpecTreeNode[]`. Substring scoring is sufficient for
 * the V1 prototype — better ranking comes when the server returns a
 * proper search index.
 */
export function CommandPalette({
  open,
  nodes,
  onClose,
  onPickSpec,
  onPickAgent,
  onPickIssue,
}: CommandPaletteProps): JSX.Element | null {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [q, setQ] = useState("");
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    if (open) {
      setQ("");
      setHighlight(0);
      // Defer to next tick so the input exists in the DOM.
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => buildItems(nodes), [nodes]);
  const filtered = useMemo<PaletteItem[]>(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items.slice(0, 50);
    return items
      .filter((i) => itemText(i).toLowerCase().includes(needle))
      .slice(0, 50);
  }, [items, q]);

  if (!open) return null;

  const activate = (item: PaletteItem): void => {
    if (item.kind === "spec") onPickSpec(item.specId);
    else if (item.kind === "agent") onPickAgent(item.handle);
    else onPickIssue(item.issueId, item.specId);
    onClose();
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = filtered[highlight];
      if (picked) activate(picked);
    }
  };

  return (
    <div
      className="palette__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onKeyDown={onKeyDown}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="palette">
        <input
          ref={inputRef}
          type="search"
          className="palette__input"
          placeholder="Search specs, agents, issues…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setHighlight(0);
          }}
          aria-label="Palette query"
        />
        <ul className="palette__list" role="listbox" aria-label="Results">
          {filtered.length === 0 && (
            <li className="palette__empty">No matches</li>
          )}
          {filtered.map((item, i) => (
            <li
              key={paletteKey(item)}
              role="option"
              aria-selected={i === highlight}
              className={
                i === highlight ? "palette__row palette__row--hl" : "palette__row"
              }
              onMouseEnter={() => setHighlight(i)}
              onClick={() => activate(item)}
            >
              <PaletteRow item={item} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PaletteRow({ item }: { item: PaletteItem }): JSX.Element {
  if (item.kind === "spec") {
    return (
      <>
        <code className="palette__kind">{item.layer}</code>
        <code className="palette__id">{item.specId}</code>
        <span className="palette__title">{item.title}</span>
      </>
    );
  }
  if (item.kind === "agent") {
    return (
      <>
        <code className="palette__kind">agent</code>
        <span className="palette__title">@{item.handle}</span>
      </>
    );
  }
  return (
    <>
      <code className="palette__kind">issue</code>
      <code className="palette__id">{item.issueId}</code>
      <span className="palette__title">{item.title}</span>
      <code className="palette__id">{item.specId}</code>
    </>
  );
}

function buildItems(nodes: readonly SpecTreeNode[]): PaletteItem[] {
  const out: PaletteItem[] = [];
  const seenAgents = new Set<string>();
  for (const n of nodes) {
    out.push({
      kind: "spec",
      specId: n.specId,
      title: n.title,
      layer: n.layer,
    });
    if (n.activeIssueId) {
      out.push({
        kind: "issue",
        issueId: n.activeIssueId,
        specId: n.specId,
        title: n.title,
      });
    }
    const handle = n.assigneeAgentHandle?.replace(/^@/, "");
    if (handle && !seenAgents.has(handle)) {
      seenAgents.add(handle);
      out.push({ kind: "agent", handle });
    }
  }
  return out;
}

function itemText(item: PaletteItem): string {
  if (item.kind === "spec") return `${item.specId} ${item.title} ${item.layer}`;
  if (item.kind === "agent") return `agent @${item.handle}`;
  return `issue ${item.issueId} ${item.title} ${item.specId}`;
}

function paletteKey(item: PaletteItem): string {
  if (item.kind === "spec") return `s:${item.specId}`;
  if (item.kind === "agent") return `a:${item.handle}`;
  return `i:${item.issueId}`;
}
