interface KeymapHelpProps {
  open: boolean;
  onClose: () => void;
}

const KEYS: Array<{ chord: string; what: string }> = [
  { chord: "⌘K / Ctrl+K", what: "Open command palette" },
  { chord: "/", what: "Focus search" },
  { chord: "?", what: "Toggle this help" },
  { chord: "Esc", what: "Close overlays" },
  { chord: "↑ / ↓", what: "Navigate palette / tree" },
  { chord: "Enter", what: "Activate result / open spec" },
  { chord: "← / →", what: "Collapse / expand tree row" },
];

export function KeymapHelp({ open, onClose }: KeymapHelpProps): JSX.Element | null {
  if (!open) return null;
  return (
    <div
      className="palette__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="keymap">
        <h3 className="keymap__title">Keyboard shortcuts</h3>
        <table className="keymap__table">
          <tbody>
            {KEYS.map((k) => (
              <tr key={k.chord}>
                <td>
                  <kbd>{k.chord}</kbd>
                </td>
                <td>{k.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="keymap__close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
