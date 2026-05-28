---
id: ADR-2026-05-27-embedded-db
date: 2026-05-27
status: accepted
review_item: DB2 (REVIEW.html)
plan_task: D0.3 (plan.html)
---

# Embedded Database — pglite as default, embedded-postgres opt-in

## Decision

For the studio's embedded mode (no `DATABASE_URL` set), the framework
adopts **[pglite](https://github.com/electric-sql/pglite)** as the
default driver.

A native-Postgres path remains available **opt-in** via
`MDA_STUDIO_DB_DRIVER=embedded-postgres` for power users who want full
Postgres performance, with a startup warning that it is unsupported.

## Why pglite

1. **Smaller blast radius.** Pure-JS WASM build; no native compilation
   on WSL or Windows, which is where most reported failures live.
2. **Already in test infrastructure.** Adopting it for runtime
   collapses two driver paths into one.
3. **Drizzle support.** First-class adapter; no custom translation
   layer needed.
4. **Fast clean-installs.** A fresh `pnpm install` does not download a
   ~50 MB Postgres binary just to register one game.

## Why keep embedded-postgres as opt-in

- Users with large issue/cost-event volumes will want real Postgres
  concurrency and indexing eventually.
- Patches to `embedded-postgres` already exist in tree; throwing them
  away forecloses on a path some users may want.
- An env-flag escape hatch costs ~10 lines in `resolveDatabaseConfig`.

## What changes (in week 5)

1. `@mda-studio/db` adds `@electric-sql/pglite` as a dependency.
2. `resolveDatabaseConfig` (`mda-studio/packages/db/src/config.ts`)
   learns to distinguish `embedded-pglite` (default) from
   `embedded-postgres` (when `MDA_STUDIO_DB_DRIVER=embedded-postgres`).
3. `DatabaseConfig` discriminated union grows a `driver` field for the
   embedded variant.
4. A thin `db-client.ts` factory returns the correct drizzle instance
   for the resolved config.
5. `mda-studio/docs/architecture.md` documents the driver matrix.

The actual implementation is plan task D5.DB2; this ADR records the
decision so the week-5 work is unblocked.

## External-Postgres path is unchanged

`DATABASE_URL` continues to take precedence. Hosted deployments
(production, shared dev clusters) hit a real Postgres exactly as
before.

## Re-evaluation triggers

- pglite hits a load wall that the studio actually exercises →
  promote embedded-postgres back to default (or build a server-mode
  default).
- Drizzle drops first-class pglite support → re-evaluate driver.

## Consequences

- New contributors can clone, `pnpm install`, and run the studio
  without installing or compiling anything Postgres-related.
- The Q4 "studios columns" cleanup (plan task D5.Q4) can land safely
  because there is exactly one default schema target.
- The week-5 persistence work has a concrete driver to write against.

## References

- REVIEW.html §DB2 — "Embedded-Postgres decision"
- plan.html §2 D0.3 and §7 D5.DB2
- `mda-studio/packages/db/src/config.ts`
- Related: [[2026-05-27-v1-lite]]
