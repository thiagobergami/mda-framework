/**
 * Fetches the agent roster for the Org chart (plan §14 U7).
 */

import { useCallback, useEffect, useState } from "react";
import {
  agentRosterResponseSchema,
  type AgentRosterResponse,
} from "@mda-studio/shared";

export interface UseAgentRosterOptions {
  gameId: string;
  enabled?: boolean;
}

export interface AgentRosterState {
  status: "idle" | "loading" | "ready" | "error";
  data: AgentRosterResponse | null;
  error: string | null;
  refetch: () => void;
}

export function useAgentRoster({
  gameId,
  enabled = true,
}: UseAgentRosterOptions): AgentRosterState {
  const [state, setState] = useState<Omit<AgentRosterState, "refetch">>({
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
        const res = await fetch(`/api/games/${gameId}/agents`, {
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
        const parsed = agentRosterResponseSchema.safeParse(json);
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
