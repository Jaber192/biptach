import { Users, ClipboardList, CalendarClock, Wrench, TrendingUp, Clock, CircleCheck as CheckCircle2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types";

interface StatCard {
  label: string;
  value: string;
  icon: typeof Users;
  color: string;
}

const ROLE_STATS: Record<UserRole, StatCard[]> = {
  admin: [
    { label: "Total Customers", value: "—", icon: Users, color: "text-primary-600" },
    { label: "Active Work Orders", value: "—", icon: ClipboardList, color: "text-accent-600" },
    { label: "Scheduled Today", value: "—", icon: CalendarClock, color: "text-warning-600" },
    { label: "Team Members", value: "—", icon: TrendingUp, color: "text-primary-600" },
  ],
  manager: [
    { label: "Total Customers", value: "—", icon: Users, color: "text-primary-600" },
    { label: "Active Work Orders", value: "—", icon: ClipboardList, color: "text-accent-600" },
    { label: "Scheduled Today", value: "—", icon: CalendarClock, color: "text-warning-600" },
    { label: "Technicians On Duty", value: "—", icon: Wrench, color: "text-accent-600" },
  ],
  technician: [
    { label: "My Active Jobs", value: "—", icon: ClipboardList, color: "text-primary-600" },
    { label: "Scheduled Today", value: "—", icon: CalendarClock, color: "text-warning-600" },
    { label: "Completed This Week", value: "—", icon: CheckCircle2, color: "text-accent-600" },
    { label: "Hours Logged", value: "—", icon: Clock, color: "text-primary-600" },
  ],
};

const ROLE_WELCOME: Record<UserRole, { title: string; description: string }> = {
  admin: {
    title: "Admin Dashboard",
    description: "Manage your team, customers, and operations from one place.",
  },
  manager: {
    title: "Manager Dashboard",
    description: "Monitor work orders, scheduling, and technician activity.",
  },
  technician: {
    title: "Technician Dashboard",
    description: "View your assigned jobs and update their status.",
  },
};

export function DashboardPage() {
  const { profile } = useAuth();
  const role = profile?.role ?? "technician";
  const stats = ROLE_STATS[role];
  const welcome = ROLE_WELCOME[role];

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

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{welcome.title}</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          This is your {role} dashboard. Customer management, work orders, scheduling, and reporting
          modules will appear here as they are built.
        </p>
      </div>
    </div>
  );
}
