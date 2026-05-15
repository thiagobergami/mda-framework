/**
 * Fetches the studio activity log.
 *
 * Mirrors `useApprovals`: status machine, manual refetch from outside,
 * no client-side cache. The activity slide-out is short-lived so a
 * fresh fetch on open is fine.
 *
 * `gameId` narrows the response if provided; without it, every studio
 * event (including studio-level ones with no game scope) is returned.
 */

import { useCallback, useEffect, useState } from "react";
import {
  activityListResponseSchema,
  type ActivityListResponse,
} from "@mda-studio/shared";

export interface UseActivityOptions {
  studioId: string;
  gameId?: string;
  limit?: number;
  enabled?: boolean;
}

export interface ActivityState {
  status: "idle" | "loading" | "ready" | "error";
  data: ActivityListResponse | null;
  error: string | null;
  refetch: () => void;
}

export function useActivity({
  studioId,
  gameId,
  limit,
  enabled = true,
}: UseActivityOptions): ActivityState {
  const [state, setState] = useState<Omit<ActivityState, "refetch">>({
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
    const params = new URLSearchParams();
    if (gameId) params.set("gameId", gameId);
    if (limit !== undefined) params.set("limit", String(limit));
    const qs = params.toString();
    const url = `/api/studios/${studioId}/activity${qs ? `?${qs}` : ""}`;
    (async () => {
      try {
        const res = await fetch(url, {
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
        const parsed = activityListResponseSchema.safeParse(json);
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
  }, [studioId, gameId, limit, enabled, reloadKey]);

  return { ...state, refetch };
}
