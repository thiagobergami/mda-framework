/**
 * Settings shell (plan §14 U7).
 *
 * V1 is intentionally a stub. Each section explains what will live there
 * once the corresponding backend lands, with a pointer to the relevant
 * spec / plan section so the operator can read the contract.
 */

import { useState } from "react";

type SettingsTab = "secrets" | "plugins" | "routines";

const TABS: ReadonlyArray<{ id: SettingsTab; label: string }> = [
  { id: "secrets", label: "Secrets" },
  { id: "plugins", label: "Plugins" },
  { id: "routines", label: "Routines" },
];

export function SettingsPanel(): JSX.Element {
  const [tab, setTab] = useState<SettingsTab>("secrets");

  return (
    <section className="settings-panel" aria-label="Studio settings">
      <header className="settings-panel__head">
        <h1>Settings</h1>
        <span className="muted">Studio-level configuration</span>
      </header>
      <div
        className="settings-panel__tabs"
        role="tablist"
        aria-label="Settings sections"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="drawer__tab"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="settings-panel__body" role="tabpanel">
        {tab === "secrets" && <SecretsStub />}
        {tab === "plugins" && <PluginsStub />}
        {tab === "routines" && <RoutinesStub />}
      </div>
    </section>
  );
}

function SecretsStub(): JSX.Element {
  return (
    <article className="settings-section">
      <h2>Secrets</h2>
      <p className="drawer__sentence">
        Provider credentials (Anthropic, OpenAI, Google Drive, MCP servers)
        will live here. Today they are configured via environment variables
        on the server process.
      </p>
      <p className="drawer__sentence">
        Set <code>ANTHROPIC_API_KEY</code> /{" "}
        <code>MDA_STUDIO_DRIVE_TOKEN</code> in the server&apos;s env file
        until the secrets manager lands.
      </p>
    </article>
  );
}

function PluginsStub(): JSX.Element {
  return (
    <article className="settings-section">
      <h2>Plugins</h2>
      <p className="drawer__sentence">
        Per-studio plugins (custom validators, asset-pipeline tools,
        webhook integrations) are loaded from{" "}
        <code>mda-studio/packages/plugins/</code>. The registry UI is
        deferred until at least two plugins exist.
      </p>
      <p className="drawer__sentence">
        See <code>mda-studio/pnpm-workspace.yaml</code> for the plugin
        workspace glob.
      </p>
    </article>
  );
}

function RoutinesStub(): JSX.Element {
  return (
    <article className="settings-section">
      <h2>Routines</h2>
      <p className="drawer__sentence">
        Scheduled background work — validator runs on git push, nightly
        cost rollups, asset-plan reaper — is configured via the routines
        registry. V1 has only the validator-run routine; configuration
        lives in <code>mda-studio/server/src/services/</code>.
      </p>
      <p className="drawer__sentence">
        Toggling individual routines from the UI is deferred until the
        routine registry surfaces its state.
      </p>
    </article>
  );
}
