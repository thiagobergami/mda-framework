import { useCallback, useEffect, useState } from "react";

export interface RegisteredGame {
  gameId: string;
  name: string;
  specsRoot: string;
  conceptPath: string;
  primaryAesthetic: string;
  conceptTitle: string;
}

interface State {
  data: RegisteredGame[] | null;
  error: string | null;
  loading: boolean;
}

/**
 * Hook for the new register-a-game flow (D4.ST1). Fetches /api/games and
 * exposes a refetch callback used after a successful registration.
 *
 * The hook is intentionally bare — no react-query. The studio's other lists
 * are still vanilla too; consistency matters more than caching here.
 */
export function useRegisteredGames(): State & { refetch: () => void } {
  const [state, setState] = useState<State>({
    data: null,
    error: null,
    loading: true,
  });

  const fetchOnce = useCallback(async (signal?: AbortSignal) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/games", { signal });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setState({
          data: null,
          loading: false,
          error: body.error ?? `request failed (${res.status})`,
        });
        return;
      }
      const body = (await res.json()) as { games: RegisteredGame[] };
      setState({ data: body.games, loading: false, error: null });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  useEffect(() => {
    const c = new AbortController();
    void fetchOnce(c.signal);
    return () => c.abort();
  }, [fetchOnce]);

  return { ...state, refetch: () => void fetchOnce() };
}
