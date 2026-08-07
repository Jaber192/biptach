import {
  X,
  Pencil,
  Trash2,
  User,
  CalendarClock,
  Clock,
  StickyNote,
  FileText,
  Wrench,
  Camera,
  PenLine,
} from "lucide-react";
import type { Customer, WorkOrder } from "../../types";
import {
  PRIORITY_BADGE_CLASSES,
  PRIORITY_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
} from "../../utils/workOrderDisplay";

interface WorkOrderDetailDrawerProps {
  workOrder: WorkOrder | null;
  customer: Customer | null;
  onClose: () => void;
  onEdit: (workOrder: WorkOrder) => void;
  onDelete: (workOrder: WorkOrder) => void;
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
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
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

export function WorkOrderDetailDrawer({
  workOrder,
  customer,
  onClose,
  onEdit,
  onDelete,
}: WorkOrderDetailDrawerProps) {
  if (!workOrder) return null;

  const fullAddress = customer
    ? [customer.address, customer.city, customer.state, customer.zip]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[workOrder.status]}`}
              >
                {STATUS_LABELS[workOrder.status]}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE_CLASSES[workOrder.priority]}`}
              >
                {PRIORITY_LABELS[workOrder.priority]}
              </span>
            </div>
            <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-white">
              {workOrder.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Created {new Date(workOrder.created_at).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
          {workOrder.description && (
            <DetailRow icon={FileText} label="Description" value={workOrder.description} multiline />
          )}

          <div className="grid grid-cols-2 gap-4">
            <DetailRow icon={Wrench} label="Job type" value={JOB_TYPE_LABELS[workOrder.jobType] ?? workOrder.jobType} />
            <DetailRow icon={User} label="Customer" value={customer?.name ?? null} />
          </div>

          {customer && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Customer details
              </p>
              {customer.phone && (
                <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-200">{customer.phone}</p>
              )}
              {customer.email && (
                <p className="text-sm text-slate-700 dark:text-slate-200">{customer.email}</p>
              )}
              {fullAddress && (
                <p className="text-sm text-slate-700 dark:text-slate-200">{fullAddress}</p>
              )}
              {customer.notes && (
                <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500 dark:text-slate-400">
                  {customer.notes}
                </p>
              )}
            </div>
          )}

          <DetailRow icon={CalendarClock} label="Scheduled" value={formatDateTime(workOrder.scheduledDate)} />
          <div className="grid grid-cols-2 gap-4">
            <DetailRow icon={Clock} label="Clock in" value={formatDateTime(workOrder.clockInTime)} />
            <DetailRow icon={Clock} label="Clock out" value={formatDateTime(workOrder.clockOutTime)} />
          </div>
          <DetailRow icon={Clock} label="Time on job" value={elapsed(workOrder.clockInTime, workOrder.clockOutTime)} />

          <DetailRow icon={StickyNote} label="Technician notes" value={workOrder.techNotes} multiline />

          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <Camera className="h-3.5 w-3.5" />
              Photos
            </div>
            {workOrder.photos.length > 0 ? (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {workOrder.photos.map((p, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <img src={p} alt={`Job photo ${i + 1}`} className="h-full w-full rounded-lg object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-sm italic text-slate-400 dark:text-slate-500">No photos attached</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <PenLine className="h-3.5 w-3.5" />
              Signature
            </div>
            {workOrder.signatureStorageId ? (
              <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                <img
                  src={workOrder.signatureStorageId}
                  alt="Customer signature"
                  className="max-h-40 w-full object-contain"
                />
              </div>
            ) : (
              <p className="mt-1.5 text-sm italic text-slate-400 dark:text-slate-500">No signature captured</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <button
            onClick={() => onDelete(workOrder)}
            className="flex items-center justify-center gap-2 rounded-lg border border-error-300 px-4 py-2.5 text-sm font-semibold text-error-600 transition-colors hover:bg-error-50 dark:border-error-900 dark:text-error-400 dark:hover:bg-error-950"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          <button
            onClick={() => onEdit(workOrder)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <Pencil className="h-4 w-4" />
            Edit work order
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  multiline,
}: {
  icon: typeof FileText;
  label: string;
  value: string | null;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {value ? (
        <p
          className={`mt-1.5 text-sm text-slate-900 dark:text-slate-100 ${
            multiline ? "whitespace-pre-wrap" : ""
          }`}
        >
          {value}
        </p>
      ) : (
        <p className="mt-1.5 text-sm italic text-slate-400 dark:text-slate-500">—</p>
      )}
    </div>
  );
}
