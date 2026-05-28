/**
 * Inline CTA shown when a game has only a concept doc — no AES/DYN/MEC/AST/TUNE/LEVEL
 * spec has been authored yet.
 *
 * D4.ST2: the CLA-style "open a terminal" copy was replaced with an inline
 * form that posts to `POST /api/games/:id/specs` (which drives `mda new`).
 * The fallback shell command is still listed underneath for operators who
 * prefer the CLI.
 */

import { useCallback, useState } from "react";

interface EmptyTreeCtaProps {
  conceptTitle: string;
  gameId: string;
  /** Called after a successful spec creation; lets the caller refetch the tree. */
  onCreated?: (created: { id: string; file: string }) => void;
}

type Layer = "aesthetic" | "dynamic" | "mechanic" | "asset" | "tuning" | "level";
const FIRST_LAYERS: readonly Layer[] = ["aesthetic"];
const ALL_LAYERS: readonly Layer[] = [
  "aesthetic",
  "dynamic",
  "mechanic",
  "asset",
  "tuning",
  "level",
];

export function EmptyTreeCta({
  conceptTitle,
  gameId,
  onCreated,
}: EmptyTreeCtaProps): JSX.Element {
  const [name, setName] = useState("");
  const [layer, setLayer] = useState<Layer>("aesthetic");
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!name.trim()) {
        setError("Name is required.");
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/games/${gameId}/specs`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ layer, name: name.trim() }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? `request failed (${res.status})`);
          setBusy(false);
          return;
        }
        const body = (await res.json()) as { id: string; file: string };
        setName("");
        setBusy(false);
        onCreated?.(body);
      } catch (err) {
        setBusy(false);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [gameId, layer, name, onCreated],
  );

  const choices = showAll ? ALL_LAYERS : FIRST_LAYERS;
  return (
    <div className="empty-tree" role="status" aria-label="No specs yet">
      <h2 className="empty-tree__title">No specs yet for {conceptTitle}.</h2>
      <p className="empty-tree__lede">
        Author your first {layer} to seed the M → D → A causal chain.
      </p>
      <form className="empty-tree__form" onSubmit={submit}>
        <label className="empty-tree__field">
          <span>Layer</span>
          <select
            value={layer}
            onChange={(e) => setLayer(e.target.value as Layer)}
            disabled={busy}
          >
            {choices.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="empty-tree__field">
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cozy Register"
            disabled={busy}
            required
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Creating…" : `Create ${layer}`}
        </button>
      </form>
      {!showAll && (
        <button
          type="button"
          className="empty-tree__more"
          onClick={() => setShowAll(true)}
        >
          Other layers…
        </button>
      )}
      {error && (
        <p className="empty-tree__error" role="alert">
          {error}
        </p>
      )}
      <p className="empty-tree__hint muted">
        Equivalent CLI: <code>npx mda new {layer} &lt;name&gt;</code>. The tree
        updates automatically once the validator picks up the new file.
      </p>
    </div>
  );
}
