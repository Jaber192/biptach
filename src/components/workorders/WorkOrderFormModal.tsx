import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type {
  Customer,
  WorkOrder,
  WorkOrderInput,
  WorkOrderJobType,
  WorkOrderPriority,
  WorkOrderStatus,
} from "../../types";

interface WorkOrderFormModalProps {
  open: boolean;
  initial: WorkOrder | null;
  customers: Customer[];
  onClose: () => void;
  onSubmit: (input: WorkOrderInput) => void;
}

const EMPTY: WorkOrderInput = {
  title: "",
  description: "",
  jobType: "repair",
  priority: "medium",
  status: "pending",
  customerId: null,
  assignedTo: null,
  createdBy: null,
  scheduledDate: null,
};

const JOB_TYPES: { value: WorkOrderJobType; label: string }[] = [
  { value: "repair", label: "Repair" },
  { value: "install", label: "Install" },
  { value: "maintenance", label: "Maintenance" },
  { value: "inspection", label: "Inspection" },
  { value: "emergency", label: "Emergency" },
  { value: "other", label: "Other" },
];

const PRIORITIES: { value: WorkOrderPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUSES: { value: WorkOrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function toDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function WorkOrderFormModal({
  open,
  initial,
  customers,
  onClose,
  onSubmit,
}: WorkOrderFormModalProps) {
  const [form, setForm] = useState<WorkOrderInput>(EMPTY);
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [errors, setErrors] = useState<Partial<Record<keyof WorkOrderInput, string>>>({});

  useEffect(() => {
    if (open) {
      const base: WorkOrderInput = initial
        ? {
            title: initial.title,
            description: initial.description ?? "",
            jobType: initial.jobType,
            priority: initial.priority,
            status: initial.status,
            customerId: initial.customerId,
            assignedTo: initial.assignedTo,
            createdBy: initial.createdBy,
            scheduledDate: initial.scheduledDate,
          }
        : EMPTY;
      setForm(base);
      setScheduledDate(toDateTimeLocal(base.scheduledDate));
      setErrors({});
    }
  }, [open, initial]);

  if (!open) return null;

  function update<K extends keyof WorkOrderInput>(key: K, value: WorkOrderInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof WorkOrderInput, string>> = {};
    if (!form.title.trim()) next.title = "Title is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...form,
      title: form.title.trim(),
      description: form.description?.trim() || null,
      scheduledDate: fromDateTimeLocal(scheduledDate),
    });
  }

  const fieldClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500";
  const labelClass = "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {initial ? "Edit work order" : "Create work order"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5"
        >
          <div>
            <label className={labelClass}>Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. AC Repair — Miller Residence"
              className={fieldClass}
              autoFocus
            />
            {errors.title && <p className="mt-1 text-xs text-error-600">{errors.title}</p>}
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Describe the job, symptoms, or scope of work..."
              rows={3}
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Customer</label>
              <select
                value={form.customerId ?? ""}
                onChange={(e) => update("customerId", e.target.value || null)}
                className={fieldClass}
              >
                <option value="">No customer linked</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Scheduled date</label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Job type</label>
              <select
                value={form.jobType}
                onChange={(e) => update("jobType", e.target.value as WorkOrderJobType)}
                className={fieldClass}
              >
                {JOB_TYPES.map((j) => (
                  <option key={j.value} value={j.value}>
                    {j.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select
                value={form.priority}
                onChange={(e) => update("priority", e.target.value as WorkOrderPriority)}
                className={fieldClass}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={form.status}
                onChange={(e) => update("status", e.target.value as WorkOrderStatus)}
                className={fieldClass}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
            >
              {initial ? "Save changes" : "Create work order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
