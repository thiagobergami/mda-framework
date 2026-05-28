/**
 * Issues-store interface + factory (D5.DB1b).
 *
 * The legacy `services/issues-store.ts` keeps free-function exports that
 * the routes already use; those wrappers delegate to whichever
 * implementation this factory hands back.
 *
 * Comments and work-products travel with issues (the in-memory module
 * exposes them together) so they share an interface here too.
 */

import { currentPersistenceMode } from "./persistence.js";
import type {
  CommentSummary,
  IssueStatus,
  IssueSummary,
  WorkProductSummary,
} from "@mda-studio/shared";
import { createMemoryIssuesStore } from "./issues-store-memory.js";
import { createDbIssuesStore } from "./issues-store-db.js";

export interface CreateIssueRow {
  gameId: string;
  specId: string;
  title: string;
  status?: IssueStatus;
  priority?: IssueSummary["priority"];
  assigneeAgentId?: string | null;
  assigneeAgentHandle?: string | null;
}

export interface IssuesStore {
  createIssue(input: CreateIssueRow): Promise<IssueSummary>;
  getIssue(id: string): Promise<IssueSummary | undefined>;
  updateIssue(
    id: string,
    patch: { status?: IssueStatus },
  ): Promise<IssueSummary | undefined>;
  listForGame(gameId: string): Promise<IssueSummary[]>;
  listForSpec(gameId: string, specId: string): Promise<IssueSummary[]>;

  createComment(input: {
    issueId: string;
    authorHandle: string;
    body: string;
  }): Promise<CommentSummary>;
  listComments(issueIds: readonly string[], limit: number): Promise<CommentSummary[]>;

  createWorkProduct(input: {
    issueId: string;
    kind: WorkProductSummary["kind"];
    label: string;
    href?: string | null;
  }): Promise<WorkProductSummary>;
  listWorkProducts(
    issueIds: readonly string[],
    limit: number,
  ): Promise<WorkProductSummary[]>;

  clear(): Promise<void>;
}

let singleton: IssuesStore | null = null;

export async function getIssuesStore(): Promise<IssuesStore> {
  if (singleton) return singleton;
  singleton =
    currentPersistenceMode() === "db"
      ? await createDbIssuesStore()
      : createMemoryIssuesStore();
  return singleton;
}

export function _resetIssuesStoreForTests(): void {
  singleton = null;
}
