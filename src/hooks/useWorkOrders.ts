import { useCallback, useEffect, useState } from "react";
import type { WorkOrder, WorkOrderInput } from "../types";

export type WorkOrderPatch = Partial<
  Pick<
    WorkOrder,
    | "status"
    | "clockInTime"
    | "clockOutTime"
    | "techNotes"
    | "photos"
    | "signatureStorageId"
  >
>;

const STORAGE_KEY = "biptach.work-orders";

const SEED_WORK_ORDERS: WorkOrder[] = [
  {
    id: "seed-wo-1",
    title: "AC Repair — Miller Residence",
    description: "Unit not cooling. Customer reports warm air and unusual noise from condenser.",
    jobType: "repair",
    priority: "high",
    status: "in_progress",
    customerId: "seed-3",
    assignedTo: "seed-tech-1",
    createdBy: null,
    scheduledDate: "2026-07-25T09:00:00.000Z",
    clockInTime: "2026-07-25T09:12:00.000Z",
    clockOutTime: null,
    techNotes: "Capacitor appears swollen. Awaiting replacement part.",
    photos: [],
    signatureStorageId: null,
    created_at: "2026-07-22T14:00:00.000Z",
    updated_at: "2026-07-25T09:12:00.000Z",
  },
  {
    id: "seed-wo-2",
    title: "Furnace Install — Oakwood Mall",
    description: "Replace old furnace with new high-efficiency unit. Coordinate with mall facilities.",
    jobType: "install",
    priority: "medium",
    status: "scheduled",
    customerId: null,
    assignedTo: "seed-tech-2",
    createdBy: null,
    scheduledDate: "2026-07-26T08:00:00.000Z",
    clockInTime: null,
    clockOutTime: null,
    techNotes: null,
    photos: [],
    signatureStorageId: null,
    created_at: "2026-07-20T10:30:00.000Z",
    updated_at: "2026-07-20T10:30:00.000Z",
  },
  {
    id: "seed-wo-3",
    title: "Quarterly Maintenance — Greenfield Apts",
    description: "Rooftop unit quarterly service. Filter replacement and system check.",
    jobType: "maintenance",
    priority: "low",
    status: "pending",
    customerId: "seed-1",
    assignedTo: "seed-tech-1",
    createdBy: null,
    scheduledDate: "2026-07-28T07:30:00.000Z",
    clockInTime: null,
    clockOutTime: null,
    techNotes: null,
    photos: [],
    signatureStorageId: null,
    created_at: "2026-07-18T11:00:00.000Z",
    updated_at: "2026-07-18T11:00:00.000Z",
  },
  {
    id: "seed-wo-4",
    title: "Emergency No-Heat — Sunrise Dental",
    description: "Office reports no heat. Sensitive to noise — service before 8am or after 5pm.",
    jobType: "emergency",
    priority: "urgent",
    status: "completed",
    customerId: "seed-2",
    assignedTo: "seed-tech-3",
    createdBy: null,
    scheduledDate: "2026-07-23T17:30:00.000Z",
    clockInTime: "2026-07-23T17:45:00.000Z",
    clockOutTime: "2026-07-23T19:10:00.000Z",
    techNotes: "Igniter failed. Replaced and verified operation. Customer satisfied.",
    photos: [],
    signatureStorageId: null,
    created_at: "2026-07-23T16:20:00.000Z",
    updated_at: "2026-07-23T19:10:00.000Z",
  },
];

function loadFromStorage(): WorkOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_WORK_ORDERS;
    const parsed = JSON.parse(raw) as WorkOrder[];
    if (!Array.isArray(parsed)) return SEED_WORK_ORDERS;
    return parsed;
  } catch {
    return SEED_WORK_ORDERS;
  }
}

function saveToStorage(workOrders: WorkOrder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workOrders));
  } catch {
    // ignore write errors (e.g. private mode)
  }
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `wo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useWorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => loadFromStorage());
  const [loading] = useState(false);

  useEffect(() => {
    saveToStorage(workOrders);
  }, [workOrders]);

  const addWorkOrder = useCallback((input: WorkOrderInput) => {
    const now = new Date().toISOString();
    const workOrder: WorkOrder = {
      ...input,
      id: makeId(),
      clockInTime: null,
      clockOutTime: null,
      techNotes: null,
      photos: [],
      signatureStorageId: null,
      created_at: now,
      updated_at: now,
    };
    setWorkOrders((prev) => [workOrder, ...prev]);
    return workOrder;
  }, []);

  const updateWorkOrder = useCallback((id: string, input: WorkOrderInput) => {
    setWorkOrders((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, ...input, updated_at: new Date().toISOString() } : w,
      ),
    );
  }, []);

  const patchWorkOrder = useCallback((id: string, patch: WorkOrderPatch) => {
    setWorkOrders((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, ...patch, updated_at: new Date().toISOString() } : w,
      ),
    );
  }, []);

  const deleteWorkOrder = useCallback((id: string) => {
    setWorkOrders((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const getWorkOrder = useCallback(
    (id: string) => workOrders.find((w) => w.id === id) ?? null,
    [workOrders],
  );

  return {
    workOrders,
    loading,
    addWorkOrder,
    updateWorkOrder,
    patchWorkOrder,
    deleteWorkOrder,
    getWorkOrder,
  };
}
