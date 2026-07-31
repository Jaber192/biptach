import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Users, ClipboardList, CalendarClock, Wrench, TrendingUp, Clock, CircleCheck as CheckCircle2, Smartphone, ArrowRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useWorkOrders } from "../hooks/useWorkOrders";
import { useCustomers } from "../hooks/useCustomers";
import { useTechnicians } from "../hooks/useTechnicians";
import type { UserRole } from "../types";

interface StatCard {
  label: string;
  value: string;
  icon: typeof Users;
  color: string;
}

const ROLE_WELCOME: Record<UserRole, { title: string; description: string }> = {
  owner: {
    title: "Owner Dashboard",
    description: "Manage your team, customers, and operations from one place.",
  },
  manager: {
    title: "Manager Dashboard",
    description: "Monitor work orders, scheduling, and technician activity.",
  },
  dispatcher: {
    title: "Dispatcher Dashboard",
    description: "Schedule jobs, dispatch technicians, and manage daily operations.",
  },
  technician: {
    title: "Technician Dashboard",
    description: "View your assigned jobs and update their status.",
  },
};

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function hoursThisWeek(clockIn: string | null, clockOut: string | null): number {
  if (!clockIn) return 0;
  const start = new Date(clockIn).getTime();
  const end = clockOut ? new Date(clockOut).getTime() : Date.now();
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  return (end - start) / 3600000;
}

export function DashboardPage() {
  const { profile } = useAuth();
  const role = profile?.role ?? "owner";
  const welcome = ROLE_WELCOME[role];
  const { workOrders } = useWorkOrders();
  const { customers } = useCustomers();
  const { technicians } = useTechnicians();

  const stats: StatCard[] = useMemo(() => {
    if (role === "technician") {
      const myTech = technicians.find((t) => t.name.toLowerCase() === profile?.name?.toLowerCase()) ?? null;
      const myJobs = myTech
        ? workOrders.filter((w) => w.assignedTo === myTech.id)
        : workOrders.filter((w) => Boolean(w.assignedTo));
      const active = myJobs.filter((w) => w.status === "pending" || w.status === "in_progress").length;
      const scheduledToday = myJobs.filter((w) => w.status === "scheduled" && isToday(w.scheduledDate)).length;
      const completedThisWeek = myJobs.filter((w) => w.status === "completed").length;
      const hours = myJobs.reduce((sum, w) => sum + hoursThisWeek(w.clockInTime, w.clockOutTime), 0);
      return [
        { label: "My Active Jobs", value: String(active), icon: ClipboardList, color: "text-primary-600" },
        { label: "Scheduled Today", value: String(scheduledToday), icon: CalendarClock, color: "text-warning-600" },
        { label: "Completed", value: String(completedThisWeek), icon: CheckCircle2, color: "text-accent-600" },
        { label: "Hours Logged", value: hours.toFixed(1), icon: Clock, color: "text-primary-600" },
      ];
    }
    if (role === "manager") {
      return [
        { label: "Total Customers", value: String(customers.length), icon: Users, color: "text-primary-600" },
        { label: "Active Work Orders", value: String(workOrders.filter((w) => w.status === "in_progress").length), icon: ClipboardList, color: "text-accent-600" },
        { label: "Scheduled Today", value: String(workOrders.filter((w) => w.status === "scheduled" && isToday(w.scheduledDate)).length), icon: CalendarClock, color: "text-warning-600" },
        { label: "Technicians On Duty", value: String(technicians.filter((t) => t.is_active).length), icon: Wrench, color: "text-accent-600" },
      ];
    }
    return [
      { label: "Total Customers", value: String(customers.length), icon: Users, color: "text-primary-600" },
      { label: "Active Work Orders", value: String(workOrders.filter((w) => w.status === "in_progress").length), icon: ClipboardList, color: "text-accent-600" },
      { label: "Scheduled Today", value: String(workOrders.filter((w) => w.status === "scheduled" && isToday(w.scheduledDate)).length), icon: CalendarClock, color: "text-warning-600" },
      { label: "Team Members", value: String(technicians.length), icon: TrendingUp, color: "text-primary-600" },
    ];
  }, [role, profile, workOrders, customers, technicians]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Welcome back, {profile?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{welcome.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {role === "technician" && (
        <Link
          to="/my-jobs"
          className="group flex items-center justify-between rounded-xl border border-primary-200 bg-primary-50 p-5 transition-colors hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950 dark:hover:bg-primary-900"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-primary-900 dark:text-white">Open My Jobs</p>
              <p className="text-sm text-primary-700/80 dark:text-primary-300/80">
                Start, complete, and document jobs from your phone
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-primary-600 transition-transform group-hover:translate-x-0.5 dark:text-primary-400" />
        </Link>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{welcome.title}</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {role === "technician"
            ? "View your assigned jobs, update status, and document work from the My Jobs page."
            : "Track work orders, scheduling, and team activity in real time. Use the sidebar to navigate."}
        </p>
      </div>
    </div>
  );
}
