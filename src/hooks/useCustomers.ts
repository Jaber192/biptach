import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Customer, CustomerInput } from "../types";

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function rowToCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function inputToRow(input: CustomerInput): Omit<CustomerRow, "id" | "created_at" | "updated_at" | "created_by"> {
  return {
    name: input.name,
    email: input.email,
    phone: input.phone,
    address: input.address,
    city: input.city,
    state: input.state,
    zip: input.zip,
    notes: input.notes,
  };
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setCustomers([]);
    } else {
      setCustomers((data as CustomerRow[]).map(rowToCustomer));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const addCustomer = useCallback(
    async (input: CustomerInput): Promise<Customer | null> => {
      const { data, error } = await supabase
        .from("customers")
        .insert(inputToRow(input))
        .select()
        .single();

      if (error) {
        setError(error.message);
        return null;
      }
      const customer = rowToCustomer(data as CustomerRow);
      setCustomers((prev) => [customer, ...prev]);
      return customer;
    },
    [],
  );

  const updateCustomer = useCallback(
    async (id: string, input: CustomerInput): Promise<void> => {
      const { data, error } = await supabase
        .from("customers")
        .update(inputToRow(input))
        .eq("id", id)
        .select()
        .single();

      if (error) {
        setError(error.message);
        return;
      }
      const updated = rowToCustomer(data as CustomerRow);
      setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
    },
    [],
  );

  const deleteCustomer = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const getCustomer = useCallback(
    (id: string) => customers.find((c) => c.id === id) ?? null,
    [customers],
  );

  return { customers, loading, error, addCustomer, updateCustomer, deleteCustomer, getCustomer, refresh: fetchCustomers };
}
