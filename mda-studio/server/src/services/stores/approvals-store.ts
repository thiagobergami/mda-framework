/**
 * Approvals-store interface + factory (D5.DB1b).
 */

import type {
  ApprovalKind,
  ApprovalStatus,
  ApprovalSummary,
} from "@mda-studio/shared";

import { currentPersistenceMode } from "./persistence.js";
import { createMemoryApprovalsStore } from "./approvals-store-memory.js";
import { createDbApprovalsStore } from "./approvals-store-db.js";

export interface CreateApprovalRow {
  studioId: string;
  gameId: string | null;
  specId: string | null;
  kind: ApprovalKind;
  title: string;
  body?: string;
  requestedByHandle: string;
}

export interface ResolveApprovalPatch {
  status: Exclude<ApprovalStatus, "pending">;
  approverHandle: string;
  comment?: string | null;
}

export interface ApprovalsStore {
  create(input: CreateApprovalRow): Promise<ApprovalSummary>;
  get(id: string): Promise<ApprovalSummary | undefined>;
  /** Returns undefined if the approval is not found or already resolved. */
  resolve(
    id: string,
    patch: ResolveApprovalPatch,
  ): Promise<ApprovalSummary | undefined>;
  listForStudio(
    studioId: string,
    opts?: { status?: ApprovalStatus },
  ): Promise<ApprovalSummary[]>;
  countPendingForStudio(studioId: string): Promise<number>;
  clear(): Promise<void>;
}

let singleton: ApprovalsStore | null = null;

export async function getApprovalsStore(): Promise<ApprovalsStore> {
  if (singleton) return singleton;
  singleton =
    currentPersistenceMode() === "db"
      ? await createDbApprovalsStore()
      : createMemoryApprovalsStore();
  return singleton;
}

export function _resetApprovalsStoreForTests(): void {
  singleton = null;
}
