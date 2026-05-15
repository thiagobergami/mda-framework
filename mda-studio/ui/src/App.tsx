import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_STUDIO_ID,
  formatCents,
  type SpecTreeResponse,
  type StudioEvent,
} from "@mda-studio/shared";
import { ActivitySlideout } from "./components/ActivitySlideout";
import { ApprovalsPanel } from "./components/ApprovalsPanel";
import { AssetPlansPanel } from "./components/AssetPlansPanel";
import { Chrome } from "./components/Chrome";
import { CommandPalette } from "./components/CommandPalette";
import { CostsDetailPanel } from "./components/CostsDetailPanel";
import { EmptyTreeCta } from "./components/EmptyTreeCta";
import { GameCardGrid } from "./components/GameCardGrid";
import { KeymapHelp } from "./components/KeymapHelp";
import { LensBar } from "./components/LensBar";
import { NodeDrawer } from "./components/NodeDrawer";
import { OrgChartPanel } from "./components/OrgChartPanel";
import { SearchInput } from "./components/SearchInput";
import { SettingsPanel } from "./components/SettingsPanel";
import { SpecTree } from "./components/SpecTree";
import { fixtureGameCards } from "./fixtures/virus-hunter";
import { useApprovals } from "./hooks/useApprovals";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import { useSpecNodeDetail } from "./hooks/useSpecNodeDetail";
import { useSpecTree, type SpecTreeSource } from "./hooks/useSpecTree";
import { useStudioEvents } from "./hooks/useStudioEvents";
import { useUrlSearchParams } from "./hooks/useUrlSearchParams";
import {
  applyLensPatch,
  applyLenses,
  parseLenses,
  type ActiveLenses,
} from "./lib/lenses";

