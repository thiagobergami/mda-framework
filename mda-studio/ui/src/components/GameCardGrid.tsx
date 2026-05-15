import { formatCents, type GameCard } from "@mda-studio/shared";

interface GameCardGridProps {
  cards: readonly GameCard[];
  onOpen: (gameId: string) => void;
}

export function GameCardGrid({
  cards,
  onOpen,
}: GameCardGridProps): JSX.Element {
  return (
    <ul className="cards" aria-label="Games">
      {cards.map((c) => (
        <li key={c.gameId} className="card-wrap">
          <button
            type="button"
            className="card"
            onClick={() => onOpen(c.gameId)}
          >
            <span className="card__title">{c.name}</span>
            <span className="card__sub">{c.conceptSummary}</span>
            <span className="card__sub">
              Primary aesthetic: {c.primaryAesthetic}
            </span>
            <div className="card__stats">
              <span>MTD {formatCents(c.mtdSpendCents)}</span>
              <span>
                {c.activeAgentCount} agent
                {c.activeAgentCount === 1 ? "" : "s"}
              </span>
              <span>{c.openRecoveryIssueCount} open recovery</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
