import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { WorkOrder, WorkOrderInput, WorkOrderStatus, WorkOrderPriority, WorkOrderJobType } from "../types";

type WorkOrderRow = {
  id: string;
  title: string;
  description: string | null;
  job_type: WorkOrderJobType;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  customer_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  scheduled_date: string | null;
  clock_in_time: string | null;
  clock_out_time: string | null;
  tech_notes: string | null;
  photos: string[];
  signature_storage_id: string | null;
  created_at: string;
  updated_at: string;
};

function rowToWorkOrder(row: WorkOrderRow): WorkOrder {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    jobType: row.job_type,
    priority: row.priority,
    status: row.status,
    customerId: row.customer_id,
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    scheduledDate: row.scheduled_date,
    clockInTime: row.clock_in_time,
    clockOutTime: row.clock_out_time,
    techNotes: row.tech_notes,
    photos: row.photos ?? [],
    signatureStorageId: row.signature_storage_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function inputToRow(input: WorkOrderInput): Omit<
  WorkOrderRow,
  "id" | "created_at" | "updated_at" | "clock_in_time" | "clock_out_time" | "tech_notes" | "photos" | "signature_storage_id" | "created_by"
> {
  return {
    title: input.title,
    description: input.description,
    job_type: input.jobType,
    priority: input.priority,
    status: input.status,
    customer_id: input.customerId,
    assigned_to: input.assignedTo,
    scheduled_date: input.scheduledDate,
  };
}

export function useWorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("work_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setWorkOrders([]);
    } else {
      setWorkOrders((data as WorkOrderRow[]).map(rowToWorkOrder));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const addWorkOrder = useCallback(
    async (input: WorkOrderInput): Promise<WorkOrder | null> => {
      const { data, error } = await supabase
        .from("work_orders")
        .insert(inputToRow(input))
        .select()
        .single();

      if (error) {
        setError(error.message);
        return null;
      }
      const workOrder = rowToWorkOrder(data as WorkOrderRow);
      setWorkOrders((prev) => [workOrder, ...prev]);
      return workOrder;
    },
    [],
  );

  const updateWorkOrder = useCallback(
    async (id: string, input: WorkOrderInput): Promise<void> => {
      const { data, error } = await supabase
        .from("work_orders")
        .update(inputToRow(input))
        .eq("id", id)
        .select()
        .single();

      if (error) {
        setError(error.message);
        return;
      }
      const updated = rowToWorkOrder(data as WorkOrderRow);
      setWorkOrders((prev) => prev.map((w) => (w.id === id ? updated : w)));
    },
    [],
  );

  const deleteWorkOrder = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase.from("work_orders").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setWorkOrders((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const getWorkOrder = useCallback(
    (id: string) => workOrders.find((w) => w.id === id) ?? null,
    [workOrders],
  );

  // Field actions used by the technician mobile flow.
  const patchWorkOrder = useCallback(
    async (id: string, patch: Partial<WorkOrderRow>): Promise<WorkOrder | null> => {
      const { data, error } = await supabase
        .from("work_orders")
        .update(patch)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        setError(error.message);
        return null;
      }
      const updated = rowToWorkOrder(data as WorkOrderRow);
      setWorkOrders((prev) => prev.map((w) => (w.id === id ? updated : w)));
      return updated;
    },
    [],
  );

  const clockIn = useCallback(
    (id: string) => patchWorkOrder(id, { clock_in_time: new Date().toISOString(), status: "in_progress" }),
    [patchWorkOrder],
  );

  const clockOut = useCallback(
    (id: string) => patchWorkOrder(id, { clock_out_time: new Date().toISOString() }),
    [patchWorkOrder],
  );

  const setTechNotes = useCallback(
    (id: string, techNotes: string) => patchWorkOrder(id, { tech_notes: techNotes }),
    [patchWorkOrder],
  );

  const addPhoto = useCallback(
    async (id: string, storagePath: string): Promise<void> => {
      const current = workOrders.find((w) => w.id === id);
      const next = [...(current?.photos ?? []), storagePath];
      await patchWorkOrder(id, { photos: next });
    },
    [patchWorkOrder, workOrders],
  );

  const setSignature = useCallback(
    (id: string, storageId: string) => patchWorkOrder(id, { signature_storage_id: storageId }),
    [patchWorkOrder],
  );

  const completeWorkOrder = useCallback(
    (id: string) =>
      patchWorkOrder(id, {
        status: "completed",
        clock_out_time: new Date().toISOString(),
      }),
    [patchWorkOrder],
  );

  return {
    workOrders,
    loading,
    error,
    addWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
    getWorkOrder,
    refresh: fetchWorkOrders,
    clockIn,
    clockOut,
    setTechNotes,
    addPhoto,
    setSignature,
    completeWorkOrder,
  };
}
