import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useNetworkStatus } from "./useNetworkStatus";
import { useSyncQueue } from "./useSyncQueue";
import { indexedDBManager } from "../lib/indexeddb";
import { supabase } from "../lib/supabase";

interface OfflineContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  triggerSync: () => void;
}

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { isOnline } = useNetworkStatus();
  const { isSyncing, triggerSync, queueLength } = useSyncQueue();

  // Seed IndexedDB cache from Supabase when online and cache is empty
  useEffect(() => {
    if (!isOnline) return;

    const seedCache = async () => {
      try {
        // Seed profiles
        if (await indexedDBManager.isStoreEmpty("profiles")) {
          const { data } = await supabase.from("profiles").select("*");
          if (data && data.length > 0) {
            await indexedDBManager.seedStore("profiles", data as Record<string, unknown>[] & { id: string }[]);
          }
        }

        // Seed companies
        if (await indexedDBManager.isStoreEmpty("companies")) {
          const { data } = await supabase.from("companies").select("*");
          if (data && data.length > 0) {
            await indexedDBManager.seedStore("companies", data as Record<string, unknown>[] & { id: string }[]);
          }
        }

        // Seed work_orders
        if (await indexedDBManager.isStoreEmpty("work_orders")) {
          const { data } = await supabase.from("work_orders").select("*");
          if (data && data.length > 0) {
            await indexedDBManager.seedStore("work_orders", data as Record<string, unknown>[] & { id: string }[]);
          }
        }

        // Seed customers
        if (await indexedDBManager.isStoreEmpty("customers")) {
          const { data } = await supabase.from("customers").select("*");
          if (data && data.length > 0) {
            await indexedDBManager.seedStore("customers", data as Record<string, unknown>[] & { id: string }[]);
          }
        }

        // Seed technicians
        if (await indexedDBManager.isStoreEmpty("technicians")) {
          const { data } = await supabase.from("technicians").select("*");
          if (data && data.length > 0) {
            await indexedDBManager.seedStore("technicians", data as Record<string, unknown>[] & { id: string }[]);
          }
        }

        // Seed notifications
        if (await indexedDBManager.isStoreEmpty("notifications")) {
          const { data } = await supabase.from("notifications").select("*");
          if (data && data.length > 0) {
            await indexedDBManager.seedStore("notifications", data as Record<string, unknown>[] & { id: string }[]);
          }
        }
      } catch (error) {
        console.error("Failed to seed offline cache:", error);
      }
    };

    seedCache();
  }, [isOnline]);

  const value = useMemo<OfflineContextValue>(
    () => ({
      isOnline,
      isSyncing,
      pendingCount: queueLength,
      triggerSync,
    }),
    [isOnline, isSyncing, queueLength, triggerSync],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be used within OfflineProvider");
  return ctx;
}
