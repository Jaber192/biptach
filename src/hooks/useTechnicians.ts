import { useCallback, useEffect, useState } from "react";
import type { Technician, TechnicianInput } from "../types";

const STORAGE_KEY = "biptach.technicians";

const TECHNICIAN_COLORS = [
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
];

const SEED_TECHNICIANS: Technician[] = [
  {
    id: "seed-tech-1",
    name: "Marcus Bell",
    phone: "(512) 555-0310",
    email: "marcus@biptach.example",
    color: TECHNICIAN_COLORS[0],
    is_active: true,
    created_at: "2026-07-01T08:00:00.000Z",
    updated_at: "2026-07-01T08:00:00.000Z",
  },
  {
    id: "seed-tech-2",
    name: "Priya Shah",
    phone: "(512) 555-0311",
    email: "priya@biptach.example",
    color: TECHNICIAN_COLORS[1],
    is_active: true,
    created_at: "2026-07-01T08:00:00.000Z",
    updated_at: "2026-07-01T08:00:00.000Z",
  },
  {
    id: "seed-tech-3",
    name: "Diego Santos",
    phone: "(512) 555-0312",
    email: "diego@biptach.example",
    color: TECHNICIAN_COLORS[2],
    is_active: true,
    created_at: "2026-07-01T08:00:00.000Z",
    updated_at: "2026-07-01T08:00:00.000Z",
  },
];

function loadFromStorage(): Technician[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_TECHNICIANS;
    const parsed = JSON.parse(raw) as Technician[];
    if (!Array.isArray(parsed)) return SEED_TECHNICIANS;
    return parsed;
  } catch {
    return SEED_TECHNICIANS;
  }
}

function saveToStorage(technicians: Technician[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(technicians));
  } catch {
    // ignore write errors
  }
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tech-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useTechnicians() {
  const [technicians, setTechnicians] = useState<Technician[]>(() => loadFromStorage());
  const [loading] = useState(false);

  useEffect(() => {
    saveToStorage(technicians);
  }, [technicians]);

  const addTechnician = useCallback((input: TechnicianInput) => {
    const now = new Date().toISOString();
    const technician: Technician = {
      ...input,
      id: makeId(),
      created_at: now,
      updated_at: now,
    };
    setTechnicians((prev) => [...prev, technician]);
    return technician;
  }, []);

  const updateTechnician = useCallback((id: string, input: TechnicianInput) => {
    setTechnicians((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...input, updated_at: new Date().toISOString() } : t,
      ),
    );
  }, []);

  const deleteTechnician = useCallback((id: string) => {
    setTechnicians((prev) => prev.filter((t) => t.id !== id));
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

export { TECHNICIAN_COLORS };
