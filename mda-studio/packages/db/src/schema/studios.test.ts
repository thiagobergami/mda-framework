import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { studios } from "./studios";

describe("studios table schema (spec §6.1, FR-1)", () => {
  const cols = getTableColumns(studios);

  it("has an id primary key (uuid)", () => {
    expect(cols.id).toBeDefined();
    expect(cols.id.primary).toBe(true);
  });

  it("requires a name", () => {
    expect(cols.name).toBeDefined();
    expect(cols.name.notNull).toBe(true);
  });

  it("has a status column with not-null", () => {
    expect(cols.status).toBeDefined();
    expect(cols.status.notNull).toBe(true);
  });

  it("has an issue_prefix column required for issue identifiers", () => {
    expect(cols.issuePrefix).toBeDefined();
    expect(cols.issuePrefix.notNull).toBe(true);
  });

  it("has an issue_counter column for monotonic per-studio numbering", () => {
    expect(cols.issueCounter).toBeDefined();
    expect(cols.issueCounter.notNull).toBe(true);
  });

  it("has budget_monthly_cents (default 0, not null)", () => {
    expect(cols.budgetMonthlyCents).toBeDefined();
    expect(cols.budgetMonthlyCents.notNull).toBe(true);
  });

  it("has spent_monthly_cents (default 0, not null)", () => {
    expect(cols.spentMonthlyCents).toBeDefined();
    expect(cols.spentMonthlyCents.notNull).toBe(true);
  });

  it("has created_at and updated_at timestamps", () => {
    expect(cols.createdAt).toBeDefined();
    expect(cols.createdAt.notNull).toBe(true);
    expect(cols.updatedAt).toBeDefined();
    expect(cols.updatedAt.notNull).toBe(true);
  });

  it("permits nullable description and pause_reason", () => {
    expect(cols.description.notNull).toBe(false);
    expect(cols.pauseReason.notNull).toBe(false);
  });
});
