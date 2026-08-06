import { indexedDBManager } from "./indexeddb";

export type OfflineOperation = {
  id: string;
  type: "create" | "update" | "delete";
  entity: "work_orders" | "customers" | "technicians" | "notifications";
  data: Record<string, unknown>;
  timestamp: number;
  status: "pending" | "syncing" | "synced" | "failed";
};

/**
 * Standalone queue utility for enqueuing offline operations outside of React hooks.
 * This allows data hooks to enqueue operations without needing the useOfflineQueue hook context.
 */
export async function enqueueOperation(
  operation: Omit<OfflineOperation, "id" | "timestamp" | "status">,
): Promise<string> {
  const newOperation: OfflineOperation = {
    id: crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 15),
    ...operation,
    timestamp: Date.now(),
    status: "pending",
  };

  await indexedDBManager.addQueueOperation(newOperation);
  return newOperation.id;
}

export function isOnline(): boolean {
  return navigator.onLine;
}
