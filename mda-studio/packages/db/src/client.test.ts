import { describe, it, expect, vi } from "vitest";
import { createClient, type DriverFactory } from "./client";

describe("createClient", () => {
  it("dispatches to the external driver factory when config.kind=external", async () => {
    const externalDriver = vi.fn().mockResolvedValue({ kind: "external" });
    const embeddedDriver = vi.fn().mockResolvedValue({ kind: "embedded" });

    const factory: DriverFactory = { external: externalDriver, embedded: embeddedDriver };
    await createClient(
      { kind: "external", url: "postgres://localhost/db" },
      factory,
    );

    expect(externalDriver).toHaveBeenCalledWith({
      kind: "external",
      url: "postgres://localhost/db",
    });
    expect(embeddedDriver).not.toHaveBeenCalled();
  });

  it("dispatches to the embedded driver factory when config.kind=embedded", async () => {
    const externalDriver = vi.fn().mockResolvedValue({ kind: "external" });
    const embeddedDriver = vi.fn().mockResolvedValue({ kind: "embedded" });

    const factory: DriverFactory = { external: externalDriver, embedded: embeddedDriver };
    await createClient(
      { kind: "embedded", dataDir: "/tmp/x" },
      factory,
    );

    expect(embeddedDriver).toHaveBeenCalledWith({
      kind: "embedded",
      dataDir: "/tmp/x",
    });
    expect(externalDriver).not.toHaveBeenCalled();
  });

  it("returns whatever the driver factory returns (passthrough)", async () => {
    const driverHandle = { meta: "test-handle" };
    const factory: DriverFactory = {
      external: vi.fn().mockResolvedValue(driverHandle),
      embedded: vi.fn(),
    };

    const result = await createClient(
      { kind: "external", url: "postgres://x" },
      factory,
    );

    expect(result).toBe(driverHandle);
  });

  it.skip("TODO(phase-1.1-int): connects to a real embedded postgres and runs a SELECT 1", async () => {
    // Integration test — runs once embedded-postgres dep + Paperclip patch are wired.
    // Behavior: createClient with the real factory establishes a connection,
    // runs a trivial SELECT 1, and tears down without leaving lock files.
  });
});
