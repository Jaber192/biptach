import { useMemo, useState } from "react";
import { ClipboardList, CircleCheck as CheckCircle2, Clock, TrendingUp, Users, Wrench, CalendarClock, TriangleAlert as AlertTriangle, Activity } from "lucide-react";
import { useWorkOrders } from "../hooks/useWorkOrders";
import { useCustomers } from "../hooks/useCustomers";
import { useTechnicians } from "../hooks/useTechnicians";
import type { WorkOrderStatus, WorkOrderJobType, WorkOrderPriority } from "../types";
import { STATUS_LABELS, STATUS_DOT_CLASSES, PRIORITY_LABELS } from "../utils/workOrderDisplay";

type DateRange = "7d" | "30d" | "90d" | "all";

const RANGE_LABELS: Record<DateRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

function daysAgo(days: number): number {
  return Date.now() - days * 86400000;
}

function hoursBetween(startIso: string | null, endIso: string | null): number {
  if (!startIso) return 0;
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  return (end - start) / 3600000;
}

interface KpiCard {
  label: string;
  value: string;
  icon: typeof ClipboardList;
  color: string;
  sub?: string;
}

export function ReportsPage() {
  const { workOrders } = useWorkOrders();
  const { customers } = useCustomers();
  const { technicians } = useTechnicians();
  const [range, setRange] = useState<DateRange>("30d");

  const filtered = useMemo(() => {
    if (range === "all") return workOrders;
    const cutoff = daysAgo(range === "7d" ? 7 : range === "30d" ? 30 : 90);
    return workOrders.filter((w) => {
      const t = new Date(w.created_at).getTime();
      return !isNaN(t) && t >= cutoff;
    });
  }, [workOrders, range]);

  const kpis = useMemo<KpiCard[]>(() => {
    const completed = filtered.filter((w) => w.status === "completed");
    const inProgress = filtered.filter((w) => w.status === "in_progress");
    const totalHours = completed.reduce((sum, w) => sum + hoursBetween(w.clockInTime, w.clockOutTime), 0);
    const avgHours = completed.length > 0 ? totalHours / completed.length : 0;
    const completionRate = filtered.length > 0 ? (completed.length / filtered.length) * 100 : 0;
    return [
      {
        label: "Total Work Orders",
        value: String(filtered.length),
        icon: ClipboardList,
        color: "text-primary-600",
        sub: `${inProgress.length} in progress`,
      },
      {
        label: "Completed",
        value: String(completed.length),
        icon: CheckCircle2,
        color: "text-accent-600",
        sub: `${completionRate.toFixed(0)}% completion rate`,
      },
      {
        label: "Hours Logged",
        value: totalHours.toFixed(1),
        icon: Clock,
        color: "text-warning-600",
        sub: `${avgHours.toFixed(1)}h avg per job`,
      },
      {
        label: "Active Technicians",
        value: String(technicians.filter((t) => t.is_active).length),
        icon: Wrench,
        color: "text-primary-600",
        sub: `${technicians.length} total`,
      },
    ];
  }, [filtered, technicians]);

  const statusBreakdown = useMemo(() => {
    const counts: Record<WorkOrderStatus, number> = {
      pending: 0,
      scheduled: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const w of filtered) counts[w.status]++;
    const total = filtered.length || 1;
    return (Object.keys(counts) as WorkOrderStatus[]).map((status) => ({
      status,
      count: counts[status],
      pct: (counts[status] / total) * 100,
    }));
  }, [filtered]);

  const jobTypeBreakdown = useMemo(() => {
    const counts: Record<WorkOrderJobType, number> = {
      repair: 0,
      install: 0,
      maintenance: 0,
      inspection: 0,
      emergency: 0,
      other: 0,
    };
    for (const w of filtered) counts[w.jobType]++;
    const total = filtered.length || 1;
    return (Object.keys(counts) as WorkOrderJobType[])
      .map((type) => ({
        type,
        count: counts[type],
        pct: (counts[type] / total) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const priorityBreakdown = useMemo(() => {
    const counts: Record<WorkOrderPriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };
    for (const w of filtered) counts[w.priority]++;
    const total = filtered.length || 1;
    return (Object.keys(counts) as WorkOrderPriority[]).map((priority) => ({
      priority,
      count: counts[priority],
      pct: (counts[priority] / total) * 100,
    }));
  }, [filtered]);

  const technicianStats = useMemo(() => {
    return technicians
      .map((tech) => {
        const techJobs = filtered.filter((w) => w.assignedTo === tech.id);
        const completed = techJobs.filter((w) => w.status === "completed");
        const hours = completed.reduce((sum, w) => sum + hoursBetween(w.clockInTime, w.clockOutTime), 0);
        const avgHours = completed.length > 0 ? hours / completed.length : 0;
        return {
          tech,
          total: techJobs.length,
          completed: completed.length,
          active: techJobs.filter((w) => w.status === "in_progress" || w.status === "scheduled").length,
          hours,
          avgHours,
        };
      })
      .sort((a, b) => b.completed - a.completed);
  }, [filtered, technicians]);

  const customerStats = useMemo(() => {
    return customers
      .map((customer) => {
        const custJobs = filtered.filter((w) => w.customerId === customer.id);
        const completed = custJobs.filter((w) => w.status === "completed");
        return {
          customer,
          total: custJobs.length,
          completed: completed.length,
          open: custJobs.length - completed.length,
        };
      })
      .filter((s) => s.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filtered, customers]);

  const weeklyTrend = useMemo(() => {
    const weeks: { label: string; created: number; completed: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7 - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const startMs = weekStart.getTime();
      const endMs = weekEnd.getTime();
      const created = workOrders.filter((w) => {
        const t = new Date(w.created_at).getTime();
        return t >= startMs && t < endMs;
      }).length;
      const completed = workOrders.filter((w) => {
        if (!w.clockOutTime) return false;
        const t = new Date(w.clockOutTime).getTime();
        return t >= startMs && t < endMs;
      }).length;
      weeks.push({
        label: weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        created,
        completed,
      });
    }
    return weeks;
  }, [workOrders]);

  const maxTrend = Math.max(1, ...weeklyTrend.flatMap((w) => [w.created, w.completed]));

  const jobTypeColors: Record<WorkOrderJobType, string> = {
    repair: "bg-primary-500",
    install: "bg-accent-500",
    maintenance: "bg-warning-500",
    inspection: "bg-sky-500",
    emergency: "bg-error-500",
    other: "bg-slate-400",
  };

  const priorityColors: Record<WorkOrderPriority, string> = {
    low: "bg-slate-400",
    medium: "bg-primary-500",
    high: "bg-amber-500",
    urgent: "bg-error-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track work order volume, technician productivity, and customer activity.
          </p>
        </div>
        <div className="flex gap-1.5 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {(Object.keys(RANGE_LABELS) as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                range === r
                  ? "bg-primary-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{kpi.label}</p>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{kpi.value}</p>
            {kpi.sub && <p className="mt-1 text-xs text-slate-400">{kpi.sub}</p>}
          </div>
        ))}
      </div>

      {/* Weekly trend chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Weekly Trend</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Created vs completed work orders over the last 6 weeks.</p>
        <div className="mt-6 flex items-end justify-between gap-2 sm:gap-4">
          {weeklyTrend.map((week) => (
            <div key={week.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-40 w-full items-end justify-center gap-1">
                <div
                  className="w-1/2 rounded-t bg-primary-500 transition-all"
                  style={{ height: `${(week.created / maxTrend) * 100}%` }}
                  title={`${week.created} created`}
                />
                <div
                  className="w-1/2 rounded-t bg-accent-500 transition-all"
                  style={{ height: `${(week.completed / maxTrend) * 100}%` }}
                  title={`${week.completed} completed`}
                />
              </div>
              <span className="text-[11px] text-slate-400">{week.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-primary-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Created</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-accent-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Completed</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Status Breakdown</h2>
          </div>
          <div className="mt-4 space-y-3">
            {statusBreakdown.map((s) => (
              <div key={s.status}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_CLASSES[s.status]}`} />
                    <span className="font-medium text-slate-700 dark:text-slate-200">{STATUS_LABELS[s.status]}</span>
                  </div>
                  <span className="text-slate-500 dark:text-slate-400">
                    {s.count} <span className="text-xs">({s.pct.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className={`h-full rounded-full ${STATUS_DOT_CLASSES[s.status]}`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Job type breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Job Type Distribution</h2>
          </div>
          <div className="mt-4 space-y-3">
            {jobTypeBreakdown.map((j) => (
              <div key={j.type}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize text-slate-700 dark:text-slate-200">{j.type}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {j.count} <span className="text-xs">({j.pct.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className={`h-full rounded-full ${jobTypeColors[j.type]}`} style={{ width: `${j.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Priority Distribution</h2>
          </div>
          <div className="mt-4 space-y-3">
            {priorityBreakdown.map((p) => (
              <div key={p.priority}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{PRIORITY_LABELS[p.priority]}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {p.count} <span className="text-xs">({p.pct.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className={`h-full rounded-full ${priorityColors[p.priority]}`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer activity */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Top Customers by Activity</h2>
          </div>
          {customerStats.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No customer activity in this period.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {customerStats.map((s) => (
                <div key={s.customer.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                  <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{s.customer.name}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">{s.total} total</span>
                    <span className="text-accent-600">{s.completed} done</span>
                    {s.open > 0 && <span className="text-warning-600">{s.open} open</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Technician productivity table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-200 p-6 dark:border-slate-800">
          <CalendarClock className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Technician Productivity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="px-6 py-3 font-medium">Technician</th>
                <th className="px-6 py-3 font-medium">Assigned</th>
                <th className="px-6 py-3 font-medium">Completed</th>
                <th className="px-6 py-3 font-medium">Active</th>
                <th className="px-6 py-3 font-medium">Hours Logged</th>
                <th className="px-6 py-3 font-medium">Avg / Job</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {technicianStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    No technicians found.
                  </td>
                </tr>
              ) : (
                technicianStats.map((s) => (
                  <tr key={s.tech.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.tech.color }} />
                        <span className="font-medium text-slate-900 dark:text-white">{s.tech.name}</span>
                        {!s.tech.is_active && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{s.total}</td>
                    <td className="px-6 py-3 text-accent-600">{s.completed}</td>
                    <td className="px-6 py-3 text-warning-600">{s.active}</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{s.hours.toFixed(1)}h</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{s.avgHours.toFixed(1)}h</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
