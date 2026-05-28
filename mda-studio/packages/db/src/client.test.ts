import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createClient, type DbClient } from "./client";

const created: DbClient[] = [];

afterEach(async () => {
  while (created.length > 0) {
    const c = created.pop()!;
    await c.close().catch(() => {});
  }
});

describe("createClient(pglite)", () => {
  it("creates a pglite-backed client and lets a trivial query run", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "pglite-db-"));
    const client = await createClient({
      kind: "embedded",
      driver: "pglite",
      dataDir,
    });
    created.push(client);
    // Drizzle's pglite adapter exposes execute(sql) for raw round-trips.
    const drizzle = client.drizzle as unknown as {
      execute: (sql: { toString: () => string } | string) => Promise<unknown>;
    };
    const r = (await drizzle.execute("select 1 as one")) as {
      rows: { one: number }[];
    };
    expect(r.rows[0]?.one).toBe(1);
    await client.close();
    created.length = 0;
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("rejects the embedded-postgres driver path until it is wired", async () => {
    await expect(
      createClient({
        kind: "embedded",
        driver: "embedded-postgres",
        dataDir: "/tmp/never",
      }),
    ).rejects.toThrow(/embedded driver/);
  });
});
