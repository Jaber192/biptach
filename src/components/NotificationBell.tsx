import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, Trash2, ChevronRight } from "lucide-react";
import { useNotifications, isNotificationVisibleFor } from "../hooks/useNotifications";
import { useAuth } from "../hooks/useAuth";
import type { AppNotification, NotificationType, UserRole } from "../types";

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

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const { profile } = useAuth();
  const { notifications, markRead, markAllRead, remove } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const role = profile?.role ?? "technician";
  // Owners see all notifications; others only see notifications that target them
  const visible = notifications.filter((n) => isNotificationVisibleFor(profile, n));
  const unreadCount = visible.filter((n) => !n.read).length;
  const recent = visible.slice(0, 8);

  function handleClick(n: AppNotification) {
    if (!n.read) markRead(n.id);
    setOpen(false);
    if (n.workOrderId) {
      navigate(role === "technician" ? "/my-jobs" : "/work-orders");
    } else {
      navigate("/notifications");
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Notifications {unreadCount > 0 && <span className="text-error-500">({unreadCount})</span>}
            </p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                You're all caught up.
              </p>
            ) : (
              recent.map((n) => (
                <div
                  key={n.id}
                  className={`group flex gap-3 border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${!n.read ? "bg-primary-50/40 dark:bg-primary-950/30" : ""}`}
                >
                  <button
                    onClick={() => handleClick(n)}
                    className="flex flex-1 gap-3 text-left"
                  >
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TYPE_ICON_COLOR[n.type]}`}>
                      <Bell className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{n.title}</span>
                        {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{n.message}</span>
                      <span className="mt-1 block text-[11px] text-slate-400">{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                  <div className="flex flex-col items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!n.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                        aria-label="Mark read"
                        className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                      aria-label="Delete"
                      className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-error-600 dark:hover:bg-slate-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => { setOpen(false); navigate("/notifications"); }}
            className="flex w-full items-center justify-center gap-1 border-t border-slate-200 px-4 py-3 text-sm font-medium text-primary-600 hover:bg-slate-50 dark:border-slate-800 dark:text-primary-400 dark:hover:bg-slate-800/50"
          >
            View all notifications
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export { type UserRole };
