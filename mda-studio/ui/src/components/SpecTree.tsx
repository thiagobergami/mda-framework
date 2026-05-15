import { memo, useCallback, useState } from "react";
import type { KeyboardEvent } from "react";
import type { SpecTreeNode } from "@mda-studio/shared";
import { AssigneeChip } from "./AssigneeChip";
import { CostChip } from "./CostChip";
import { LayerGlyph } from "./LayerGlyph";
import { StatusGlyph } from "./StatusGlyph";
import { WarnBadge } from "./WarnBadge";
import { buildSpecTree, type ResolvedTreeRow } from "./spec-tree-utils";

interface SpecTreeProps {
  nodes: readonly SpecTreeNode[];
  selectedSpecId: string | null;
  onSelect: (specId: string) => void;
  /**
   * When provided, only nodes with these spec ids render. Tree filtering
   * (lenses) is applied at this boundary so the SpecTree itself stays
   * presentation-only.
   */
  visibleSpecIds?: ReadonlySet<string>;
  /**
   * Spec ids to render as expanded regardless of the user's toggle state.
   * Used by lens filtering so matches inside collapsed branches still appear.
   */
  forceExpandedSpecIds?: ReadonlySet<string>;
  /** Spec ids to highlight as lens matches (a thin outline). */
  matchingSpecIds?: ReadonlySet<string>;
}

/** Default-expanded layers per plan D3 (Concept + all A nodes). */
const DEFAULT_EXPANDED_LAYERS = new Set<string>(["A", "LEVEL"]);

export function SpecTree({
  nodes,
  selectedSpecId,
  onSelect,
  visibleSpecIds,
  forceExpandedSpecIds,
  matchingSpecIds,
}: SpecTreeProps): JSX.Element {
  const tree = buildSpecTree(nodes);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const n of nodes) {
      if (DEFAULT_EXPANDED_LAYERS.has(n.layer)) initial.add(n.specId);
    }
    return initial;
  });
  const toggle = useCallback((specId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(specId)) next.delete(specId);
      else next.add(specId);
      return next;
    });
  }, []);

  return (
    <ul className="tree" role="tree" aria-label="MDA spec tree">
      {tree.map((row) => (
        <SpecTreeRow
          key={row.node.specId}
          row={row}
          depth={0}
          expanded={expanded}
          onToggle={toggle}
          selectedSpecId={selectedSpecId}
          onSelect={onSelect}
          visibleSpecIds={visibleSpecIds}
          forceExpandedSpecIds={forceExpandedSpecIds}
          matchingSpecIds={matchingSpecIds}
        />
      ))}
    </ul>
  );
}

interface SpecTreeRowProps {
  row: ResolvedTreeRow;
  depth: number;
  expanded: Set<string>;
  onToggle: (specId: string) => void;
  selectedSpecId: string | null;
  onSelect: (specId: string) => void;
  visibleSpecIds?: ReadonlySet<string>;
  forceExpandedSpecIds?: ReadonlySet<string>;
  matchingSpecIds?: ReadonlySet<string>;
}

const SpecTreeRow = memo(function SpecTreeRow({
  row,
  depth,
  expanded,
  onToggle,
  selectedSpecId,
  onSelect,
  visibleSpecIds,
  forceExpandedSpecIds,
  matchingSpecIds,
}: SpecTreeRowProps): JSX.Element | null {
  const { node, children } = row;
  if (visibleSpecIds && !visibleSpecIds.has(node.specId)) return null;
  const visibleChildren =
    visibleSpecIds === undefined
      ? children
      : children.filter((c) => visibleSpecIds.has(c.node.specId));
  const hasChildren = visibleChildren.length > 0;
  const userExpanded = expanded.has(node.specId);
  const forced = forceExpandedSpecIds?.has(node.specId) ?? false;
  const isExpanded = userExpanded || forced;
  const isSelected = selectedSpecId === node.specId;
  const isMatch = matchingSpecIds?.has(node.specId) ?? false;

  const onKeyDown = (e: KeyboardEvent<HTMLLIElement>): void => {
    if (e.key === "ArrowRight" && hasChildren && !isExpanded) {
      e.preventDefault();
      onToggle(node.specId);
    } else if (e.key === "ArrowLeft" && hasChildren && isExpanded) {
      e.preventDefault();
      onToggle(node.specId);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(node.specId);
    }
  };

  return (
    <li
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isSelected}
      aria-level={depth + 1}
      onKeyDown={onKeyDown}
      tabIndex={isSelected ? 0 : -1}
    >
      <div
        className={isMatch ? "tree-row tree-row--match" : "tree-row"}
        onClick={() => onSelect(node.specId)}
      >
        <span
          className="tree-row__disclosure"
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation();
              onToggle(node.specId);
            }
          }}
          aria-hidden="true"
        >
          {hasChildren ? (isExpanded ? "▾" : "▸") : "·"}
        </span>
        <LayerGlyph layer={node.layer} />
        <StatusGlyph status={node.status} />
        <span className="tree-row__title">
          <span className="tree-row__id">{node.specId}</span>{" "}
          <strong>{node.title}</strong>
          {node.secondaryParentSpecIds.length > 0 && (
            <>
              {" "}
              <span
                className="also-serves"
                title={`Also serves: ${node.secondaryParentSpecIds.join(", ")}`}
              >
                {`also serves ${node.secondaryParentSpecIds.length}`}
              </span>
            </>
          )}
          {node.outgoingRefSpecIds.length > 0 && (
            <>
              {" "}
              <span
                className="also-serves"
                title={`Refs: ${node.outgoingRefSpecIds.join(", ")}`}
              >
                {`refs ${node.outgoingRefSpecIds.length}`}
              </span>
            </>
          )}
        </span>
        <span className="tree-row__meta">
          {node.assigneeAgentHandle && (
            <AssigneeChip
              handle={node.assigneeAgentHandle}
              runStatus={node.runStatus}
            />
          )}
          <CostChip
            cents={node.costMtdSubtreeCents}
            ownCents={node.costMtdCents}
          />
          <WarnBadge count={node.warningCount} />
        </span>
      </div>
      {hasChildren && isExpanded && (
        <ul className="tree-children" role="group">
          {visibleChildren.map((child) => (
            <SpecTreeRow
              key={child.node.specId}
              row={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedSpecId={selectedSpecId}
              onSelect={onSelect}
              visibleSpecIds={visibleSpecIds}
              forceExpandedSpecIds={forceExpandedSpecIds}
              matchingSpecIds={matchingSpecIds}
            />
          ))}
        </ul>
      )}
    </li>
  );
});
