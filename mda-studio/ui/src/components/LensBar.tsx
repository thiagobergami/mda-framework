import {
  lensesAreActive,
  type ActiveLenses,
} from "../lib/lenses";

interface LensBarProps {
  lenses: ActiveLenses;
  matchCount: number;
  totalCount: number;
  onClear: (key: keyof ActiveLenses) => void;
  onClearAll: () => void;
}

/**
 * Renders the active lens chips below the chrome. Each chip is keyed by
 * the lens it represents; clicking × removes only that lens. "Clear all"
 * resets to no lenses.
 *
 * Renders nothing when no lens is active so it doesn't waste vertical
 * space on the default tree view.
 */
export function LensBar({
  lenses,
  matchCount,
  totalCount,
  onClear,
  onClearAll,
}: LensBarProps): JSX.Element | null {
  if (!lensesAreActive(lenses)) return null;

  const chips: Array<{ key: keyof ActiveLenses; label: string }> = [];
  if (lenses.q) chips.push({ key: "q", label: `text: ${lenses.q}` });
  if (lenses.agent) chips.push({ key: "agent", label: `agent: @${lenses.agent}` });
  if (lenses.layer) chips.push({ key: "layer", label: `layer: ${lenses.layer}` });
  if (lenses.status) chips.push({ key: "status", label: `status: ${lenses.status}` });
  if (lenses.warnings) chips.push({ key: "warnings", label: "warnings only" });

  return (
    <div className="lens-bar" role="region" aria-label="Active lenses">
      <span className="lens-bar__count">
        {matchCount} of {totalCount} match
      </span>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          className="lens-chip"
          onClick={() => onClear(c.key)}
          aria-label={`Remove lens ${c.label}`}
        >
          <span>{c.label}</span>
          <span className="lens-chip__x" aria-hidden="true">
            ×
          </span>
        </button>
      ))}
      <button
        type="button"
        className="lens-bar__clear"
        onClick={onClearAll}
      >
        clear all
      </button>
    </div>
  );
}
