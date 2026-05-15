import { afterEach, beforeEach, describe, expect, it } from "vitest";
import http, { type Server } from "node:http";
import { AddressInfo } from "node:net";
import { createApp } from "../app";
import { clearStudioEventListeners } from "../services/studio-events";
import { recordCostEvent } from "../services/cost-events-store";
import { clearCostEventsStore } from "../services/cost-events-store";

interface OpenStream {
  /** Resolves once the named SSE frame has been observed. */
  waitForEvent: (type: string, timeoutMs?: number) => Promise<string>;
  close: () => void;
  buffer: () => string;
}

let server: Server;
let baseUrl: string;

beforeEach(async () => {
  clearStudioEventListeners();
  clearCostEventsStore();
  // Heartbeat off so the test process doesn't wait on a timer.
  const app = createApp({ studioEvents: { heartbeatMs: 0 } });
  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterEach(async () => {
  clearStudioEventListeners();
  clearCostEventsStore();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function openSseStream(path: string): Promise<OpenStream> {
  return new Promise((resolve, reject) => {
    const req = http.get(`${baseUrl}${path}`, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`sse status ${res.statusCode}`));
        return;
      }
      let buf = "";
      res.setEncoding("utf-8");
      res.on("data", (chunk: string) => {
        buf += chunk;
      });

      function waitForEvent(
        type: string,
        timeoutMs = 1_000,
      ): Promise<string> {
        return new Promise((resolveEvt, rejectEvt) => {
          const start = Date.now();
          const tick = (): void => {
            const marker = `event: ${type}\n`;
            const idx = buf.indexOf(marker);
            if (idx >= 0) {
              const end = buf.indexOf("\n\n", idx);
              resolveEvt(buf.slice(idx, end === -1 ? undefined : end + 2));
              return;
            }
            if (Date.now() - start > timeoutMs) {
              rejectEvt(
                new Error(
                  `timed out waiting for event "${type}"; buffer: ${buf}`,
                ),
              );
              return;
            }
            setTimeout(tick, 10);
          };
          tick();
        });
      }

      resolve({
        waitForEvent,
        close: () => {
          req.destroy();
          res.destroy();
        },
        buffer: () => buf,
      });
    });
    req.on("error", reject);
  });
}

describe("GET /api/studios/:studioId/events", () => {
  it("opens an event-stream and forwards published events", async () => {
    const stream = await openSseStream("/api/studios/default/events");
    // Give the connection a moment to subscribe.
    await new Promise((r) => setTimeout(r, 20));
    const result = recordCostEvent({
      studioId: "default",
      gameId: "virus-hunter",
      agentId: null,
      issueId: null,
      provider: "anthropic",
      model: "claude-opus-4-7",
      inputTokens: 10,
      outputTokens: 10,
      costCents: 5,
      occurredAt: new Date().toISOString(),
      billingCode: "MEC-001",
    });
    expect(result.ok).toBe(true);
    const frame = await stream.waitForEvent("cost-event");
    expect(frame).toContain(
      'data: {"type":"cost-event","gameId":"virus-hunter","specId":"MEC-001"}',
    );
    stream.close();
  });

  it("writes the hello comment immediately", async () => {
    const stream = await openSseStream("/api/studios/default/events");
    await new Promise((r) => setTimeout(r, 20));
    expect(stream.buffer()).toContain(": hello default");
    stream.close();
  });
});
