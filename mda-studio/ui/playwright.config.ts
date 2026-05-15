/**
 * Playwright e2e config (plan §14 U8, §15).
 *
 * Boots two web servers in parallel:
 *   - the @mda-studio/server with the bundled virus-hunter fixture
 *     registered and the demo issues / cost events / validator warnings
 *     seeded
 *   - the Vite dev server (UI) proxying /api → the server
 *
 * The fixture's `MDA_STUDIO_GAME_SPECS_ROOT` is resolved off the repo
 * tree at config-load time so the path is portable across machines.
 */

import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = resolve(__dirname, "..", "server");
const FIXTURE_ROOT = resolve(
  __dirname,
  "..",
  "server",
  "src",
  "services",
  "__fixtures__",
  "specs-virus-hunter",
);

const SERVER_PORT = "3100";
const UI_PORT = "3101";
const BASE_URL = `http://127.0.0.1:${UI_PORT}`;

const fixtureEnv = {
  PORT: SERVER_PORT,
  HOST: "127.0.0.1",
  MDA_STUDIO_GAME_ID: "virus-hunter",
  MDA_STUDIO_GAME_NAME: "Virus Hunter",
  MDA_STUDIO_GAME_SPECS_ROOT: FIXTURE_ROOT,
  MDA_STUDIO_GAME_CONCEPT_PATH:
    "specs/concept/virus-hunter.concept.md",
  MDA_STUDIO_GAME_PRIMARY_AESTHETIC: "Fellowship",
  MDA_STUDIO_GAME_CONCEPT_TITLE: "Virus Hunter",
  MDA_STUDIO_SEED_FIXTURE_ISSUES: "true",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  workers: 1,
  reporter: process.env["CI"] ? "github" : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm start:e2e",
      cwd: SERVER_DIR,
      url: `http://127.0.0.1:${SERVER_PORT}/api/health`,
      reuseExistingServer: !process.env["CI"],
      timeout: 60_000,
      env: fixtureEnv,
    },
    {
      command: "pnpm dev",
      cwd: __dirname,
      url: BASE_URL,
      reuseExistingServer: !process.env["CI"],
      timeout: 60_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
