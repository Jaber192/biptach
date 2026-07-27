import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { WorkOrder, WorkOrderInput } from "../types";

export type WorkOrderPatch = Partial<
  Pick<
    WorkOrder,
    "status" | "clockInTime" | "clockOutTime" | "techNotes" | "photos" | "signatureStorageId"
  >
>;

type WorkOrderRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  job_type: WorkOrder["jobType"];
  priority: WorkOrder["priority"];
  status: WorkOrder["status"];
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

function inputToRow(input: WorkOrderInput): Omit<WorkOrderRow, "id" | "user_id" | "created_at" | "updated_at" | "clock_in_time" | "clock_out_time" | "tech_notes" | "photos" | "signature_storage_id"> {
  return {
    title: input.title,
    description: input.description,
    job_type: input.jobType,
    priority: input.priority,
    status: input.status,
    customer_id: input.customerId,
    assigned_to: input.assignedTo,
    created_by: input.createdBy,
    scheduled_date: input.scheduledDate,
  };
}

function patchToRow(patch: WorkOrderPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.clockInTime !== undefined) row.clock_in_time = patch.clockInTime;
  if (patch.clockOutTime !== undefined) row.clock_out_time = patch.clockOutTime;
  if (patch.techNotes !== undefined) row.tech_notes = patch.techNotes;
  if (patch.photos !== undefined) row.photos = patch.photos;
  if (patch.signatureStorageId !== undefined) row.signature_storage_id = patch.signatureStorageId;
  return row;
}

export function useWorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("work_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!cancelled) {
        if (error) {
          console.error("Failed to load work orders:", error.message);
        }
        setWorkOrders((data as WorkOrderRow[] | null)?.map(rowToWorkOrder) ?? []);
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel("work-orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, (payload) => {
        if (payload.eventType === "INSERT" && payload.new) {
          setWorkOrders((prev) => [rowToWorkOrder(payload.new as WorkOrderRow), ...prev]);
        } else if (payload.eventType === "UPDATE" && payload.new) {
          const updated = rowToWorkOrder(payload.new as WorkOrderRow);
          setWorkOrders((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
        } else if (payload.eventType === "DELETE" && payload.old) {
          setWorkOrders((prev) => prev.filter((w) => w.id !== (payload.old as WorkOrderRow).id));
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const addWorkOrder = useCallback(async (input: WorkOrderInput) => {
    const { data, error } = await supabase
      .from("work_orders")
      .insert(inputToRow(input))
      .select("*")
      .single();
    if (error) {
      console.error("Failed to add work order:", error.message);
      return null;
    }
    return rowToWorkOrder(data as WorkOrderRow);
  }, []);

  const updateWorkOrder = useCallback(async (id: string, input: WorkOrderInput) => {
    const { error } = await supabase
      .from("work_orders")
      .update(inputToRow(input))
      .eq("id", id);
    if (error) console.error("Failed to update work order:", error.message);
  }, []);

  const patchWorkOrder = useCallback(async (id: string, patch: WorkOrderPatch) => {
    const { error } = await supabase
      .from("work_orders")
      .update(patchToRow(patch))
      .eq("id", id);
    if (error) console.error("Failed to patch work order:", error.message);
  }, []);

  const deleteWorkOrder = useCallback(async (id: string) => {
    const { error } = await supabase.from("work_orders").delete().eq("id", id);
    if (error) console.error("Failed to delete work order:", error.message);
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
