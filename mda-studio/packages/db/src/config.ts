import { posix } from "node:path";

export type DatabaseConfig =
  | { kind: "external"; url: string }
  | { kind: "embedded"; dataDir: string };

export interface ResolveOptions {
  env: Partial<Record<string, string>>;
  home: string;
}

const DEFAULT_INSTANCE = "default";

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
  return { kind: "embedded", dataDir };
}
