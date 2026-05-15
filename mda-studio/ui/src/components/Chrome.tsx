import { type ReactNode } from "react";

interface ChromeProps {
  studioName: string;
  gameName: string | null;
  pendingApprovals: number;
  onChangeGame: () => void;
  /** Optional slot for the chrome search input (rendered when a game is open). */
  search?: ReactNode;
  /** Optional palette / help triggers shown on the right of the chrome. */
  onOpenPalette?: () => void;
  onOpenHelp?: () => void;
  /** Clicking the approvals badge opens the approvals queue. */
  onOpenApprovals?: () => void;
  /** Clicking the Activity link opens the activity slide-out. */
  onOpenActivity?: () => void;
  /** Open the Costs detail view. */
  onOpenCosts?: () => void;
  /** Open the Org chart view. */
  onOpenOrg?: () => void;
  /** Open the Asset plans list view. */
  onOpenAssetPlans?: () => void;
  /** Open the Settings view. */
  onOpenSettings?: () => void;
  /** Highlighted secondary surface (one of "costs"|"org"|"asset-plans"|"settings"|"approvals"). */
  activeView?: string | null;
}

export function Chrome({
  studioName,
  gameName,
  pendingApprovals,
  onChangeGame,
  search,
  onOpenPalette,
  onOpenHelp,
  onOpenApprovals,
  onOpenActivity,
  onOpenCosts,
  onOpenOrg,
  onOpenAssetPlans,
  onOpenSettings,
  activeView,
}: ChromeProps): JSX.Element {
  const navButton = (
    id: string,
    label: string,
    onClick?: () => void,
  ): JSX.Element | null => {
    if (!onClick) return null;
    const isActive = activeView === id;
    return (
      <button
        type="button"
        className="chrome__selector"
        onClick={onClick}
        aria-label={`Open ${label.toLowerCase()} view`}
        aria-pressed={isActive}
        data-active={isActive ? "true" : "false"}
      >
        {label}
      </button>
    );
  };
  return (
    <header className="chrome" role="banner">
      <div className="chrome__brand">MDA Studio</div>
      <button type="button" className="chrome__selector" disabled>
        {`${studioName} ▾`}
      </button>
      <button
        type="button"
        className="chrome__selector"
        onClick={onChangeGame}
        aria-label="Change game"
      >
        {`${gameName ?? "Pick a game"} ▾`}
      </button>
      {search ? <div className="chrome__search-slot">{search}</div> : null}
      <div className="chrome__spacer" />
      {navButton("costs", "Costs", onOpenCosts)}
      {navButton("org", "Org", onOpenOrg)}
      {navButton("asset-plans", "Asset Plans", onOpenAssetPlans)}
      {navButton("settings", "Settings", onOpenSettings)}
      {onOpenActivity && (
        <button
          type="button"
          className="chrome__selector"
          onClick={onOpenActivity}
          aria-label="Open activity log"
          title="Activity"
        >
          Activity
        </button>
      )}
      {onOpenPalette && (
        <button
          type="button"
          className="chrome__selector"
          onClick={onOpenPalette}
          aria-label="Open command palette"
          title="⌘K"
        >
          ⌘K
        </button>
      )}
      {onOpenHelp && (
        <button
          type="button"
          className="chrome__selector"
          onClick={onOpenHelp}
          aria-label="Keyboard shortcuts"
          title="?"
        >
          ?
        </button>
      )}
      <button
        type="button"
        className={
          pendingApprovals > 0
            ? "chrome__badge chrome__badge--pulse chrome__badge--button"
            : "chrome__badge chrome__badge--button"
        }
        onClick={onOpenApprovals}
        disabled={!onOpenApprovals}
        aria-label={`${pendingApprovals} pending approval${
          pendingApprovals === 1 ? "" : "s"
        }`}
      >
        Approvals · {pendingApprovals}
      </button>
    </header>
  );
}
