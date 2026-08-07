import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { indexedDBManager } from "../lib/indexeddb";
import { enqueueOperation, isOnline } from "../lib/offlineQueue";
import type { AppNotification, NotificationInput, NotificationType, UserRole } from "../types";

type NotificationRow = {
  id: string;
  user_id: string;
  company_id: string;
  type: NotificationType;
  title: string;
  message: string;
  work_order_id: string | null;
  recipient_role: UserRole;
  read: boolean;
  created_at: string;
};

function rowToNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    workOrderId: row.work_order_id,
    recipientRole: row.recipient_role,
    read: row.read,
    created_at: row.created_at,
  };
}


interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  push: (input: NotificationInput) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Load from IndexedDB cache first
      try {
        const cached = await indexedDBManager.getAll<NotificationRow>("notifications");
        if (!cancelled && cached.length > 0) {
          setNotifications(cached.map(rowToNotification));
        }
      } catch (e) {
        console.error("Failed to load notifications from cache:", e);
      }

      // 2. If online, fetch from Supabase and update cache
      if (isOnline()) {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false });

        if (!cancelled) {
          if (error) {
            console.error("Failed to load notifications:", error.message);
          }
          const rows = (data as NotificationRow[] | null) ?? [];
          setNotifications(rows.map(rowToNotification));

          if (rows.length > 0) {
            await indexedDBManager.seedStore("notifications", rows);
          }
        }
      }
    }

    load();

    const channel = supabase
      .channel("notifications-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, (payload) => {
        if (payload.eventType === "INSERT" && payload.new) {
          const row = payload.new as NotificationRow;
          setNotifications((prev) => [rowToNotification(row), ...prev]);
          indexedDBManager.add("notifications", row).catch(() => {});
        } else if (payload.eventType === "UPDATE" && payload.new) {
          const row = payload.new as NotificationRow;
          const updated = rowToNotification(row);
          setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
          indexedDBManager.update("notifications", row.id, row).catch(() => {});
        } else if (payload.eventType === "DELETE" && payload.old) {
          const row = payload.old as NotificationRow;
          setNotifications((prev) => prev.filter((n) => n.id !== row.id));
          indexedDBManager.delete("notifications", row.id).catch(() => {});
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const push = useCallback(async (input: NotificationInput) => {
    if (isOnline()) {
      const { error } = await supabase.from("notifications").insert({
        type: input.type,
        title: input.title,
        message: input.message,
        work_order_id: input.workOrderId,
        recipient_role: input.recipientRole,
      });
      if (error) console.error("Failed to push notification:", error.message);
    } else {
      const tempId = crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 15);
      const now = new Date().toISOString();
      const row: NotificationRow = {
        id: tempId,
        user_id: "",
        company_id: "",
        type: input.type,
        title: input.title,
        message: input.message,
        work_order_id: input.workOrderId,
        recipient_role: input.recipientRole,
        read: false,
        created_at: now,
      };
      await indexedDBManager.add("notifications", row).catch(() => {});
      await enqueueOperation({
        type: "create",
        entity: "notifications",
        data: row as unknown as Record<string, unknown>,
      });
      setNotifications((prev) => [rowToNotification(row), ...prev]);
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    if (isOnline()) {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
      if (error) console.error("Failed to mark notification read:", error.message);
      else {
        await indexedDBManager.update("notifications", id, { read: true }).catch(() => {});
      }
    } else {
      await indexedDBManager.update("notifications", id, { read: true }).catch(() => {});
      await enqueueOperation({
        type: "update",
        entity: "notifications",
        data: { id, read: true } as Record<string, unknown>,
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (isOnline()) {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("read", false);
      if (error) console.error("Failed to mark all read:", error.message);
    } else {
      // Mark all as read locally
      const all = await indexedDBManager.getAll<NotificationRow>("notifications");
      for (const row of all) {
        if (!row.read) {
          await indexedDBManager.update("notifications", row.id, { read: true }).catch(() => {});
          await enqueueOperation({
            type: "update",
            entity: "notifications",
            data: { id: row.id, read: true } as Record<string, unknown>,
          });
        }
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    if (isOnline()) {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) console.error("Failed to delete notification:", error.message);
      else {
        await indexedDBManager.delete("notifications", id).catch(() => {});
      }
    } else {
      await indexedDBManager.delete("notifications", id).catch(() => {});
      await enqueueOperation({
        type: "delete",
        entity: "notifications",
        data: { id } as Record<string, unknown>,
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  }, []);

  const clearAll = useCallback(async () => {
    if (isOnline()) {
      const { error } = await supabase.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) console.error("Failed to clear notifications:", error.message);
      else {
        await indexedDBManager.clear("notifications").catch(() => {});
      }
    } else {
      await indexedDBManager.clear("notifications").catch(() => {});
      setNotifications([]);
    }
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const value = useMemo(
    () => ({ notifications, unreadCount, push, markRead, markAllRead, remove, clearAll }),
    [notifications, unreadCount, push, markRead, markAllRead, remove, clearAll],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
