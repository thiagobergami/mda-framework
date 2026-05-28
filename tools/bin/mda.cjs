#!/usr/bin/env node
// Single-entry shim: run the TypeScript CLI directly through tsx.
// Replaces the prior `tsc` build step (see plan task D2.Q1 and
// design/decisions/2026-05-27-front-door.md for context).

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
