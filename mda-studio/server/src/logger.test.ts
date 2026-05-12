import { describe, it, expect, vi } from "vitest";
import { createLogger } from "./logger";

describe("createLogger", () => {
  it("emits a structured JSON line at info level", () => {
    const sink = vi.fn();
    const log = createLogger({ sink, level: "info" });

    log.info("hello", { foo: 1 });

    expect(sink).toHaveBeenCalledOnce();
    const payload = JSON.parse(sink.mock.calls[0]![0] as string);
    expect(payload).toMatchObject({ level: "info", msg: "hello", foo: 1 });
    expect(typeof payload.time).toBe("string");
  });

  it("suppresses lines below the configured level", () => {
    const sink = vi.fn();
    const log = createLogger({ sink, level: "warn" });

    log.info("hidden", {});
    log.warn("shown", {});

    expect(sink).toHaveBeenCalledOnce();
    expect(JSON.parse(sink.mock.calls[0]![0] as string).msg).toBe("shown");
  });

  it("error level emits at level=error", () => {
    const sink = vi.fn();
    const log = createLogger({ sink, level: "info" });

    log.error("boom", { code: 1 });

    expect(JSON.parse(sink.mock.calls[0]![0] as string)).toMatchObject({
      level: "error",
      msg: "boom",
      code: 1,
    });
  });
});
