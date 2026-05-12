import { sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const studios = pgTable("studios", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  pauseReason: text("pause_reason"),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  issuePrefix: text("issue_prefix").notNull(),
  issueCounter: integer("issue_counter").notNull().default(0),
  budgetMonthlyCents: integer("budget_monthly_cents").notNull().default(0),
  spentMonthlyCents: integer("spent_monthly_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Studio = typeof studios.$inferSelect;
export type NewStudio = typeof studios.$inferInsert;
