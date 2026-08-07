import { useMemo, useState } from "react";
import {
  ClipboardList,
  MapPin,
  CalendarClock,
  Clock,
  CircleCheck,
  Play,
  Search,
  Inbox,
} from "lucide-react";
import { useWorkOrders } from "../hooks/useWorkOrders";
import { useCustomers } from "../hooks/useCustomers";
import { useTechnicians } from "../hooks/useTechnicians";
import { useAuth } from "../hooks/useAuth";
import type { WorkOrderStatus } from "../types";
import {
  PRIORITY_BADGE_CLASSES,
  PRIORITY_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_DOT_CLASSES,
  STATUS_LABELS,
} from "../utils/workOrderDisplay";
import { JobDetailSheet } from "../components/technician/JobDetailSheet";

type Filter = "active" | "scheduled" | "completed" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
];

const ACTIVE_STATUSES: WorkOrderStatus[] = ["pending", "in_progress"];

function formatScheduled(iso: string | null): string {
  if (!iso) return "Not scheduled";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Not scheduled";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function statusHint(status: WorkOrderStatus): string {
  switch (status) {
    case "pending":
      return "Tap to start";
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Scheduled";
  }
}

export function TechnicianMobilePage() {
  const { workOrders, patchWorkOrder } = useWorkOrders();
  const { getCustomer } = useCustomers();
  const { technicians } = useTechnicians();
  const { profile } = useAuth();
  const [filter, setFilter] = useState<Filter>("active");
  const [query, setQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const myTechnician = useMemo(() => {
    // Owner-technician: use the linked technician ID
    if (profile?.owner_technician_id) {
      return technicians.find((t) => t.id === profile.owner_technician_id) ?? null;
    }
    if (!profile?.name) return null;
    return technicians.find((t) => t.name.toLowerCase() === profile.name.toLowerCase()) ?? null;
  }, [technicians, profile]);

  const myJobs = useMemo(() => {
    const assigned = myTechnician
      ? workOrders.filter((w) => w.assignedTo === myTechnician.id)
      : workOrders.filter((w) => Boolean(w.assignedTo));

    const q = query.trim().toLowerCase();
    const searched = q
      ? assigned.filter((w) => {
          const customer = w.customerId ? getCustomer(w.customerId) : null;
          return [w.title, w.description, customer?.name].filter(Boolean).some((f) => f!.toLowerCase().includes(q));
        })
      : assigned;

    return searched.sort((a, b) => {
      const ta = a.scheduledDate ? new Date(a.scheduledDate).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = b.scheduledDate ? new Date(b.scheduledDate).getTime() : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });
  }, [workOrders, myTechnician, query, getCustomer]);

  const filtered = useMemo(() => {
    if (filter === "all") return myJobs;
    if (filter === "active") return myJobs.filter((w) => ACTIVE_STATUSES.includes(w.status));
    if (filter === "scheduled") return myJobs.filter((w) => w.status === "scheduled");
    return myJobs.filter((w) => w.status === "completed");
  }, [myJobs, filter]);

  const counts = useMemo(() => ({
    active: myJobs.filter((w) => ACTIVE_STATUSES.includes(w.status)).length,
    scheduled: myJobs.filter((w) => w.status === "scheduled").length,
    completed: myJobs.filter((w) => w.status === "completed").length,
    all: myJobs.length,
  }), [myJobs]);

  const viewing = viewingId ? workOrders.find((w) => w.id === viewingId) ?? null : null;
  const viewingCustomer = viewing?.customerId ? getCustomer(viewing.customerId) : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Jobs</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {myTechnician ? `Assigned to ${myTechnician.name}` : "Your assigned work orders"}
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search jobs..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-primary-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {f.label}
            <span className={`rounded-full px-1.5 text-xs ${filter === f.value ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"}`}>
              {counts[f.value]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasJobs={myJobs.length > 0} />
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => {
            const customer = job.customerId ? getCustomer(job.customerId) : null;
            const isActive = job.status === "in_progress";
            return (
              <button
                key={job.id}
                onClick={() => setViewingId(job.id)}
                className="block w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-primary-300 hover:shadow-md active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASSES[job.status]}`} />
                      <p className="truncate font-semibold text-slate-900 dark:text-white">{job.title}</p>
                    </div>
                    {customer && (
                      <p className="mt-1 flex items-center gap-1 truncate text-sm text-slate-500 dark:text-slate-400">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {customer.name}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[job.status]}`}>
                    {STATUS_LABELS[job.status]}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatScheduled(job.scheduledDate)}
                  </span>
                  {job.clockInTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Clocked in
                    </span>
                  )}
                  <span className={`rounded px-1.5 py-0.5 ${PRIORITY_BADGE_CLASSES[job.priority]}`}>
                    {PRIORITY_LABELS[job.priority]}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400">
                  {isActive ? (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Continue job
                    </>
                  ) : job.status === "completed" ? (
                    <>
                      <CircleCheck className="h-3.5 w-3.5" />
                      View details
                    </>
                  ) : (
                    <>
                      <ClipboardList className="h-3.5 w-3.5" />
                      {statusHint(job.status)}
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <JobDetailSheet
        workOrder={viewing}
        customer={viewingCustomer}
        onClose={() => setViewingId(null)}
        onPatch={patchWorkOrder}
      />
    </div>
  );
}

function EmptyState({ hasJobs }: { hasJobs: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
        <Inbox className="h-6 w-6 text-primary-600 dark:text-primary-300" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
        {hasJobs ? "No jobs in this view" : "No jobs assigned yet"}
      </h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {hasJobs ? "Try a different filter." : "Jobs dispatched to you will appear here."}
      </p>
    </div>
  );
}
