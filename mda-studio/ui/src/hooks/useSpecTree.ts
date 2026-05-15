/**
 * Fetches a SpecTreeResponse for the named game.
 *
 * Phase U2 keeps the data layer dependency-free: a plain `fetch` + `useEffect`,
 * with a local fixture fallback so the prototype keeps working when the API
 * is unreachable. TanStack Query / Router come in Phase U5.
 *
 * Status machine:
 *   "loading"  initial → fetching the route
 *   "ready"    response received and validated, `data` set
 *   "error"    fetch threw a non-404 and no fixture matched
 *
 * `source` tells the UI whether the data came from the API or the local
 * fallback so the chrome can surface that fact honestly.
 */

import { useCallback, useEffect, useState } from "react";
import {
  specTreeResponseSchema,
  type SpecTreeResponse,
} from "@mda-studio/shared";
import { virusHunterTree } from "../fixtures/virus-hunter";

export type SpecTreeSource = "api" | "fixture";

export interface SpecTreeState {
  status: "loading" | "ready" | "error";
  data: SpecTreeResponse | null;
  source: SpecTreeSource | null;
  error: string | null;
  /** Manually re-fetch (e.g. after a successful issue PATCH). */
  refetch: () => void;
}

const FALLBACK_BY_GAME: Readonly<Record<string, SpecTreeResponse>> = {
  "virus-hunter": virusHunterTree,
};

export function useSpecTree(gameId: string): SpecTreeState {
  const [state, setState] = useState<Omit<SpecTreeState, "refetch">>({
    status: "loading",
    data: null,
    source: null,
    error: null,
  });
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, source: null, error: null });

    (async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/spec-tree`, {
          headers: { accept: "application/json" },
        });
        if (cancelled) return;
        if (res.ok) {
          const json = await res.json();
          const parsed = specTreeResponseSchema.safeParse(json);
          if (!parsed.success) {
            throw new Error(`bad payload: ${parsed.error.message}`);
          }
          setState({
            status: "ready",
            data: parsed.data,
            source: "api",
            error: null,
          });
          return;
        }
        useFallback(gameId, setState, `${res.status} ${res.statusText}`);
      } catch (e) {
        if (cancelled) return;
        useFallback(gameId, setState, (e as Error).message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId, reloadKey]);

  return { ...state, refetch };
}

function useFallback(
  gameId: string,
  setState: (s: Omit<SpecTreeState, "refetch">) => void,
  reason: string,
): void {
  const fallback = FALLBACK_BY_GAME[gameId];
  if (fallback) {
    setState({
      status: "ready",
      data: fallback,
      source: "fixture",
      error: null,
    });
    return;
  }
  setState({
    status: "error",
    data: null,
    source: null,
    error: reason,
  });
}
