import { useState, useEffect, useCallback } from "react";
import { indexedDBManager } from "../lib/indexeddb";

export type OfflineOperation = {
  id: string;
  type: "create" | "update" | "delete";
  entity: "work_orders" | "customers" | "technicians" | "notifications";
  data: Record<string, unknown>;
  timestamp: number;
  status: "pending" | "syncing" | "synced" | "failed";
};

export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflineOperation[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load queue from IndexedDB on mount
  const loadQueue = useCallback(async () => {
    try {
      const ops = await indexedDBManager.getQueueOperations<OfflineOperation>();
      setQueue(ops);
    } catch (error) {
      console.error("Failed to load offline queue:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const addToQueue = useCallback(
    async (operation: Omit<OfflineOperation, "id" | "timestamp" | "status">): Promise<string> => {
      const newOperation: OfflineOperation = {
        id: crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 15),
        ...operation,
        timestamp: Date.now(),
        status: "pending",
      };

      try {
        await indexedDBManager.addQueueOperation(newOperation);
        setQueue((prev) => [...prev, newOperation]);
      } catch (error) {
        console.error("Failed to add to offline queue:", error);
      }

      return newOperation.id;
    },
    [],
  );

  const getPendingOperations = useCallback((): OfflineOperation[] => {
    return queue.filter((op) => op.status === "pending");
  }, [queue]);

  const markAsSyncing = useCallback(async (id: string): Promise<void> => {
    setQueue((prev) =>
      prev.map((op) => (op.id === id ? { ...op, status: "syncing" as const } : op)),
    );
    try {
      await indexedDBManager.updateQueueOperation(id, { status: "syncing" });
    } catch (error) {
      console.error("Failed to mark operation as syncing in IndexedDB:", error);
    }
  }, []);

  const markAsSynced = useCallback(async (id: string): Promise<void> => {
    setQueue((prev) =>
      prev.map((op) => (op.id === id ? { ...op, status: "synced" as const } : op)),
    );
    try {
      await indexedDBManager.removeQueueOperation(id);
    } catch (error) {
      console.error("Failed to remove synced operation from queue:", error);
    }
  }, []);

  const markAsFailed = useCallback(async (id: string): Promise<void> => {
    setQueue((prev) =>
      prev.map((op) => (op.id === id ? { ...op, status: "failed" as const } : op)),
    );
    try {
      await indexedDBManager.updateQueueOperation(id, { status: "failed" });
    } catch (error) {
      console.error("Failed to mark operation as failed in IndexedDB:", error);
    }
  }, []);

  const clearCompleted = useCallback(async (): Promise<void> => {
    setQueue((prev) => prev.filter((op) => op.status !== "synced"));
  }, []);

  return {
    queue,
    isOnline,
    isLoaded,
    addToQueue,
    getPendingOperations,
    markAsSyncing,
    markAsSynced,
    markAsFailed,
    clearCompleted,
    reloadQueue: loadQueue,
  };
}
