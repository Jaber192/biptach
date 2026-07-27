import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppNotification, NotificationInput } from "../types";

const STORAGE_KEY = "biptach.notifications";

const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: "seed-notif-1",
    type: "job_assigned",
    title: "New job assigned",
    message: "AC Repair — Miller Residence has been assigned to you.",
    workOrderId: "seed-wo-1",
    recipientRole: "technician",
    read: false,
    created_at: "2026-07-22T14:05:00.000Z",
  },
  {
    id: "seed-notif-2",
    type: "job_completed",
    title: "Job completed",
    message: "Diego Santos completed Emergency No-Heat — Sunrise Dental.",
    workOrderId: "seed-wo-4",
    recipientRole: "manager",
    read: false,
    created_at: "2026-07-23T19:12:00.000Z",
  },
  {
    id: "seed-notif-3",
    type: "job_scheduled",
    title: "Job scheduled",
    message: "Furnace Install — Oakwood Mall is scheduled for Jul 26.",
    workOrderId: "seed-wo-2",
    recipientRole: "manager",
    read: true,
    created_at: "2026-07-20T10:35:00.000Z",
  },
];

function loadFromStorage(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_NOTIFICATIONS;
    const parsed = JSON.parse(raw) as AppNotification[];
    if (!Array.isArray(parsed)) return SEED_NOTIFICATIONS;
    return parsed;
  } catch {
    return SEED_NOTIFICATIONS;
  }
}

function saveToStorage(notifications: AppNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // ignore
  }
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  push: (input: NotificationInput) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(notifications);
  }, [notifications]);

  const push = useCallback((input: NotificationInput) => {
    const notification: AppNotification = {
      ...input,
      id: makeId(),
      read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [notification, ...prev]);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const remove = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
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
