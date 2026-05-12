import type { DatabaseConfig } from "./config";

export interface DriverFactory {
  external: (cfg: Extract<DatabaseConfig, { kind: "external" }>) => Promise<unknown>;
  embedded: (cfg: Extract<DatabaseConfig, { kind: "embedded" }>) => Promise<unknown>;
}

export async function createClient(
  config: DatabaseConfig,
  factory: DriverFactory,
): Promise<unknown> {
  if (config.kind === "external") {
    return factory.external(config);
  }
  return factory.embedded(config);
}
