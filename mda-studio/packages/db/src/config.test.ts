import { describe, it, expect } from "vitest";
import { resolveDatabaseConfig } from "./config";

describe("resolveDatabaseConfig", () => {
  it("returns kind=external when DATABASE_URL is set", () => {
    const cfg = resolveDatabaseConfig({
      env: { DATABASE_URL: "postgres://localhost:5432/mda" },
      home: "/home/user",
    });
    expect(cfg).toEqual({
      kind: "external",
      url: "postgres://localhost:5432/mda",
    });
  });

  it("returns kind=embedded with default dataDir when DATABASE_URL is unset", () => {
    const cfg = resolveDatabaseConfig({ env: {}, home: "/home/user" });
    expect(cfg).toEqual({
      kind: "embedded",
      dataDir: "/home/user/.mda-studio/instances/default/db",
    });
  });

  it("honors MDA_STUDIO_INSTANCE for embedded dataDir partitioning", () => {
    const cfg = resolveDatabaseConfig({
      env: { MDA_STUDIO_INSTANCE: "test-1" },
      home: "/home/user",
    });
    expect(cfg).toEqual({
      kind: "embedded",
      dataDir: "/home/user/.mda-studio/instances/test-1/db",
    });
  });

  it("rejects an empty DATABASE_URL as malformed", () => {
    expect(() =>
      resolveDatabaseConfig({ env: { DATABASE_URL: "" }, home: "/home/user" }),
    ).toThrow(/DATABASE_URL.*empty/);
  });

  it("rejects DATABASE_URL with no scheme", () => {
    expect(() =>
      resolveDatabaseConfig({
        env: { DATABASE_URL: "localhost:5432/mda" },
        home: "/home/user",
      }),
    ).toThrow(/DATABASE_URL.*scheme/);
  });

  it("requires home to be an absolute path", () => {
    expect(() =>
      resolveDatabaseConfig({ env: {}, home: "relative/path" }),
    ).toThrow(/home.*absolute/);
  });
});
