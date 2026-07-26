import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Technician, TechnicianInput } from "../types";

type TechnicianRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  color: string;
  is_active: boolean;
  user_id: string | null;
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
    user_id: row.user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function inputToRow(input: TechnicianInput): Omit<TechnicianRow, "id" | "created_at" | "updated_at"> {
  return {
    name: input.name,
    phone: input.phone,
    email: input.email,
    color: input.color,
    is_active: input.is_active,
    user_id: input.user_id,
  };
}

export function useTechnicians() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTechnicians = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("technicians")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
      setTechnicians([]);
    } else {
      setTechnicians((data as TechnicianRow[]).map(rowToTechnician));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  const addTechnician = useCallback(
    async (input: TechnicianInput): Promise<Technician | null> => {
      const { data, error } = await supabase
        .from("technicians")
        .insert(inputToRow(input))
        .select()
        .single();

      if (error) {
        setError(error.message);
        return null;
      }
      const technician = rowToTechnician(data as TechnicianRow);
      setTechnicians((prev) => [...prev, technician]);
      return technician;
    },
    [],
  );

  const updateTechnician = useCallback(
    async (id: string, input: TechnicianInput): Promise<void> => {
      const { data, error } = await supabase
        .from("technicians")
        .update(inputToRow(input))
        .eq("id", id)
        .select()
        .single();

      if (error) {
        setError(error.message);
        return;
      }
      const updated = rowToTechnician(data as TechnicianRow);
      setTechnicians((prev) => prev.map((t) => (t.id === id ? updated : t)));
    },
    [],
  );

  const deleteTechnician = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase.from("technicians").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setTechnicians((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getTechnician = useCallback(
    (id: string) => technicians.find((t) => t.id === id) ?? null,
    [technicians],
  );

  return { technicians, loading, error, addTechnician, updateTechnician, deleteTechnician, getTechnician, refresh: fetchTechnicians };
}

export const TECHNICIAN_COLORS = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];
