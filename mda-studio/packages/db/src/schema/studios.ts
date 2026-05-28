import { sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * V1-lite shape (D5.Q4). Pause / budget / spent columns were dropped here
 * because nothing reads or writes them yet; they return when M4 (costs and
 * budgets) lands. The issue-counter columns stay — the spec-tree UI already
 * uses them via the in-memory `studios.issueCounter` field.
 */
export const studios = pgTable("studios", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  issuePrefix: text("issue_prefix").notNull(),
  issueCounter: integer("issue_counter").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Studio = typeof studios.$inferSelect;
export type NewStudio = typeof studios.$inferInsert;
