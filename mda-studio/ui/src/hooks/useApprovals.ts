/**
 * Fetches pending + resolved approvals for the active studio.
 *
 * Mirrors `useSpecTree`'s shape: status machine, fetch in `useEffect`,
 * manual `refetch()` for invalidation from outside (e.g. on
 * `approval-changed` SSE events). No client-side cache — the list is
 * small enough that re-fetching is fine.
 *
 * When the API is unreachable we surface `status: "error"` instead of
 * falling back to a fixture: the tree-fixture path exists because the UI
 * has a meaningful offline story; for approvals, an empty list is more
 * honest.
 */

import { useCallback, useEffect, useState } from "react";
import {
  approvalListResponseSchema,
  type ApprovalListResponse,
  type ApprovalStatus,
} from "@mda-studio/shared";

export interface UseApprovalsOptions {
  studioId: string;
  status?: ApprovalStatus;
}

export interface ApprovalsState {
  status: "loading" | "ready" | "error";
  data: ApprovalListResponse | null;
  error: string | null;
  refetch: () => void;
}

export function useApprovals({
  studioId,
  status,
}: UseApprovalsOptions): ApprovalsState {
  const [state, setState] = useState<Omit<ApprovalsState, "refetch">>({
    status: "loading",
    data: null,
    error: null,
  });
  const [reloadKey, setReloadKey] = useState(0);
  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, error: null });
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    (async () => {
      try {
        const res = await fetch(`/api/studios/${studioId}/approvals${qs}`, {
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
        const parsed = approvalListResponseSchema.safeParse(json);
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
  }, [studioId, status, reloadKey]);

  return { ...state, refetch };
}

export interface ResolveApprovalArgs {
  status: "approved" | "rejected";
  approverHandle: string;
  comment?: string | null;
}

/** Imperative helper used by ApprovalsPanel. */
export async function resolveApprovalRequest(
  approvalId: string,
  body: ResolveApprovalArgs,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const res = await fetch(`/api/approvals/${approvalId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) return { ok: true };
  let error = `${res.status} ${res.statusText}`;
  try {
    const json = (await res.json()) as { error?: string };
    if (json.error) error = json.error;
  } catch {
    // body was not JSON; keep the status-text error
  }
  return { ok: false, status: res.status, error };
}
