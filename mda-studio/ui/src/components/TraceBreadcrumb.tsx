import type { SpecTreeNode } from "@mda-studio/shared";

interface TraceBreadcrumbProps {
  trail: readonly SpecTreeNode[];
  current: SpecTreeNode;
  onSelect: (specId: string) => void;
}

export function TraceBreadcrumb({
  trail,
  current,
  onSelect,
}: TraceBreadcrumbProps): JSX.Element {
  return (
    <nav className="breadcrumb" aria-label="Spec trace">
      <span className="breadcrumb__segment">studio</span>
      <span className="breadcrumb__sep">/</span>
      {trail.map((n) => (
        <span key={n.specId} className="breadcrumb__segment">
          <button
            type="button"
            className="breadcrumb__segment"
            onClick={() => onSelect(n.specId)}
          >
            {n.specId}
          </button>
          <span className="breadcrumb__sep"> / </span>
        </span>
      ))}
      <span className="breadcrumb__segment breadcrumb__segment--current">
        {current.specId}
      </span>
    </nav>
  );
}
