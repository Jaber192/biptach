import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import type { AppNotification, NotificationInput, NotificationType, UserRole } from "../types";

type NotificationRow = {
  id: string;
  user_id: string;
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
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (!cancelled) {
        if (error) {
          console.error("Failed to load notifications:", error.message);
        }
        setNotifications((data as NotificationRow[] | null)?.map(rowToNotification) ?? []);
      }
    }

    load();

    const channel = supabase
      .channel("notifications-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, (payload) => {
        if (payload.eventType === "INSERT" && payload.new) {
          setNotifications((prev) => [rowToNotification(payload.new as NotificationRow), ...prev]);
        } else if (payload.eventType === "UPDATE" && payload.new) {
          const updated = rowToNotification(payload.new as NotificationRow);
          setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        } else if (payload.eventType === "DELETE" && payload.old) {
          setNotifications((prev) => prev.filter((n) => n.id !== (payload.old as NotificationRow).id));
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const push = useCallback(async (input: NotificationInput) => {
    const { error } = await supabase.from("notifications").insert({
      type: input.type,
      title: input.title,
      message: input.message,
      work_order_id: input.workOrderId,
      recipient_role: input.recipientRole,
    });
    if (error) console.error("Failed to push notification:", error.message);
  }, []);

  const markRead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
    if (error) console.error("Failed to mark notification read:", error.message);
  }, []);

  const markAllRead = useCallback(async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("read", false);
    if (error) console.error("Failed to mark all read:", error.message);
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) console.error("Failed to delete notification:", error.message);
  }, []);

  const clearAll = useCallback(async () => {
    const { error } = await supabase.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) console.error("Failed to clear notifications:", error.message);
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
