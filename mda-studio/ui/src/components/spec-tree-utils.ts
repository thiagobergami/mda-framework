import type { SpecTreeNode } from "@mda-studio/shared";

/**
 * One tree row with its already-resolved children. The UI walks this
 * structure recursively; the original flat node list is preserved on
 * `node`.
 */
export interface ResolvedTreeRow {
  node: SpecTreeNode;
  children: ResolvedTreeRow[];
}

/**
 * Build the canonical-parent tree from a flat node list.
 *
 * Roots are nodes with `canonicalParentSpecId === null`. Children are
 * gathered by parent id; sibling order matches the input order so the
 * fixture controls layout.
 */
export function buildSpecTree(nodes: readonly SpecTreeNode[]): ResolvedTreeRow[] {
  const byParent = new Map<string | null, SpecTreeNode[]>();
  for (const n of nodes) {
    const arr = byParent.get(n.canonicalParentSpecId) ?? [];
    arr.push(n);
    byParent.set(n.canonicalParentSpecId, arr);
  }
  const visit = (parentId: string | null): ResolvedTreeRow[] => {
    const list = byParent.get(parentId) ?? [];
    return list.map((n) => ({ node: n, children: visit(n.specId) }));
  };
  return visit(null);
}

/**
 * Returns the upward trace for the breadcrumb, from the studio mission /
 * concept end down to the node itself (exclusive of the node).
 */
export function upwardTrace(
  nodes: readonly SpecTreeNode[],
  specId: string,
): SpecTreeNode[] {
  const byId = new Map<string, SpecTreeNode>(nodes.map((n) => [n.specId, n]));
  const trail: SpecTreeNode[] = [];
  let current = byId.get(specId);
  while (current && current.canonicalParentSpecId) {
    const parent = byId.get(current.canonicalParentSpecId);
    if (!parent) break;
    trail.unshift(parent);
    current = parent;
  }
  return trail;
}
