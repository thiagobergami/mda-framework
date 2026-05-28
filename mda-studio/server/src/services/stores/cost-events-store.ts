/**
 * Cost-events store interface + factory (D5.DB1b).
 */

import type { CostEvent, CostEventInput } from "@mda-studio/shared";
import { currentPersistenceMode } from "./persistence.js";
import { createMemoryCostEventsStore } from "./cost-events-store-memory.js";
import { createDbCostEventsStore } from "./cost-events-store-db.js";

export interface CostEventsStore {
  record(input: CostEventInput): Promise<CostEvent>;
  listForGame(
    gameId: string,
    opts?: { mtdOnly?: boolean },
  ): Promise<CostEvent[]>;
  clear(): Promise<void>;
}

let singleton: CostEventsStore | null = null;

export async function getCostEventsStore(): Promise<CostEventsStore> {
  if (singleton) return singleton;
  singleton =
    currentPersistenceMode() === "db"
      ? await createDbCostEventsStore()
      : createMemoryCostEventsStore();
  return singleton;
}

export function _resetCostEventsStoreForTests(): void {
  singleton = null;
}
