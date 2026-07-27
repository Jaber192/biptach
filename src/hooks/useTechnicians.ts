import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Technician, TechnicianInput } from "../types";

type TechnicianRow = {
  id: string;
  user_id: string;
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

function inputToRow(input: TechnicianInput): Omit<TechnicianRow, "id" | "user_id" | "created_at" | "updated_at"> {
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
      const { data, error } = await supabase
        .from("technicians")
        .select("*")
        .order("created_at", { ascending: true });

      if (!cancelled) {
        if (error) {
          console.error("Failed to load technicians:", error.message);
        }
        setTechnicians((data as TechnicianRow[] | null)?.map(rowToTechnician) ?? []);
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel("technicians-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "technicians" }, (payload) => {
        if (payload.eventType === "INSERT" && payload.new) {
          setTechnicians((prev) => [...prev, rowToTechnician(payload.new as TechnicianRow)]);
        } else if (payload.eventType === "UPDATE" && payload.new) {
          const updated = rowToTechnician(payload.new as TechnicianRow);
          setTechnicians((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        } else if (payload.eventType === "DELETE" && payload.old) {
          setTechnicians((prev) => prev.filter((t) => t.id !== (payload.old as TechnicianRow).id));
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const addTechnician = useCallback(async (input: TechnicianInput) => {
    const { data, error } = await supabase
      .from("technicians")
      .insert(inputToRow(input))
      .select("*")
      .single();
    if (error) {
      console.error("Failed to add technician:", error.message);
      return null;
    }
    return rowToTechnician(data as TechnicianRow);
  }, []);

  const updateTechnician = useCallback(async (id: string, input: TechnicianInput) => {
    const { error } = await supabase
      .from("technicians")
      .update(inputToRow(input))
      .eq("id", id);
    if (error) console.error("Failed to update technician:", error.message);
  }, []);

  const deleteTechnician = useCallback(async (id: string) => {
    const { error } = await supabase.from("technicians").delete().eq("id", id);
    if (error) console.error("Failed to delete technician:", error.message);
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
