import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  ClipboardList,
  Pencil,
  Trash2,
  CalendarClock,
  User,
} from "lucide-react";
import { useWorkOrders } from "../hooks/useWorkOrders";
import { useCustomers } from "../hooks/useCustomers";
import { useTechnicians } from "../hooks/useTechnicians";
import { useNotifications } from "../hooks/useNotifications";
import { useAuth } from "../hooks/useAuth";
import { resolveCurrentTechnician, filterWorkOrdersByTechnician } from "../utils/currentTechnician";
import type { WorkOrder, WorkOrderInput, WorkOrderStatus } from "../types";
import { WorkOrderFormModal } from "../components/workorders/WorkOrderFormModal";
import { WorkOrderDetailDrawer } from "../components/workorders/WorkOrderDetailDrawer";
import {
  PRIORITY_BADGE_CLASSES,
  PRIORITY_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_DOT_CLASSES,
  STATUS_LABELS,
} from "../utils/workOrderDisplay";

const STATUS_FILTERS: { value: WorkOrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function formatScheduled(iso: string | null): string {
  if (!iso) return "Not scheduled";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Not scheduled";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function WorkOrdersPage() {
  const { workOrders, addWorkOrder, updateWorkOrder, deleteWorkOrder } = useWorkOrders();
  const { customers, getCustomer } = useCustomers();
  const { technicians } = useTechnicians();
  const { profile } = useAuth();
  const { push } = useNotifications();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<WorkOrder | null>(null);

  const isTechnician = profile?.role === "technician";

  // Technicians only see their own work history; managers/owners/dispatchers see all.
  const scopedWorkOrders = useMemo(() => {
    if (!isTechnician) return workOrders;
    const myTech = resolveCurrentTechnician(profile, technicians);
    return filterWorkOrdersByTechnician(workOrders, myTech);
  }, [workOrders, isTechnician, profile, technicians]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scopedWorkOrders.filter((w) => {
      if (statusFilter !== "all" && w.status !== statusFilter) return false;
      if (!q) return true;
      const customer = w.customerId ? getCustomer(w.customerId) : null;
      return [w.title, w.description, w.jobType, w.priority, w.status, customer?.name]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q));
    });
  }, [scopedWorkOrders, query, statusFilter, getCustomer]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(workOrder: WorkOrder) {
    setEditing(workOrder);
    setViewingId(null);
    setFormOpen(true);
  }

  // Resolve the user account of an assigned technician so job_assigned
  // notifications are delivered only to that specific technician.
  function assignedUserId(technicianId: string | null): string | null {
    if (!technicianId) return null;
    const tech = technicians.find((t) => t.id === technicianId);
    return tech?.user_id ?? null;
  }

  async function handleSubmit(input: WorkOrderInput) {
    if (editing) {
      await updateWorkOrder(editing.id, input);
      if (input.assignedTo && input.assignedTo !== editing.assignedTo) {
        push({
          type: "job_assigned",
          title: "Job reassigned",
          message: `"${input.title}" has been assigned to you.`,
          workOrderId: editing.id,
          userId: assignedUserId(input.assignedTo),
          recipientRole: "technician",
        });
      }
    } else {
      const wo = await addWorkOrder(input);
      if (wo) {
        push({
          type: "job_created",
          title: "Work order created",
          message: `"${input.title}" was created${input.assignedTo ? " and assigned" : ""}.`,
          workOrderId: wo.id,
          userId: null,
          recipientRole: "manager",
        });
        if (input.assignedTo) {
          push({
            type: "job_assigned",
            title: "New job assigned",
            message: `"${input.title}" has been assigned to you.`,
            workOrderId: wo.id,
            userId: assignedUserId(input.assignedTo),
            recipientRole: "technician",
          });
        }
      }
    }
    setFormOpen(false);
    setEditing(null);
  }

  function handleDelete() {
    if (confirmDelete) {
      deleteWorkOrder(confirmDelete.id);
      setConfirmDelete(null);
      if (viewing?.id === confirmDelete.id) setViewingId(null);
    }
  }

  const viewing = viewingId ? scopedWorkOrders.find((w) => w.id === viewingId) ?? null : null;
  const viewingCustomer = viewing?.customerId ? getCustomer(viewing.customerId) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Work Orders</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isTechnician
              ? `${scopedWorkOrders.length} ${scopedWorkOrders.length === 1 ? "work order" : "work orders"} assigned to you`
              : `${scopedWorkOrders.length} ${scopedWorkOrders.length === 1 ? "work order" : "work orders"} total`}
          </p>
        </div>
        {!isTechnician && (
          <button
            onClick={openAdd}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Create work order
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, customer, or description..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-primary-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          hasWorkOrders={scopedWorkOrders.length > 0}
          onAdd={openAdd}
          canAdd={!isTechnician}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((workOrder) => {
              const customer = workOrder.customerId ? getCustomer(workOrder.customerId) : null;
              return (
                <li
                  key={workOrder.id}
                  className="group flex cursor-pointer items-start gap-4 px-4 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  onClick={() => setViewingId(workOrder.id)}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                    <ClipboardList className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-slate-900 dark:text-white">
                        {workOrder.title}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[workOrder.status]}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_CLASSES[workOrder.status]}`} />
                        {STATUS_LABELS[workOrder.status]}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE_CLASSES[workOrder.priority]}`}
                      >
                        {PRIORITY_LABELS[workOrder.priority]}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {customer && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {customer.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {formatScheduled(workOrder.scheduledDate)}
                      </span>
                    </div>
                  </div>

                  {!isTechnician && (
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(workOrder);
                        }}
                        aria-label={`Edit ${workOrder.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete(workOrder);
                        }}
                        aria-label={`Delete ${workOrder.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-error-50 hover:text-error-600 dark:text-slate-400 dark:hover:bg-error-950 dark:hover:text-error-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <WorkOrderFormModal
        open={formOpen}
        initial={editing}
        customers={customers}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      <WorkOrderDetailDrawer
        workOrder={viewing}
        customer={viewingCustomer}
        onClose={() => setViewingId(null)}
        onEdit={isTechnician ? undefined : openEdit}
        onDelete={
          isTechnician
            ? undefined
            : (w) => {
                setViewingId(null);
                setConfirmDelete(w);
              }
        }
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete work order?</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              This will permanently remove{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {confirmDelete.title}
              </span>
              . This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-error-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-error-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({
  hasWorkOrders,
  onAdd,
  canAdd,
}: {
  hasWorkOrders: boolean;
  onAdd: () => void;
  canAdd: boolean;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
        <ClipboardList className="h-6 w-6 text-primary-600 dark:text-primary-300" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
        {hasWorkOrders ? "No matching work orders" : "No work orders yet"}
      </h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {hasWorkOrders
          ? "Try a different search or filter."
          : canAdd
            ? "Create your first work order to start dispatching jobs."
            : "You don't have any work orders assigned to you yet."}
      </p>
      {!hasWorkOrders && canAdd && (
        <button
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Create work order
        </button>
      )}
    </div>
  );
}
