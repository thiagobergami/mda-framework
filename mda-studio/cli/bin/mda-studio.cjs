#!/usr/bin/env node
// tsx shim — runs the TypeScript CLI directly. See D6.ST4 in plan.html.

const { spawn } = require("node:child_process");
const { resolve } = require("node:path");

const tsxCli = require.resolve("tsx/cli");
const cliPath = resolve(__dirname, "..", "src", "cli.ts");

const child = spawn(
  process.execPath,
  [tsxCli, cliPath, ...process.argv.slice(2)],
  { stdio: "inherit", env: process.env },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
