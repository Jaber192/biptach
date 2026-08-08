import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, Trash2, Inbox } from "lucide-react";
import { useNotifications, isNotificationVisibleFor } from "../hooks/useNotifications";
import { useAuth } from "../hooks/useAuth";
import type { AppNotification, NotificationType } from "../types";

const TYPE_ICON_COLOR: Record<NotificationType, string> = {
  job_assigned: "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300",
  job_created: "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300",
  job_scheduled: "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300",
  job_started: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  job_clocked_in: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  job_clocked_out: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  job_completed: "bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300",
  job_cancelled: "bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300",
  customer_created: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  system: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

type Filter = "all" | "unread";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function NotificationsPage() {
  const { profile } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, remove, clearAll } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");
  const navigate = useNavigate();

  const role = profile?.role ?? "technician";
  // Owners see all notifications; others only see notifications that target them
  const visible = notifications.filter((n) => isNotificationVisibleFor(profile, n));
  const filtered = filter === "unread" ? visible.filter((n) => !n.read) : visible;

  function handleClick(n: AppNotification) {
    if (!n.read) markRead(n.id);
    if (n.workOrderId) {
      navigate(role === "technician" ? "/my-jobs" : "/work-orders");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
          <button
            onClick={clearAll}
            disabled={visible.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Trash2 className="h-4 w-4" />
            Clear all
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {(["all", "unread"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {f === "all" ? "All" : "Unread"}
            {f === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 rounded-full bg-primary-100 px-1.5 text-xs dark:bg-primary-900">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
            <Inbox className="h-6 w-6 text-primary-600 dark:text-primary-300" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">No notifications</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {filter === "unread" ? "You have no unread notifications." : "Notifications will appear here as your team works."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`group flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm transition-colors dark:bg-slate-900 ${
                !n.read
                  ? "border-primary-200 dark:border-primary-800"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <button onClick={() => handleClick(n)} className="flex flex-1 items-start gap-3 text-left">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TYPE_ICON_COLOR[n.type]}`}>
                  <Bell className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</span>
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">{n.message}</span>
                  <span className="mt-1 block text-xs text-slate-400">{formatDate(n.created_at)}</span>
                </span>
              </button>
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    aria-label="Mark read"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => remove(n.id)}
                  aria-label="Delete"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-error-600 dark:hover:bg-slate-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
