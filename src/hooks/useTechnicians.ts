import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { indexedDBManager } from "../lib/indexeddb";
import { enqueueOperation, isOnline } from "../lib/offlineQueue";
import type { Technician, TechnicianInput } from "../types";

type TechnicianRow = {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function rowToTechnician(row: TechnicianRow): Technician {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    color: row.color,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function inputToRow(input: TechnicianInput): Omit<TechnicianRow, "id" | "user_id" | "company_id" | "created_at" | "updated_at"> {
  return {
    name: input.name,
    phone: input.phone,
    email: input.email,
    color: input.color,
    is_active: input.is_active,
  };
}

export const TECHNICIAN_COLORS = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

export function useTechnicians() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Load from IndexedDB cache first
      try {
        const cached = await indexedDBManager.getAll<TechnicianRow>("technicians");
        if (!cancelled && cached.length > 0) {
          setTechnicians(cached.map(rowToTechnician));
          setLoading(false);
        }
      } catch (e) {
        console.error("Failed to load technicians from cache:", e);
      }

      // 2. If online, fetch from Supabase and update cache
      if (isOnline()) {
        const { data, error } = await supabase
          .from("technicians")
          .select("*")
          .order("created_at", { ascending: true });

        if (!cancelled) {
          if (error) {
            console.error("Failed to load technicians:", error.message);
          }
          const rows = (data as TechnicianRow[] | null) ?? [];
          setTechnicians(rows.map(rowToTechnician));
          setLoading(false);

          if (rows.length > 0) {
            await indexedDBManager.seedStore("technicians", rows);
          }
        }
      } else if (!cancelled) {
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel("technicians-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "technicians" }, (payload) => {
        if (payload.eventType === "INSERT" && payload.new) {
          const row = payload.new as TechnicianRow;
          setTechnicians((prev) => [...prev, rowToTechnician(row)]);
          indexedDBManager.add("technicians", row).catch(() => {});
        } else if (payload.eventType === "UPDATE" && payload.new) {
          const row = payload.new as TechnicianRow;
          const updated = rowToTechnician(row);
          setTechnicians((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          indexedDBManager.update("technicians", row.id, row).catch(() => {});
        } else if (payload.eventType === "DELETE" && payload.old) {
          const row = payload.old as TechnicianRow;
          setTechnicians((prev) => prev.filter((t) => t.id !== row.id));
          indexedDBManager.delete("technicians", row.id).catch(() => {});
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const addTechnician = useCallback(async (input: TechnicianInput) => {
    if (isOnline()) {
      const { data, error } = await supabase
        .from("technicians")
        .insert(inputToRow(input))
        .select("*")
        .single();
      if (error) {
        console.error("Failed to add technician:", error.message);
        return null;
      }
      const row = data as TechnicianRow;
      await indexedDBManager.add("technicians", row).catch(() => {});
      return rowToTechnician(row);
    } else {
      const tempId = crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 15);
      const now = new Date().toISOString();
      const row: TechnicianRow = {
        id: tempId,
        user_id: "",
        company_id: "",
        ...inputToRow(input),
        created_at: now,
        updated_at: now,
      };
      await indexedDBManager.add("technicians", row).catch(() => {});
      await enqueueOperation({
        type: "create",
        entity: "technicians",
        data: row as unknown as Record<string, unknown>,
      });
      setTechnicians((prev) => [...prev, rowToTechnician(row)]);
      return rowToTechnician(row);
    }
  }, []);

  const updateTechnician = useCallback(async (id: string, input: TechnicianInput) => {
    if (isOnline()) {
      const { error } = await supabase
        .from("technicians")
        .update(inputToRow(input))
        .eq("id", id);
      if (error) console.error("Failed to update technician:", error.message);
      else {
        const row = { id, ...inputToRow(input), updated_at: new Date().toISOString() };
        await indexedDBManager.update("technicians", id, row).catch(() => {});
      }
    } else {
      const patch = inputToRow(input);
      await indexedDBManager.update("technicians", id, { ...patch, updated_at: new Date().toISOString() }).catch(() => {});
      await enqueueOperation({
        type: "update",
        entity: "technicians",
        data: { id, ...patch } as Record<string, unknown>,
      });
      setTechnicians((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...input, updated_at: new Date().toISOString() } : t)),
      );
    }
  }, []);

  const deleteTechnician = useCallback(async (id: string) => {
    if (isOnline()) {
      const { error } = await supabase.from("technicians").delete().eq("id", id);
      if (error) console.error("Failed to delete technician:", error.message);
      else {
        await indexedDBManager.delete("technicians", id).catch(() => {});
      }
    } else {
      await indexedDBManager.delete("technicians", id).catch(() => {});
      await enqueueOperation({
        type: "delete",
        entity: "technicians",
        data: { id } as Record<string, unknown>,
      });
      setTechnicians((prev) => prev.filter((t) => t.id !== id));
    }
  }, []);

  const getTechnician = useCallback(
    (id: string) => technicians.find((t) => t.id === id) ?? null,
    [technicians],
  );

  return {
    technicians,
    loading,
    addTechnician,
    updateTechnician,
    deleteTechnician,
    getTechnician,
  };
}
