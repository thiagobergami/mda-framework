interface WarnBadgeProps {
  count: number;
}

export function WarnBadge({ count }: WarnBadgeProps): JSX.Element | null {
  if (count <= 0) return null;
  const label = `${count} validator warning${count === 1 ? "" : "s"}`;
  return (
    <span
      className="warn-badge"
      title={label}
      aria-label={label}
      role="status"
    >
      ⚠ {count}
    </span>
  );
}
