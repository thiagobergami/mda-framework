/**
 * Fetches the read-only asset-plans list (plan §14 U7).
 */

import { useCallback, useEffect, useState } from "react";
import {
  assetPlanListResponseSchema,
  type AssetPlanListResponse,
} from "@mda-studio/shared";

export interface UseAssetPlansOptions {
  gameId: string;
  enabled?: boolean;
}

export interface AssetPlansState {
  status: "idle" | "loading" | "ready" | "error";
  data: AssetPlanListResponse | null;
  error: string | null;
  refetch: () => void;
}

export function useAssetPlans({
  gameId,
  enabled = true,
}: UseAssetPlansOptions): AssetPlansState {
  const [state, setState] = useState<Omit<AssetPlansState, "refetch">>({
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
    (async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/asset-plans`, {
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
        const parsed = assetPlanListResponseSchema.safeParse(json);
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
  }, [gameId, enabled, reloadKey]);

  return { ...state, refetch };
}
