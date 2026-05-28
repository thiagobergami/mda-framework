import { posix } from "node:path";

/**
 * Resolved database configuration consumed by `createClient`.
 *
 * - `external` — a real Postgres endpoint pointed at by `DATABASE_URL`.
 * - `embedded` — a process-local store rooted at `dataDir`. The `driver`
 *   field picks between pglite (default, cross-platform) and
 *   `embedded-postgres` (opt-in for users who want native Postgres
 *   performance and have a working native build).
 *
 * D5.DB2 introduced the driver discriminator; see the ADR at
 * `design/decisions/2026-05-27-embedded-db.md` for the trade-offs.
 */
export type EmbeddedDriver = "pglite" | "embedded-postgres";

export type DatabaseConfig =
  | { kind: "external"; url: string }
  | { kind: "embedded"; driver: EmbeddedDriver; dataDir: string };

export interface ResolveOptions {
  env: Partial<Record<string, string>>;
  home: string;
}

const DEFAULT_INSTANCE = "default";
const DEFAULT_EMBEDDED_DRIVER: EmbeddedDriver = "pglite";

export function resolveDatabaseConfig(opts: ResolveOptions): DatabaseConfig {
  if (!opts.home.startsWith("/")) {
    throw new Error(`home must be an absolute path, got: ${opts.home}`);
  }

  const url = opts.env["DATABASE_URL"];
  if (url !== undefined) {
    if (url === "") {
      throw new Error("DATABASE_URL is set but empty");
    }
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
      throw new Error(`DATABASE_URL is missing a URL scheme: ${url}`);
    }
    return { kind: "external", url };
  }

  const instance = opts.env["MDA_STUDIO_INSTANCE"] ?? DEFAULT_INSTANCE;
  const dataDir = posix.join(
    opts.home,
    ".mda-studio",
    "instances",
    instance,
    "db",
  );
  const driver = parseDriver(opts.env["MDA_STUDIO_DB_DRIVER"]);
  return { kind: "embedded", driver, dataDir };
}

function parseDriver(raw: string | undefined): EmbeddedDriver {
  if (raw === undefined || raw === "") return DEFAULT_EMBEDDED_DRIVER;
  if (raw === "pglite" || raw === "embedded-postgres") return raw;
  throw new Error(
    `MDA_STUDIO_DB_DRIVER must be one of "pglite" | "embedded-postgres", got "${raw}"`,
  );
}
