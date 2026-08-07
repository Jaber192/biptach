import { useState } from "react";
import {
  X,
  MapPin,
  Phone,
  Mail,
  Clock,
  CalendarClock,
  StickyNote,
  Camera,
  PenLine,
  Play,
  CircleCheck,
  Loader as Loader2,
} from "lucide-react";
import type { Customer, WorkOrder, WorkOrderStatus } from "../../types";
import {
  PRIORITY_BADGE_CLASSES,
  PRIORITY_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
} from "../../utils/workOrderDisplay";
import { PhotoUpload } from "./PhotoUpload";
import { SignaturePad } from "./SignaturePad";
import { useNotifications } from "../../hooks/useNotifications";

interface JobDetailSheetProps {
  workOrder: WorkOrder | null;
  customer: Customer | null;
  onClose: () => void;
  onPatch: (id: string, patch: Partial<WorkOrder>) => void;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  repair: "Repair",
  install: "Install",
  maintenance: "Maintenance",
  inspection: "Inspection",
  emergency: "Emergency",
  other: "Other",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function elapsed(startIso: string | null, endIso: string | null): string {
  if (!startIso) return "—";
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  if (isNaN(start) || isNaN(end) || end < start) return "—";
  const mins = Math.round((end - start) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function JobDetailSheet({ workOrder, customer, onClose, onPatch }: JobDetailSheetProps) {
  const [notes, setNotes] = useState(workOrder?.techNotes ?? "");
  const [saving, setSaving] = useState<string | null>(null);
  const [debugMsg, setDebugMsg] = useState<string>("");
  const { push } = useNotifications();

  if (!workOrder) return null;

  const fullAddress = customer
    ? [customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(", ")
    : null;

  const canStart = workOrder.status === "pending" || workOrder.status === "scheduled";
  const canClockIn = !workOrder.clockInTime && workOrder.status !== "completed" && workOrder.status !== "cancelled";
  const canClockOut = Boolean(workOrder.clockInTime) && !workOrder.clockOutTime;
  const canComplete = workOrder.status === "in_progress";

  function patch(partial: Partial<WorkOrder>, label: string) {
    setSaving(label);
    setDebugMsg(`PATCH called: ${label}, status=${partial.status ?? workOrder!.status}`);
    try {
      onPatch(workOrder!.id, partial);
      setTimeout(() => {
        setDebugMsg(`PATCH done: ${label}, new status=${partial.status ?? workOrder!.status}`);
        setSaving(null);
      }, 600);
    } catch (e: any) {
      setDebugMsg(`PATCH ERROR: ${e?.message ?? e}`);
      setSaving(null);
    }
  }

  function handleStart() {
    const now = new Date().toISOString();
    patch({ status: "in_progress" as WorkOrderStatus, clockInTime: workOrder!.clockInTime ?? now }, "Starting");
    push({
      type: "job_started",
      title: "Job started",
      message: `"${workOrder!.title}" was started.`,
      workOrderId: workOrder!.id,
      recipientRole: "manager",
    });
  }

  function handleClockIn() {
    patch({ clockInTime: new Date().toISOString() }, "Clocking in");
    push({
      type: "job_clocked_in",
      title: "Clocked in",
      message: `Clocked in on "${workOrder!.title}".`,
      workOrderId: workOrder!.id,
      recipientRole: "technician",
    });
  }

  function handleClockOut() {
    patch({ clockOutTime: new Date().toISOString() }, "Clocking out");
    push({
      type: "job_clocked_out",
      title: "Clocked out",
      message: `Clocked out on "${workOrder!.title}".`,
      workOrderId: workOrder!.id,
      recipientRole: "technician",
    });
  }

  function handleComplete() {
    patch(
      {
        status: "completed" as WorkOrderStatus,
        clockOutTime: workOrder!.clockOutTime ?? new Date().toISOString(),
        techNotes: notes.trim() || null,
      },
      "Completing",
    );
    push({
      type: "job_completed",
      title: "Job completed",
      message: `"${workOrder!.title}" was completed.`,
      workOrderId: workOrder!.id,
      recipientRole: "manager",
    });
  }

  function saveNotes() {
    patch({ techNotes: notes.trim() || null }, "Saving notes");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl dark:bg-slate-900 sm:h-auto sm:max-h-[88vh] sm:rounded-2xl">
        {debugMsg && (
          <div className="bg-yellow-100 px-4 py-2 text-xs font-mono text-yellow-900 border-b border-yellow-300">
            {debugMsg}
          </div>
        )}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[workOrder.status]}`}>
                {STATUS_LABELS[workOrder.status]}
              </span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE_CLASSES[workOrder.priority]}`}>
                {PRIORITY_LABELS[workOrder.priority]}
              </span>
            </div>
            <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-white">{workOrder.title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {workOrder.description && (
            <p className="text-sm text-slate-700 dark:text-slate-200">{workOrder.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Job type</p>
              <p className="mt-1 text-slate-900 dark:text-white">{JOB_TYPE_LABELS[workOrder.jobType] ?? workOrder.jobType}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Customer</p>
              <p className="mt-1 text-slate-900 dark:text-white">{customer?.name ?? "—"}</p>
            </div>
          </div>

          {customer && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="space-y-1.5 text-sm">
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <Phone className="h-4 w-4 text-primary-600" />
                    {customer.phone}
                  </a>
                )}
                {customer.email && (
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <Mail className="h-4 w-4 text-primary-600" />
                    {customer.email}
                  </a>
                )}
                {fullAddress && (
                  <p className="flex items-start gap-2 text-slate-700 dark:text-slate-200">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                    {fullAddress}
                  </p>
                )}
                {customer.notes && (
                  <p className="mt-2 whitespace-pre-wrap border-t border-slate-200 pt-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {customer.notes}
                  </p>
                )}
              </div>
            </div>
          )}

          <DetailRow icon={CalendarClock} label="Scheduled" value={formatDateTime(workOrder.scheduledDate)} />

          <div className="grid grid-cols-3 gap-3">
            <DetailRow icon={Clock} label="Clock in" value={formatDateTime(workOrder.clockInTime)} />
            <DetailRow icon={Clock} label="Clock out" value={formatDateTime(workOrder.clockOutTime)} />
            <DetailRow icon={Clock} label="Time on job" value={elapsed(workOrder.clockInTime, workOrder.clockOutTime)} />
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              <StickyNote className="h-3.5 w-3.5" />
              Technician notes
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about the job..."
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
            />
            <button
              onClick={saveNotes}
              disabled={saving === "Saving notes"}
              className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {saving === "Saving notes" ? "Saving..." : "Save notes"}
            </button>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              <Camera className="h-3.5 w-3.5" />
              Job photos
            </div>
            <PhotoUpload
              photos={workOrder.photos}
              onChange={(photos) => patch({ photos }, "Photos")}
              max={6}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              <PenLine className="h-3.5 w-3.5" />
              Customer signature
            </div>
            {workOrder.signatureStorageId ? (
              <div className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700">
                <img src={workOrder.signatureStorageId} alt="Customer signature" className="h-32 w-full object-contain" />
                <button
                  onClick={() => patch({ signatureStorageId: null }, "Signature")}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Re-capture signature
                </button>
              </div>
            ) : (
              <SignaturePad
                onSave={(dataUrl) => patch({ signatureStorageId: dataUrl }, "Signature")}
                onClear={() => patch({ signatureStorageId: null }, "Signature")}
              />
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          {workOrder.status === "completed" || workOrder.status === "cancelled" ? (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-accent-50 px-4 py-3 text-sm font-semibold text-accent-700 dark:bg-accent-950/60 dark:text-accent-300">
              <CircleCheck className="h-5 w-5" />
              Job {STATUS_LABELS[workOrder.status].toLowerCase()}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {canStart && (
                <button
                  onClick={handleStart}
                  disabled={saving !== null}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-60"
                >
                  {saving === "Starting" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                  Start job
                </button>
              )}
              <div className="flex gap-2">
                {canClockIn && (
                  <button
                    onClick={handleClockIn}
                    disabled={saving !== null}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary-300 px-4 py-3 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50 disabled:opacity-60 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-950"
                  >
                    <Clock className="h-4 w-4" />
                    Clock in
                  </button>
                )}
                {canClockOut && (
                  <button
                    onClick={handleClockOut}
                    disabled={saving !== null}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-300 px-4 py-3 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-60 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950"
                  >
                    <Clock className="h-4 w-4" />
                    Clock out
                  </button>
                )}
              </div>
              {canComplete && (
                <button
                  onClick={handleComplete}
                  disabled={saving !== null}
                  className="flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-accent-700 disabled:opacity-60"
                >
                  {saving === "Completing" ? <Loader2 className="h-5 w-5 animate-spin" /> : <CircleCheck className="h-5 w-5" />}
                  Complete job
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
