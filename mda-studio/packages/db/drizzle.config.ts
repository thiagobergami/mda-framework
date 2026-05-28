import type { Config } from "drizzle-kit";

/**
 * drizzle-kit config (D5.DB1a). Targets Postgres because the embedded
 * driver (`pglite`) accepts the same dialect's SQL — one set of migrations
 * works for both modes.
 *
 * Drives `pnpm db:generate` and `pnpm db:migrate` against the embedded
 * pglite at `~/.mda-studio/instances/{instance}/db` unless DATABASE_URL is
 * set (in which case migrations point at the real Postgres endpoint).
 */
function embeddedUrl(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? ".";
  const instance = process.env.MDA_STUDIO_INSTANCE ?? "default";
  return `pglite://${home}/.mda-studio/instances/${instance}/db`;
}

export default {
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? embeddedUrl(),
  },
} satisfies Config;
