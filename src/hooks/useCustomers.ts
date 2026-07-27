import { useCallback, useEffect, useState } from "react";
import type { Customer, CustomerInput } from "../types";

const STORAGE_KEY = "biptach.customers";

const SEED_CUSTOMERS: Customer[] = [
  {
    id: "seed-1",
    name: "Greenfield Apartments",
    email: "manager@greenfield-apt.com",
    phone: "(512) 555-0142",
    address: "1820 Oak Ridge Dr",
    city: "Austin",
    state: "TX",
    zip: "78704",
    notes: "Rooftop units serviced quarterly. Ask for Maria at the leasing office.",
    created_at: "2026-07-10T14:20:00.000Z",
    updated_at: "2026-07-10T14:20:00.000Z",
  },
  {
    id: "seed-2",
    name: "Sunrise Family Dental",
    email: "frontdesk@sunrisedental.com",
    phone: "(512) 555-0188",
    address: "4521 Lamar Blvd, Ste 200",
    city: "Austin",
    state: "TX",
    zip: "78751",
    notes: "Sensitive to noise — schedule service before 8am or after 5pm.",
    created_at: "2026-07-12T09:05:00.000Z",
    updated_at: "2026-07-12T09:05:00.000Z",
  },
  {
    id: "seed-3",
    name: "Hector Ramirez",
    email: "hramirez@example.com",
    phone: "(512) 555-0233",
    address: "309 Cedar Park Ln",
    city: "Cedar Park",
    state: "TX",
    zip: "78613",
    notes: "Residential. Two AC units, one needs a capacitor replacement.",
    created_at: "2026-07-15T11:42:00.000Z",
    updated_at: "2026-07-15T11:42:00.000Z",
  },
];

function loadFromStorage(): Customer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_CUSTOMERS;
    const parsed = JSON.parse(raw) as Customer[];
    if (!Array.isArray(parsed)) return SEED_CUSTOMERS;
    return parsed;
  } catch {
    return SEED_CUSTOMERS;
  }
}

function saveToStorage(customers: Customer[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  } catch {
    // ignore write errors (e.g. private mode)
  }
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>(() => loadFromStorage());
  const [loading] = useState(false);

  useEffect(() => {
    saveToStorage(customers);
  }, [customers]);

  const addCustomer = useCallback((input: CustomerInput) => {
    const now = new Date().toISOString();
    const customer: Customer = {
      ...input,
      id: makeId(),
      created_at: now,
      updated_at: now,
    };
    setCustomers((prev) => [customer, ...prev]);
    return customer;
  }, []);

  const updateCustomer = useCallback((id: string, input: CustomerInput) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, ...input, updated_at: new Date().toISOString() } : c,
      ),
    );
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const getCustomer = useCallback(
    (id: string) => customers.find((c) => c.id === id) ?? null,
    [customers],
  );

  return { customers, loading, addCustomer, updateCustomer, deleteCustomer, getCustomer };
}
