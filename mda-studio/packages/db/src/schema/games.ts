import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Registered games (D5.DB1a).
 *
 * One row per workspace the studio is operating against. The natural id is
 * the concept spec id (e.g. `GAME-001`), but we still keep a uuid PK so the
 * concept-id can change without breaking foreign keys.
 */
export const games = pgTable("games", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceRoot: text("workspace_root").notNull(),
  conceptSpecId: text("concept_spec_id").notNull(),
  title: text("title").notNull(),
  primaryAesthetic: text("primary_aesthetic").notNull().default("Fellowship"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
