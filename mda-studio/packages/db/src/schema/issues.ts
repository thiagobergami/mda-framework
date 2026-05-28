import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { games } from "./games";

/**
 * Issues table (D5.DB1a) — subset of `system.md §6.2`. Status / priority
 * use string columns rather than enums so adding new values is a non-event
 * (migrations move slowly when the surface area is still in flux).
 */
export const issues = pgTable(
  "issues",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    specId: text("spec_id"),
    title: text("title").notNull(),
    status: text("status").notNull().default("open"),
    priority: text("priority").notNull().default("normal"),
    assigneeAgentId: text("assignee_agent_id"),
    assigneeAgentHandle: text("assignee_agent_handle"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    byGame: index("issues_by_game").on(t.gameId),
  }),
);

export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;
