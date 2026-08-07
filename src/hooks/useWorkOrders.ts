import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { indexedDBManager } from "../lib/indexeddb";
import { enqueueOperation, getCurrentUserContext, getPendingCreates, isOnline } from "../lib/offlineQueue";
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
  company_id: string;
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


function inputToRow(input: WorkOrderInput): Omit<WorkOrderRow, "id" | "user_id" | "company_id" | "created_at" | "updated_at" | "clock_in_time" | "clock_out_time" | "tech_notes" | "photos" | "signature_storage_id"> {
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

    const sortByNewest = (list: WorkOrder[]) =>
      [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    async function load() {
      // 1. Load from IndexedDB cache first (instant, works offline)
      try {
        const cached = await indexedDBManager.getAll<WorkOrderRow>("work_orders");
        if (!cancelled && cached.length > 0) {
          setWorkOrders(sortByNewest(cached.map(rowToWorkOrder)));
          setLoading(false);
        }
      } catch (e) {
        console.error("Failed to load work orders from cache:", e);
      }

      // 2. If online, fetch from Supabase and update cache
      if (isOnline()) {
        const { data, error } = await supabase
          .from("work_orders")
          .select("*")
          .order("created_at", { ascending: false });

        if (!cancelled) {
          if (error) {
            console.error("Failed to load work orders:", error.message);
          }
          const rows = (data as WorkOrderRow[] | null) ?? [];
          let merged = rows.map(rowToWorkOrder);

          // Update cache
          if (rows.length > 0) {
            await indexedDBManager.seedStore("work_orders", rows);
          }

          // Merge in pending offline creates that haven't been synced yet
          const pendingCreates = await getPendingCreates("work_orders");
          if (pendingCreates.length > 0) {
            const serverIds = new Set(rows.map(r => r.id));
            const offlineItems = pendingCreates
              .filter(op => !serverIds.has(op.data.id as string))
              .map(op => rowToWorkOrder(op.data as WorkOrderRow));
            if (offlineItems.length > 0) {
              merged = [...offlineItems, ...merged];
            }
          }

          setWorkOrders(sortByNewest(merged));
          setLoading(false);
        }
      } else if (!cancelled) {
        setLoading(false);
      }
    }

    load();

    // Real-time subscription (only works when online)
    const channel = supabase
      .channel("work-orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, (payload) => {
        if (payload.eventType === "INSERT" && payload.new) {
          const row = payload.new as WorkOrderRow;
          setWorkOrders((prev) => [rowToWorkOrder(row), ...prev]);
          indexedDBManager.add("work_orders", row).catch(() => {});
        } else if (payload.eventType === "UPDATE" && payload.new) {
          const row = payload.new as WorkOrderRow;
          const updated = rowToWorkOrder(row);
          setWorkOrders((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
          indexedDBManager.update("work_orders", row.id, row).catch(() => {});
        } else if (payload.eventType === "DELETE" && payload.old) {
          const row = payload.old as WorkOrderRow;
          setWorkOrders((prev) => prev.filter((w) => w.id !== row.id));
          indexedDBManager.delete("work_orders", row.id).catch(() => {});
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const addWorkOrder = useCallback(async (input: WorkOrderInput) => {
    if (isOnline()) {
      const { data, error } = await supabase
        .from("work_orders")
        .insert(inputToRow(input))
        .select("*")
        .single();
      if (error) {
        console.error("Failed to add work order:", error.message);
        return null;
      }
      const row = data as WorkOrderRow;
      await indexedDBManager.add("work_orders", row).catch(() => {});
      setWorkOrders((prev) => [rowToWorkOrder(row), ...prev]);
      return rowToWorkOrder(row);
    } else {
      // Offline: create locally and enqueue
      const { userId, companyId } = getCurrentUserContext();
      const tempId = crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 15);
      const now = new Date().toISOString();
      const row: WorkOrderRow = {
        id: tempId,
        user_id: userId,
        company_id: companyId,
        ...inputToRow(input),
        clock_in_time: null,
        clock_out_time: null,
        tech_notes: null,
        photos: [],
        signature_storage_id: null,
        created_at: now,
        updated_at: now,
      };
      await indexedDBManager.add("work_orders", row).catch(() => {});
      await enqueueOperation({
        type: "create",
        entity: "work_orders",
        data: row as unknown as Record<string, unknown>,
      });
      setWorkOrders((prev) => [rowToWorkOrder(row), ...prev]);
      return rowToWorkOrder(row);
    }
  }, []);

  const updateWorkOrder = useCallback(async (id: string, input: WorkOrderInput) => {
    if (isOnline()) {
      const { error } = await supabase
        .from("work_orders")
        .update(inputToRow(input))
        .eq("id", id);
      if (error) console.error("Failed to update work order:", error.message);
      else {
        const row = { id, ...inputToRow(input), updated_at: new Date().toISOString() };
        await indexedDBManager.update("work_orders", id, row).catch(() => {});
        setWorkOrders((prev) =>
          prev.map((w) => (w.id === id ? { ...w, ...input, updated_at: new Date().toISOString() } : w)),
        );
      }
    } else {
      const patch = inputToRow(input);
      await indexedDBManager.update("work_orders", id, { ...patch, updated_at: new Date().toISOString() }).catch(() => {});
      await enqueueOperation({
        type: "update",
        entity: "work_orders",
        data: { id, ...patch } as Record<string, unknown>,
      });
      setWorkOrders((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...input, updated_at: new Date().toISOString() } : w)),
      );
    }
  }, []);

  const patchWorkOrder = useCallback(async (id: string, patch: WorkOrderPatch) => {
    const rowPatch = patchToRow(patch);
    if (isOnline()) {
      const { error } = await supabase
        .from("work_orders")
        .update(rowPatch)
        .eq("id", id);
      if (error) console.error("Failed to patch work order:", error.message);
      else {
        await indexedDBManager.update("work_orders", id, { ...rowPatch, updated_at: new Date().toISOString() }).catch(() => {});
        setWorkOrders((prev) =>
          prev.map((w) => (w.id === id ? { ...w, ...patch, updated_at: new Date().toISOString() } : w)),
        );
      }
    } else {
      await indexedDBManager.update("work_orders", id, { ...rowPatch, updated_at: new Date().toISOString() }).catch(() => {});
      await enqueueOperation({
        type: "update",
        entity: "work_orders",
        data: { id, ...rowPatch } as Record<string, unknown>,
      });
      setWorkOrders((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...patch, updated_at: new Date().toISOString() } : w)),
      );
    }
  }, []);

  const deleteWorkOrder = useCallback(async (id: string) => {
    if (isOnline()) {
      const { error } = await supabase.from("work_orders").delete().eq("id", id);
      if (error) console.error("Failed to delete work order:", error.message);
      else {
        await indexedDBManager.delete("work_orders", id).catch(() => {});
        setWorkOrders((prev) => prev.filter((w) => w.id !== id));
      }
    } else {
      await indexedDBManager.delete("work_orders", id).catch(() => {});
      await enqueueOperation({
        type: "delete",
        entity: "work_orders",
        data: { id } as Record<string, unknown>,
      });
      setWorkOrders((prev) => prev.filter((w) => w.id !== id));
    }
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
