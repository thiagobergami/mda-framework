import { formatCents } from "@mda-studio/shared";

interface CostChipProps {
  /** Cents to display on the chip. */
  cents: number;
  /** Optional own-cost (cents) to show in the tooltip alongside the subtree total. */
  ownCents?: number;
}

export function CostChip({ cents, ownCents }: CostChipProps): JSX.Element {
  const title =
    ownCents !== undefined
      ? `MTD subtree ${formatCents(cents)} — own ${formatCents(ownCents)}`
      : `MTD ${formatCents(cents)}`;
  return (
    <span className="cost-chip" title={title} aria-label={title}>
      {formatCents(cents)}
    </span>
  );
}
