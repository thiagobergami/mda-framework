/**
 * Shared contract suite for every store implementation (D5.DB1b).
 *
 * Each suite runs against both impls. When the test workspace builds the
 * "db" instance it points at a per-suite pglite directory under /tmp so
 * the suites don't interfere.
 */

import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createMemoryGamesStore } from "./games-store-memory.js";
import { createDbGamesStore } from "./games-store-db.js";
import type { GamesStore } from "./games-store.js";
import { createMemoryIssuesStore } from "./issues-store-memory.js";
import { createDbIssuesStore } from "./issues-store-db.js";
import type { IssuesStore } from "./issues-store.js";
import { createMemoryCostEventsStore } from "./cost-events-store-memory.js";
import { createDbCostEventsStore } from "./cost-events-store-db.js";
import type { CostEventsStore } from "./cost-events-store.js";
import { createMemoryApprovalsStore } from "./approvals-store-memory.js";
import { createDbApprovalsStore } from "./approvals-store-db.js";
import type { ApprovalsStore } from "./approvals-store.js";
import { _resetDbHandleForTests } from "./db-handle.js";

const homeDirsToCleanup: string[] = [];

afterEach(async () => {
  await _resetDbHandleForTests();
  while (homeDirsToCleanup.length > 0) {
    const dir = homeDirsToCleanup.pop()!;
    rmSync(dir, { recursive: true, force: true });
  }
});

function withTmpHome(): void {
  const dir = mkdtempSync(join(tmpdir(), "stores-contract-"));
  process.env["HOME"] = dir;
  process.env["MDA_STUDIO_INSTANCE"] = `it-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  process.env["MDA_STUDIO_DB_DRIVER"] = "pglite";
  delete process.env["DATABASE_URL"];
  homeDirsToCleanup.push(dir);
}

const gamesImpls: Array<{
  name: string;
  factory: () => Promise<GamesStore>;
}> = [
  { name: "memory", factory: async () => createMemoryGamesStore() },
  {
    name: "db",
    factory: async () => {
      withTmpHome();
      return createDbGamesStore();
    },
  },
];

for (const impl of gamesImpls) {
  describe(`GamesStore [${impl.name}]`, () => {
    it("registers, lists, and unregisters", async () => {
      const store = await impl.factory();
      await store.register({
        gameId: "GAME-001",
        name: "Cozy",
        specsRoot: "/tmp/cozy",
        conceptPath: "specs/concept/cozy.concept.md",
        primaryAesthetic: "Fellowship",
        conceptTitle: "Cozy",
      });
      const list = await store.list();
      expect(list).toHaveLength(1);
      expect(list[0]?.gameId).toBe("GAME-001");

      await store.unregister("GAME-001");
      expect(await store.list()).toHaveLength(0);
    });

    it("upserts on duplicate register", async () => {
      const store = await impl.factory();
      const base = {
        gameId: "GAME-001",
        name: "First",
        specsRoot: "/tmp/a",
        conceptPath: "specs/concept/a.concept.md",
        primaryAesthetic: "Fellowship",
        conceptTitle: "First",
      };
      await store.register(base);
      await store.register({ ...base, name: "Second" });
      const got = await store.get("GAME-001");
      expect(got?.name).toBe("Second");
    });
  });
}

const issuesImpls: Array<{
  name: string;
  factory: () => Promise<IssuesStore>;
}> = [
  { name: "memory", factory: async () => createMemoryIssuesStore() },
  {
    name: "db",
    factory: async () => {
      withTmpHome();
      return createDbIssuesStore();
    },
  },
];

for (const impl of issuesImpls) {
  describe(`IssuesStore [${impl.name}]`, () => {
    it("creates issues and looks them up", async () => {
      const store = await impl.factory();
      const issue = await store.createIssue({
        gameId: "GAME-001",
        specId: "AES-001",
        title: "Tighten Fellowship beat",
      });
      expect(issue.id).toMatch(/^ISS-\d{3}$/);
      const fetched = await store.getIssue(issue.id);
      expect(fetched?.title).toBe("Tighten Fellowship beat");
    });

    it("enforces legal status transitions", async () => {
      const store = await impl.factory();
      const issue = await store.createIssue({
        gameId: "GAME-001",
        specId: "AES-001",
        title: "Status transitions",
      });
      const inProgress = await store.updateIssue(issue.id, {
        status: "in_progress",
      });
      expect(inProgress?.status).toBe("in_progress");
    });

    it("returns issues filtered by game and by spec", async () => {
      const store = await impl.factory();
      await store.createIssue({
        gameId: "GAME-A",
        specId: "AES-001",
        title: "A1",
      });
      await store.createIssue({
        gameId: "GAME-A",
        specId: "AES-002",
        title: "A2",
      });
      await store.createIssue({
        gameId: "GAME-B",
        specId: "AES-001",
        title: "B1",
      });
      expect(await store.listForGame("GAME-A")).toHaveLength(2);
      expect(await store.listForSpec("GAME-A", "AES-001")).toHaveLength(1);
    });
  });
}

const costImpls: Array<{
  name: string;
  factory: () => Promise<CostEventsStore>;
}> = [
  { name: "memory", factory: async () => createMemoryCostEventsStore() },
  {
    name: "db",
    factory: async () => {
      withTmpHome();
      return createDbCostEventsStore();
    },
  },
];

for (const impl of costImpls) {
  describe(`CostEventsStore [${impl.name}]`, () => {
    it("records and lists events", async () => {
      const store = await impl.factory();
      const event = await store.record({
        studioId: "studio-1",
        gameId: "GAME-001",
        agentId: null,
        issueId: null,
        provider: "anthropic",
        model: "claude-opus",
        inputTokens: 100,
        outputTokens: 50,
        costCents: 42,
        occurredAt: new Date().toISOString(),
        billingCode: "AES-001",
      });
      expect(event.id).toMatch(/^COST-\d{3}$/);
      const list = await store.listForGame("GAME-001");
      expect(list).toHaveLength(1);
      expect(list[0]?.costCents).toBe(42);
    });
  });
}

const approvalImpls: Array<{
  name: string;
  factory: () => Promise<ApprovalsStore>;
}> = [
  { name: "memory", factory: async () => createMemoryApprovalsStore() },
  {
    name: "db",
    factory: async () => {
      withTmpHome();
      return createDbApprovalsStore();
    },
  },
];

for (const impl of approvalImpls) {
  describe(`ApprovalsStore [${impl.name}]`, () => {
    it("creates and resolves approvals", async () => {
      const store = await impl.factory();
      const approval = await store.create({
        studioId: "studio-1",
        gameId: null,
        specId: null,
        kind: "budget",
        title: "Bump MTD limit",
        requestedByHandle: "@user",
      });
      expect(approval.status).toBe("pending");

      const resolved = await store.resolve(approval.id, {
        status: "approved",
        approverHandle: "@admin",
      });
      expect(resolved?.status).toBe("approved");
      expect(resolved?.resolution?.approverHandle).toBe("@admin");

      const pending = await store.countPendingForStudio("studio-1");
      expect(pending).toBe(0);
    });

    it("refuses to resolve an already-resolved approval", async () => {
      const store = await impl.factory();
      const approval = await store.create({
        studioId: "studio-1",
        gameId: null,
        specId: null,
        kind: "budget",
        title: "Once",
        requestedByHandle: "@user",
      });
      await store.resolve(approval.id, {
        status: "approved",
        approverHandle: "@admin",
      });
      const second = await store.resolve(approval.id, {
        status: "rejected",
        approverHandle: "@admin",
      });
      expect(second).toBeUndefined();
    });
  });
}
