import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { games } from "./games";

/**
 * Cost events (D5.DB1a). Amount is stored in integer cents to avoid
 * floating-point drift; the in-memory shape already uses `*Cents` fields.
 */
export const costEvents = pgTable(
  "cost_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    specId: text("spec_id"),
    kind: text("kind").notNull(),
    amountCents: integer("amount_cents").notNull().default(0),
    source: text("source").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    byGame: index("cost_events_by_game").on(t.gameId),
  }),
);

export type CostEvent = typeof costEvents.$inferSelect;
export type NewCostEvent = typeof costEvents.$inferInsert;
