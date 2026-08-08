import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  UserPlus,
  User,
  Inbox,
} from "lucide-react";
import { useWorkOrders } from "../hooks/useWorkOrders";
import { useNotifications } from "../hooks/useNotifications";
import { useCustomers } from "../hooks/useCustomers";
import { useTechnicians } from "../hooks/useTechnicians";
import type { WorkOrder } from "../types";
import {
  PRIORITY_BADGE_CLASSES,
  PRIORITY_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
} from "../utils/workOrderDisplay";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatWeekRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startFmt = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endFmt = end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startFmt} – ${endFmt}`;
}

function getHour(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.getHours();
}

export function SchedulingPage() {
  const { workOrders, updateWorkOrder } = useWorkOrders();
  const { push } = useNotifications();
  const { getCustomer } = useCustomers();
  const { technicians, getTechnician } = useTechnicians();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [assigning, setAssigning] = useState<WorkOrder | null>(null);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  const scheduledByDay = useMemo(() => {
    const map = new Map<number, WorkOrder[]>();
    weekDays.forEach((_, i) => map.set(i, []));
    workOrders.forEach((w) => {
      if (!w.scheduledDate) return;
      const d = new Date(w.scheduledDate);
      if (isNaN(d.getTime())) return;
      const dayIndex = weekDays.findIndex((wd) => isSameDay(wd, d));
      if (dayIndex === -1) return;
      map.get(dayIndex)!.push(w);
    });
    map.forEach((list) => list.sort((a, b) => {
      const ta = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
      const tb = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
      return ta - tb;
    }));
    return map;
  }, [workOrders, weekDays]);

  const unscheduled = useMemo(
    () =>
      workOrders.filter((w) => {
        if (!w.scheduledDate) return true;
        const d = new Date(w.scheduledDate);
        return isNaN(d.getTime());
      }),
    [workOrders],
  );

  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  }

  function thisWeek() {
    setWeekStart(startOfWeek(new Date()));
  }

  function handleAssign(technicianId: string | null) {
    if (!assigning) return;
    updateWorkOrder(assigning.id, {
      title: assigning.title,
      description: assigning.description,
      jobType: assigning.jobType,
      priority: assigning.priority,
      status: assigning.status,
      customerId: assigning.customerId,
      assignedTo: technicianId,
      createdBy: assigning.createdBy,
      scheduledDate: assigning.scheduledDate,
    });
    if (technicianId && technicianId !== assigning.assignedTo) {
      // Deliver the notification only to the assigned technician's user account
      const assignedUser = technicians.find((t) => t.id === technicianId)?.user_id ?? null;
      push({
        type: "job_assigned",
        title: "New job assigned",
        message: `"${assigning.title}" has been assigned to you.`,
        workOrderId: assigning.id,
        userId: assignedUser,
        recipientRole: "technician",
      });
    }
    setAssigning(null);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Scheduling & Dispatch</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Assign technicians to scheduled jobs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            aria-label="Previous week"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={thisWeek}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Today
          </button>
          <button
            onClick={nextWeek}
            aria-label="Next week"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <CalendarClock className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          {formatWeekRange(weekStart)}
        </div>
        <div className="flex -space-x-2">
          {technicians.filter((t) => t.is_active).map((t) => (
            <div
              key={t.id}
              title={t.name}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white dark:border-slate-900"
              style={{ backgroundColor: t.color }}
            >
              {t.name.charAt(0)}
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[900px] grid-cols-7 gap-3">
          {weekDays.map((day, dayIndex) => {
            const dayJobs = scheduledByDay.get(dayIndex) ?? [];
            const isToday = isSameDay(day, today);
            return (
              <div
                key={dayIndex}
                className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div
                  className={`rounded-t-xl border-b border-slate-200 px-3 py-2.5 dark:border-slate-800 ${
                    isToday ? "bg-primary-50 dark:bg-primary-950/50" : ""
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {DAY_NAMES[day.getDay()]}
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      isToday
                        ? "text-primary-700 dark:text-primary-300"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {day.getDate()}
                  </p>
                </div>
                <div className="flex-1 space-y-2 p-2">
                  {dayJobs.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs italic text-slate-400 dark:text-slate-600">
                      No jobs
                    </p>
                  ) : (
                    dayJobs.map((job) => {
                      const customer = job.customerId ? getCustomer(job.customerId) : null;
                      const tech = job.assignedTo ? getTechnician(job.assignedTo) : null;
                      const hour = getHour(job.scheduledDate);
                      return (
                        <button
                          key={job.id}
                          onClick={() => setAssigning(job)}
                          className="block w-full rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-sm transition-all hover:border-primary-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-primary-700"
                        >
                          <div className="flex items-center gap-1.5">
                            <div
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: tech?.color ?? "#cbd5e1" }}
                            />
                            {hour !== null && (
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                {hour > 12 ? hour - 12 : hour}
                                {hour >= 12 ? "pm" : "am"}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {job.title}
                          </p>
                          {customer && (
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {customer.name}
                            </p>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            <span
                              className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE_CLASSES[job.priority]}`}
                            >
                              {PRIORITY_LABELS[job.priority]}
                            </span>
                            <span
                              className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_BADGE_CLASSES[job.status]}`}
                            >
                              {STATUS_LABELS[job.status]}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-1 text-xs">
                            {tech ? (
                              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                <User className="h-3 w-3" style={{ color: tech.color }} />
                                {tech.name}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 font-medium text-primary-600 dark:text-primary-400">
                                <UserPlus className="h-3 w-3" />
                                Assign
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {unscheduled.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <Inbox className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Unscheduled work orders
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {unscheduled.length}
            </span>
          </div>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {unscheduled.map((job) => {
              const customer = job.customerId ? getCustomer(job.customerId) : null;
              const tech = job.assignedTo ? getTechnician(job.assignedTo) : null;
              return (
                <li
                  key={job.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {job.title}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {customer?.name ?? "No customer"} · {PRIORITY_LABELS[job.priority]}
                    </p>
                  </div>
                  <button
                    onClick={() => setAssigning(job)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary-300 px-3 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-950"
                  >
                    {tech ? (
                      <>
                        <User className="h-3.5 w-3.5" style={{ color: tech.color }} />
                        {tech.name}
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" />
                        Assign
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {assigning && (
        <AssignModal
          workOrder={assigning}
          technicians={technicians.filter((t) => t.is_active)}
          currentTechId={assigning.assignedTo}
          onClose={() => setAssigning(null)}
          onAssign={handleAssign}
        />
      )}
    </div>
  );
}

function AssignModal({
  workOrder,
  technicians,
  currentTechId,
  onClose,
  onAssign,
}: {
  workOrder: WorkOrder;
  technicians: { id: string; name: string; color: string }[];
  currentTechId: string | null;
  onClose: () => void;
  onAssign: (technicianId: string | null) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Assign technician</h3>
          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{workOrder.title}</p>
        </div>
        <div className="max-h-[50vh] space-y-1 overflow-y-auto p-3">
          <button
            onClick={() => onAssign(null)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              currentTechId === null
                ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
              <UserPlus className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </div>
            Unassigned
          </button>
          {technicians.map((tech) => (
            <button
              key={tech.id}
              onClick={() => onAssign(tech.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                currentTechId === tech.id
                  ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: tech.color }}
              >
                {tech.name.charAt(0)}
              </div>
              {tech.name}
            </button>
          ))}
        </div>
        <div className="border-t border-slate-200 px-5 py-3 dark:border-slate-800">
          <button
            onClick={onClose}
            className="w-full rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