export function App(): JSX.Element {
  const [params, setParams] = useUrlSearchParams();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Game selection lives in the URL too so deep links work.
  const gameId = params.get("game");
  const selectedSpecId = params.get("node");
  const view = params.get("view");
  const activityOpen = params.get("activity") === "1";
  const activityRefetchRef = useRef<(() => void) | null>(null);

  // Approvals are studio-scoped, so the badge query runs at the top level
  // and the count flows into Chrome regardless of which view is active.
  const approvalsQuery = useApprovals({ studioId: DEFAULT_STUDIO_ID });
  const pendingApprovals = approvalsQuery.data?.pendingCount ?? 0;

  const setView = useCallback(
    (next: string | null) => {
      setParams((curr) => {
        const params = new URLSearchParams(curr);
        if (next) params.set("view", next);
        else params.delete("view");
        return params;
      });
    },
    [setParams],
  );
  const openApprovals = useCallback(() => setView("approvals"), [setView]);
  const openCosts = useCallback(() => setView("costs"), [setView]);
  const openOrg = useCallback(() => setView("org"), [setView]);
  const openAssetPlans = useCallback(() => setView("asset-plans"), [setView]);
  const openSettings = useCallback(() => setView("settings"), [setView]);
  const closeView = useCallback(() => setView(null), [setView]);

  const setActivityOpen = useCallback(
    (open: boolean) => {
      setParams((curr) => {
        const next = new URLSearchParams(curr);
        if (open) next.set("activity", "1");
        else next.delete("activity");
        return next;
      });
    },
    [setParams],
  );
  const openActivity = useCallback(
    () => setActivityOpen(true),
    [setActivityOpen],
  );
  const closeActivity = useCallback(
    () => setActivityOpen(false),
    [setActivityOpen],
  );

  // The activity slide-out needs to refetch from inside the SSE handler.
  // The component registers its refetch via a ref so we can call it
  // without forcing the slide-out to be mounted at all times.
  const registerActivityRefetch = useCallback((fn: () => void) => {
    activityRefetchRef.current = fn;
  }, []);
  const refreshActivity = useCallback(() => {
    activityRefetchRef.current?.();
  }, []);
  useEffect(() => {
    if (!activityOpen) activityRefetchRef.current = null;
  }, [activityOpen]);

  const openGame = useCallback(
    (id: string) => {
      setParams((curr) => {
        const next = new URLSearchParams(curr);
        next.set("game", id);
        next.delete("node");
        return next;
      });
    },
    [setParams],
  );
  const backToStudio = useCallback(() => {
    setParams(new URLSearchParams());
  }, [setParams]);

  const select = useCallback(
    (specId: string) => {
      setParams((curr) => {
        const next = new URLSearchParams(curr);
        next.set("node", specId);
        return next;
      });
    },
    [setParams],
  );
  const closeDrawer = useCallback(() => {
    setParams((curr) => {
      const next = new URLSearchParams(curr);
      next.delete("node");
      return next;
    });
  }, [setParams]);

  const patchLenses = useCallback(
    (patch: Partial<ActiveLenses>) => {
      setParams((curr) => applyLensPatch(curr, patch));
    },
    [setParams],
  );

  const clearLens = useCallback(
    (key: keyof ActiveLenses) => {
      if (key === "q") patchLenses({ q: "" });
      else if (key === "warnings") patchLenses({ warnings: false });
      else patchLenses({ [key]: null } as Partial<ActiveLenses>);
    },
    [patchLenses],
  );

  const clearAllLenses = useCallback(() => {
    patchLenses({
      agent: null,
      status: null,
      layer: null,
      warnings: false,
      q: "",
    });
  }, [patchLenses]);

  const lenses = useMemo(() => parseLenses(params), [params]);

  useGlobalShortcuts({
    onTogglePalette: () => setPaletteOpen((v) => !v),
    onFocusSearch: () => searchRef.current?.focus(),
    onToggleHelp: () => setHelpOpen((v) => !v),
    onEscape: () => {
      if (paletteOpen) setPaletteOpen(false);
      else if (helpOpen) setHelpOpen(false);
      else if (activityOpen) closeActivity();
      else if (view) closeView();
      else if (selectedSpecId) closeDrawer();
    },
  });

  const currentGameName = gameId
    ? fixtureGameCards.find((c) => c.gameId === gameId)?.name ?? null
    : null;

  const isSecondaryView =
    view === "approvals" ||
    view === "costs" ||
    view === "org" ||
    view === "asset-plans" ||
    view === "settings";
  const showSearch = Boolean(gameId) && !isSecondaryView;
  // The Costs panel opens with a subtree pre-scoped when launched from a
  // tree CostChip; the spec id rides in the URL alongside the view.
  const costsScopeSpecId = view === "costs" ? params.get("scope") : null;
  const setCostsScope = useCallback(
    (specId: string | null) => {
      setParams((curr) => {
        const next = new URLSearchParams(curr);
        if (specId) {
          next.set("view", "costs");
          next.set("scope", specId);
        } else {
          next.delete("scope");
        }
        return next;
      });
    },
    [setParams],
  );

  const selectFromAnyView = useCallback(
    (specId: string) => {
      // Picking a spec out of approvals (or any secondary view) clears the
      // overlay view and lands on the tree with the drawer open.
      setParams((curr) => {
        const params = new URLSearchParams(curr);
        params.set("node", specId);
        params.delete("view");
        return params;
      });
    },
    [setParams],
  );

  return (
    <div className="app">
      <Chrome
        studioName="Roblox Framework"
        gameName={currentGameName}
        pendingApprovals={pendingApprovals}
        onChangeGame={backToStudio}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenApprovals={openApprovals}
        onOpenActivity={openActivity}
        onOpenCosts={gameId ? openCosts : undefined}
        onOpenOrg={gameId ? openOrg : undefined}
        onOpenAssetPlans={gameId ? openAssetPlans : undefined}
        onOpenSettings={openSettings}
        activeView={view}
        search={
          showSearch ? (
            <SearchInput
              ref={searchRef}
              value={lenses.q}
              onChange={(q) => patchLenses({ q })}
            />
          ) : null
        }
      />
      <div className="app__body">
        {view === "approvals" ? (
          <ApprovalsPanel
            studioId={DEFAULT_STUDIO_ID}
            onPickSpec={selectFromAnyView}
            onResolved={approvalsQuery.refetch}
          />
        ) : view === "costs" && gameId ? (
          <CostsDetailPanel
            gameId={gameId}
            scopeSpecId={costsScopeSpecId}
            onPickSpec={selectFromAnyView}
            onClearScope={
              costsScopeSpecId ? () => setCostsScope(null) : undefined
            }
          />
        ) : view === "org" && gameId ? (
          <OrgChartPanel gameId={gameId} />
        ) : view === "asset-plans" && gameId ? (
          <AssetPlansPanel gameId={gameId} />
        ) : view === "settings" ? (
          <SettingsPanel />
        ) : !gameId ? (
          <GameCardGrid cards={fixtureGameCards} onOpen={openGame} />
        ) : (
          <GameContainer
            gameId={gameId}
            selectedSpecId={selectedSpecId}
            lenses={lenses}
            patchLenses={patchLenses}
            onSelect={select}
            onCloseDrawer={closeDrawer}
            onClearLens={clearLens}
            onClearAllLenses={clearAllLenses}
            paletteOpen={paletteOpen}
            onClosePalette={() => setPaletteOpen(false)}
            onApprovalChanged={approvalsQuery.refetch}
            onActivityChanged={refreshActivity}
            onOpenCostsScope={setCostsScope}
          />
        )}
      </div>
      <ActivitySlideout
        studioId={DEFAULT_STUDIO_ID}
        gameId={gameId ?? undefined}
        open={activityOpen}
        onClose={closeActivity}
        onPickSpec={selectFromAnyView}
        registerRefetch={registerActivityRefetch}
      />
      <KeymapHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

interface GameContainerProps {
  gameId: string;
  selectedSpecId: string | null;
  lenses: ActiveLenses;
  patchLenses: (patch: Partial<ActiveLenses>) => void;
  onSelect: (specId: string) => void;
  onCloseDrawer: () => void;
  onClearLens: (key: keyof ActiveLenses) => void;
  onClearAllLenses: () => void;
  paletteOpen: boolean;
  onClosePalette: () => void;
  onApprovalChanged: () => void;
  onActivityChanged: () => void;
  onOpenCostsScope: (specId: string) => void;
}

function GameContainer({
  gameId,
  selectedSpecId,
  lenses,
  patchLenses,
  onSelect,
  onCloseDrawer,
  onClearLens,
  onClearAllLenses,
  paletteOpen,
  onClosePalette,
  onApprovalChanged,
  onActivityChanged,
  onOpenCostsScope,
}: GameContainerProps): JSX.Element {
  const tree = useSpecTree(gameId);

  if (tree.status === "loading") {
    return (
      <section className="tree-pane" aria-label="Spec tree pane">
        <p className="muted">Loading spec tree…</p>
      </section>
    );
  }
  if (tree.status === "error" || !tree.data) {
    return (
      <section className="tree-pane" aria-label="Spec tree pane">
        <p className="warn-badge" role="alert">
          Could not load spec tree: {tree.error ?? "unknown error"}
        </p>
      </section>
    );
  }
  return (
    <GameView
      tree={tree.data}
      source={tree.source ?? "api"}
      selectedSpecId={selectedSpecId}
      lenses={lenses}
      patchLenses={patchLenses}
      onSelect={onSelect}
      onCloseDrawer={onCloseDrawer}
      onIssueChanged={tree.refetch}
      onClearLens={onClearLens}
      onClearAllLenses={onClearAllLenses}
      paletteOpen={paletteOpen}
      onClosePalette={onClosePalette}
      onApprovalChanged={onApprovalChanged}
      onActivityChanged={onActivityChanged}
      onOpenCostsScope={onOpenCostsScope}
    />
  );
}

interface GameViewProps {
  tree: SpecTreeResponse;
  source: SpecTreeSource;
  selectedSpecId: string | null;
  lenses: ActiveLenses;
  patchLenses: (patch: Partial<ActiveLenses>) => void;
  onSelect: (specId: string) => void;
  onCloseDrawer: () => void;
  onIssueChanged: () => void;
  onClearLens: (key: keyof ActiveLenses) => void;
  onClearAllLenses: () => void;
  paletteOpen: boolean;
  onClosePalette: () => void;
  onApprovalChanged: () => void;
  onActivityChanged: () => void;
  onOpenCostsScope: (specId: string) => void;
}

function GameView({
  tree,
  source,
  selectedSpecId,
  lenses,
  patchLenses,
  onSelect,
  onCloseDrawer,
  onIssueChanged,
  onClearLens,
  onClearAllLenses,
  paletteOpen,
  onClosePalette,
  onApprovalChanged,
  onActivityChanged,
  onOpenCostsScope,
}: GameViewProps): JSX.Element {
  const detail = useSpecNodeDetail(tree.gameId, selectedSpecId, tree.nodes);

  // Live updates (plan §9.1): refetch the tree/drawer when the server tells
  // us something downstream changed. Fixture-fed runs don't have an API to
  // stream from, so we keep SSE off in that case.
  const sseEnabled = source === "api";
  const handleStudioEvent = useCallback(
    (event: StudioEvent) => {
      // Every studio event corresponds to a new activity log entry.
      onActivityChanged();
      if ("gameId" in event && event.gameId !== tree.gameId) return;
      switch (event.type) {
        case "node-changed":
        case "issue-status-changed":
          onIssueChanged();
          if (selectedSpecId && event.specId === selectedSpecId) {
            detail.refetch();
          }
          return;
        case "cost-event":
        case "validator-run-completed":
          onIssueChanged();
          if (selectedSpecId) detail.refetch();
          return;
        case "approval-changed":
          onApprovalChanged();
          return;
      }
    },
    [
      tree.gameId,
      selectedSpecId,
      detail,
      onIssueChanged,
      onApprovalChanged,
      onActivityChanged,
    ],
  );
  useStudioEvents({
    studioId: DEFAULT_STUDIO_ID,
    onEvent: handleStudioEvent,
    enabled: sseEnabled,
  });

  const totalMtd = tree.nodes
    .filter((n) => n.canonicalParentSpecId === null)
    .reduce((sum, n) => sum + n.costMtdSubtreeCents, 0);
  const activeAgents = new Set(
    tree.nodes
      .map((n) => n.assigneeAgentId)
      .filter((id): id is string => id !== null),
  ).size;

  const lensResult = useMemo(
    () => applyLenses(tree.nodes, lenses),
    [tree.nodes, lenses],
  );

  return (
    <>
      <LensBar
        lenses={lenses}
        matchCount={lensResult.matchingSpecIds.size}
        totalCount={tree.nodes.length}
        onClear={onClearLens}
        onClearAll={onClearAllLenses}
      />
      <div className="game-body">
        <section className="tree-pane" aria-label="Spec tree pane">
          <div className="tree-pane__heading">
            <h1>{tree.concept.title}</h1>
            <span className="muted">
              Primary aesthetic: {tree.concept.primaryAesthetic}
            </span>
            <SourceBadge source={source} />
          </div>
          <div className="tree-pane__stats">
            <span>{formatCents(totalMtd)} MTD</span>
            <span>{activeAgents} agents</span>
            <span>{tree.nodes.length} specs</span>
          </div>
          {tree.nodes.length === 0 ? (
            <EmptyTreeCta conceptTitle={tree.concept.title} />
          ) : (
            <SpecTree
              nodes={tree.nodes}
              selectedSpecId={selectedSpecId}
              onSelect={onSelect}
              visibleSpecIds={lensResult.visibleSpecIds}
              forceExpandedSpecIds={lensResult.ancestorSpecIds}
              matchingSpecIds={lensResult.matchingSpecIds}
            />
          )}
        </section>
        {selectedSpecId && detail.data && (
          <NodeDrawer
            detail={detail.data}
            onClose={onCloseDrawer}
            onSelect={onSelect}
            onIssueChanged={() => {
              detail.refetch();
              onIssueChanged();
            }}
            onOpenCostsScope={onOpenCostsScope}
          />
        )}
      </div>
      <CommandPalette
        open={paletteOpen}
        nodes={tree.nodes}
        onClose={onClosePalette}
        onPickSpec={(id) => onSelect(id)}
        onPickAgent={(handle) => patchLenses({ agent: handle })}
        onPickIssue={(_issueId, specId) => onSelect(specId)}
      />
    </>
  );
}

function SourceBadge({ source }: { source: SpecTreeSource }): JSX.Element {
  const label = source === "api" ? "live api" : "local fixture";
  const title =
    source === "api"
      ? "Data fetched from /api/games/:id/spec-tree"
      : "API unreachable — rendering the bundled fixture";
  return (
    <span
      className="cost-chip"
      title={title}
      aria-label={`Tree source: ${label}`}
    >
      {label}
    </span>
  );
}
