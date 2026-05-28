import { useCallback, useState } from "react";

interface ConceptCandidate {
  conceptId: string;
  title: string;
  primaryAesthetic: string;
  conceptPath: string;
}

interface RegisteredGame {
  gameId: string;
  name: string;
}

interface NewGameFormProps {
  /** Called after a successful POST /api/games registration. */
  onRegistered: (game: RegisteredGame) => void;
}

interface FormState {
  workspaceRoot: string;
  conceptId: string;
  error: string | null;
  candidates: ConceptCandidate[] | null;
  loading: boolean;
}

const INITIAL: FormState = {
  workspaceRoot: "",
  conceptId: "",
  error: null,
  candidates: null,
  loading: false,
};

/**
 * Form used in the empty-state card grid (D4.ST1). Replaces the
 * "open a terminal and set MDA_STUDIO_GAME_*" copy with a real flow:
 *   workspace path → (optional) concept picker → POST /api/games.
 */
export function NewGameForm({ onRegistered }: NewGameFormProps): JSX.Element {
  const [state, setState] = useState<FormState>(INITIAL);

  const submit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!state.workspaceRoot.trim()) {
        setState((s) => ({ ...s, error: "workspaceRoot is required" }));
        return;
      }
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch("/api/games", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            workspaceRoot: state.workspaceRoot.trim(),
            conceptId: state.conceptId || undefined,
          }),
        });
        if (res.status === 201) {
          const game = (await res.json()) as RegisteredGame;
          setState(INITIAL);
          onRegistered(game);
          return;
        }
        if (res.status === 300) {
          const body = (await res.json()) as { candidates: ConceptCandidate[] };
          setState((s) => ({
            ...s,
            loading: false,
            candidates: body.candidates,
            error:
              "Multiple concept specs found. Pick one and try again.",
          }));
          return;
        }
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setState((s) => ({
          ...s,
          loading: false,
          error: body.error ?? `request failed (${res.status})`,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    },
    [state.workspaceRoot, state.conceptId, onRegistered],
  );

  return (
    <form className="new-game-form" onSubmit={submit} aria-label="Register a game">
      <h2 className="new-game-form__title">Register a game</h2>
      <p className="new-game-form__hint">
        Point the studio at a folder containing <code>specs/concept/*.concept.md</code>.
      </p>
      <label className="new-game-form__field">
        <span>Workspace path</span>
        <input
          type="text"
          value={state.workspaceRoot}
          onChange={(e) =>
            setState((s) => ({ ...s, workspaceRoot: e.target.value }))
          }
          placeholder="/abs/path/to/your/game-repo"
          autoComplete="off"
          spellCheck={false}
          required
        />
      </label>
      {state.candidates && state.candidates.length > 1 ? (
        <label className="new-game-form__field">
          <span>Concept</span>
          <select
            value={state.conceptId}
            onChange={(e) =>
              setState((s) => ({ ...s, conceptId: e.target.value }))
            }
            required
          >
            <option value="" disabled>
              — pick one —
            </option>
            {state.candidates.map((c) => (
              <option key={c.conceptId} value={c.conceptId}>
                {c.conceptId} — {c.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {state.error ? (
        <p className="new-game-form__error" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={state.loading}>
        {state.loading ? "Registering…" : "Register game"}
      </button>
    </form>
  );
}
