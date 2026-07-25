import type { WorkOrderPriority, WorkOrderStatus } from "../types";

export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  pending: "Pending",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STATUS_BADGE_CLASSES: Record<WorkOrderStatus, string> = {
  pending:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  scheduled:
    "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300",
  in_progress:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  completed:
    "bg-accent-50 text-accent-700 dark:bg-accent-950/60 dark:text-accent-300",
  cancelled:
    "bg-error-50 text-error-700 dark:bg-error-950/60 dark:text-error-400",
};

export const STATUS_DOT_CLASSES: Record<WorkOrderStatus, string> = {
  pending: "bg-slate-400",
  scheduled: "bg-primary-500",
  in_progress: "bg-amber-500",
  completed: "bg-accent-500",
  cancelled: "bg-error-500",
};

export const PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const PRIORITY_BADGE_CLASSES: Record<WorkOrderPriority, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  medium:
    "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300",
  high: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  urgent:
    "bg-error-50 text-error-700 dark:bg-error-950/60 dark:text-error-400",
};
