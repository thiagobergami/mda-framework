/**
 * Fetches the chrome-level Costs detail payload (plan §14 U7).
 *
 * Same status-machine shape as the other hooks — no fixture fallback
 * because the page is opt-in from chrome / a CostChip deep link.
 */

import { useCallback, useEffect, useState } from "react";
import {
  costsDetailResponseSchema,
  type CostsDetailResponse,
} from "@mda-studio/shared";

export interface UseCostsDetailOptions {
  gameId: string;
  /** When set, scopes the read to a subtree under this spec id. */
  scopeSpecId?: string | null;
  enabled?: boolean;
}

export interface CostsDetailState {
  status: "idle" | "loading" | "ready" | "error";
  data: CostsDetailResponse | null;
  error: string | null;
  refetch: () => void;
}

export function useCostsDetail({
  gameId,
  scopeSpecId,
  enabled = true,
}: UseCostsDetailOptions): CostsDetailState {
  const [state, setState] = useState<Omit<CostsDetailState, "refetch">>({
    status: enabled ? "loading" : "idle",
    data: null,
    error: null,
  });
  const [reloadKey, setReloadKey] = useState(0);
  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!enabled) {
      setState({ status: "idle", data: null, error: null });
      return;
    }
    let cancelled = false;
    setState({ status: "loading", data: null, error: null });
    const qs = scopeSpecId
      ? `?subtree=${encodeURIComponent(scopeSpecId)}`
      : "";
    (async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/costs${qs}`, {
          headers: { accept: "application/json" },
        });
        if (cancelled) return;
        if (!res.ok) {
          setState({
            status: "error",
            data: null,
            error: `${res.status} ${res.statusText}`,
          });
          return;
        }
        const json = await res.json();
        const parsed = costsDetailResponseSchema.safeParse(json);
        if (!parsed.success) {
          setState({
            status: "error",
            data: null,
            error: `bad payload: ${parsed.error.message}`,
          });
          return;
        }
        setState({ status: "ready", data: parsed.data, error: null });
      } catch (e) {
        if (cancelled) return;
        setState({
          status: "error",
          data: null,
          error: (e as Error).message,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId, scopeSpecId, enabled, reloadKey]);

  return { ...state, refetch };
}
