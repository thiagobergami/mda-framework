import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { ASSET_PLAN_ROOT } from "./profile.js";

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpServersConfig {
  /** Mirrors Claude Code's `.mcp.json` shape: { servers: { name: { ... } } } */
  servers?: Record<string, McpServerConfig>;
  /** Legacy form some users may carry over: top-level map */
  [serverName: string]: unknown;
}

/** Result of dispatching a single MCP tool call. */
export interface McpCallResult {
  ok: true;
  output: unknown;
}

export interface McpCallFailure {
  ok: false;
  error: string;
}

/** A live connection to one MCP server. */
export interface McpServerHandle {
  callTool(name: string, args: Record<string, unknown>): Promise<McpCallResult | McpCallFailure>;
  close(): Promise<void>;
}

/**
 * Manages MCP server connections lazily. Loads `.mcp-servers.json` from the
 * asset-plan root once; each `connect` call spins up the server process via
 * the stdio transport on first use, caches the connection, and reuses it.
 */
export class McpClient {
  private readonly root: string;
  private config: Record<string, McpServerConfig> | null = null;
  private readonly handles = new Map<string, McpServerHandle>();

  constructor(root: string) {
    this.root = root;
  }

  /** Load `.mcp-servers.json` if present. Returns false if missing. */
  async load(): Promise<boolean> {
    const path = resolve(this.root, ASSET_PLAN_ROOT, ".mcp-servers.json");
    try {
      const raw = await readFile(path, "utf-8");
      const parsed = JSON.parse(raw) as McpServersConfig;
      const servers = (parsed.servers ?? parsed) as Record<string, unknown>;
      this.config = {};
      for (const [name, value] of Object.entries(servers)) {
        if (
          typeof value === "object" &&
          value !== null &&
          "command" in value &&
          typeof (value as McpServerConfig).command === "string"
        ) {
          this.config[name] = value as McpServerConfig;
        }
      }
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        this.config = {};
        return false;
      }
      throw err;
    }
  }

  /** True if a server with the given name is configured. */
  isConfigured(serverName: string): boolean {
    return this.config !== null && serverName in this.config && serverName !== "none";
  }

  /**
   * Connect to a configured MCP server. Throws if not configured. Caches
   * the handle so repeated calls return the same connection.
   */
  async connect(serverName: string): Promise<McpServerHandle> {
    if (this.config === null) await this.load();
    if (!this.isConfigured(serverName)) {
      throw new Error(`MCP server "${serverName}" not configured in .mcp-servers.json.`);
    }
    const cached = this.handles.get(serverName);
    if (cached) return cached;

    const cfg = this.config![serverName];
    const transport = new StdioClientTransport({
      command: cfg.command,
      args: cfg.args ?? [],
      env: cfg.env ? { ...process.env as Record<string, string>, ...cfg.env } : undefined,
    });
    const client = new Client(
      { name: "mda-asset-plan", version: "0.1.0" },
      { capabilities: {} },
    );

    await client.connect(transport);

    const handle: McpServerHandle = {
      async callTool(name, args) {
        try {
          const result = await client.callTool({ name, arguments: args });
          return { ok: true, output: result };
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
      async close() {
        await client.close();
      },
    };

    this.handles.set(serverName, handle);
    return handle;
  }

  /** Close every cached connection. Safe to call multiple times. */
  async closeAll(): Promise<void> {
    for (const handle of this.handles.values()) {
      try {
        await handle.close();
      } catch {
        /* swallow — best-effort cleanup */
      }
    }
    this.handles.clear();
  }
}
