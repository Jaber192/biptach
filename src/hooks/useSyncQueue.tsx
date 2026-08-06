import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useOfflineQueue, type OfflineOperation } from "./useOfflineQueue";
import { indexedDBManager } from "../lib/indexeddb";
import { safeGet } from "../utils/supabaseUtils";

export function useSyncQueue() {
  const {
    queue,
    isOnline,
    isLoaded,
    getPendingOperations,
    markAsSyncing,
    markAsSynced,
    markAsFailed,
    clearCompleted,
  } = useOfflineQueue();

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{
    total: number;
    completed: number;
    failed: number;
  }>({ total: 0, completed: 0, failed: 0 });

  const syncingRef = useRef(false);

  const syncOperations = useCallback(async () => {
    if (!isOnline || !isLoaded || syncingRef.current) return;

    const pendingOps = getPendingOperations();
    if (pendingOps.length === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);
    setSyncProgress({ total: pendingOps.length, completed: 0, failed: 0 });

    try {
      for (const operation of pendingOps) {
        await markAsSyncing(operation.id);

        try {
          switch (operation.type) {
            case "create":
              await handleCreate(operation);
              break;
            case "update":
              await handleUpdate(operation);
              break;
            case "delete":
              await handleDelete(operation);
              break;
          }

          await markAsSynced(operation.id);
          setSyncProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
        } catch (error) {
          console.error(`Sync failed for operation ${operation.id}:`, error);
          await markAsFailed(operation.id);
          setSyncProgress((prev) => ({ ...prev, failed: prev.failed + 1 }));
        }
      }

      await clearCompleted();
    } catch (error) {
      console.error("Sync queue error:", error);
    } finally {
      setIsSyncing(false);
      syncingRef.current = false;
    }
  }, [isOnline, isLoaded, getPendingOperations, markAsSyncing, markAsSynced, markAsFailed, clearCompleted]);

  const handleCreate = async (operation: OfflineOperation) => {
    switch (operation.entity) {
      case "work_orders": {
        const { data, error } = await supabase
          .from("work_orders")
          .insert([operation.data])
          .select("*")
          .single();
        if (error) throw error;
        const serverId = safeGet<string | null>(data as Record<string, unknown>, "id", null);
        if (serverId && operation.data.id) {
          await indexedDBManager.update("work_orders", operation.data.id as string, {
            id: serverId,
            is_offline: false,
          });
        }
        break;
      }
      case "customers": {
        const { data, error } = await supabase
          .from("customers")
          .insert([operation.data])
          .select("*")
          .single();
        if (error) throw error;
        const serverId = safeGet<string | null>(data as Record<string, unknown>, "id", null);
        if (serverId && operation.data.id) {
          await indexedDBManager.update("customers", operation.data.id as string, {
            id: serverId,
            is_offline: false,
          });
        }
        break;
      }
      case "technicians": {
        const { data, error } = await supabase
          .from("technicians")
          .insert([operation.data])
          .select("*")
          .single();
        if (error) throw error;
        const serverId = safeGet<string | null>(data as Record<string, unknown>, "id", null);
        if (serverId && operation.data.id) {
          await indexedDBManager.update("technicians", operation.data.id as string, {
            id: serverId,
            is_offline: false,
          });
        }
        break;
      }
      case "notifications": {
        const { error } = await supabase.from("notifications").insert([operation.data]);
        if (error) throw error;
        break;
      }
    }
  };

  const handleUpdate = async (operation: OfflineOperation) => {
    const id = operation.data.id as string;
    switch (operation.entity) {
      case "work_orders": {
        const { error } = await supabase.from("work_orders").update(operation.data).eq("id", id);
        if (error) throw error;
        await indexedDBManager.update("work_orders", id, { is_offline: false });
        break;
      }
      case "customers": {
        const { error } = await supabase.from("customers").update(operation.data).eq("id", id);
        if (error) throw error;
        await indexedDBManager.update("customers", id, { is_offline: false });
        break;
      }
      case "technicians": {
        const { error } = await supabase.from("technicians").update(operation.data).eq("id", id);
        if (error) throw error;
        await indexedDBManager.update("technicians", id, { is_offline: false });
        break;
      }
      case "notifications": {
        const { error } = await supabase.from("notifications").update(operation.data).eq("id", id);
        if (error) throw error;
        break;
      }
    }
  };

  const handleDelete = async (operation: OfflineOperation) => {
    const id = operation.data.id as string;
    switch (operation.entity) {
      case "work_orders": {
        const { error } = await supabase.from("work_orders").delete().eq("id", id);
        if (error) throw error;
        await indexedDBManager.delete("work_orders", id);
        break;
      }
      case "customers": {
        const { error } = await supabase.from("customers").delete().eq("id", id);
        if (error) throw error;
        await indexedDBManager.delete("customers", id);
        break;
      }
      case "technicians": {
        const { error } = await supabase.from("technicians").delete().eq("id", id);
        if (error) throw error;
        await indexedDBManager.delete("technicians", id);
        break;
      }
      case "notifications": {
        const { error } = await supabase.from("notifications").delete().eq("id", id);
        if (error) throw error;
        break;
      }
    }
  };

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && isLoaded) {
      syncOperations();
    }
  }, [isOnline, isLoaded, syncOperations]);

  const triggerSync = () => {
    if (isOnline) {
      syncOperations();
    }
  };

  return {
    isSyncing,
    syncProgress,
    triggerSync,
    queueLength: queue.filter((op) => op.status === "pending").length,
  };
}
