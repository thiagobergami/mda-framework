import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { games } from "./games";

/**
 * Approvals (D5.DB1a). The payload is stored as JSONB because individual
 * approval kinds carry wildly different bodies (budget overrides, agent
 * spawns, spec rewrites, …). The kind column lets the studio pick a
 * renderer.
 */
export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    payloadJson: jsonb("payload_json").notNull(),
    status: text("status").notNull().default("pending"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: text("decided_by"),
  },
  (t) => ({
    byGame: index("approvals_by_game").on(t.gameId),
  }),
);

export type Approval = typeof approvals.$inferSelect;
export type NewApproval = typeof approvals.$inferInsert;
