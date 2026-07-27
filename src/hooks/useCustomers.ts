import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Customer, CustomerInput } from "../types";

type CustomerRow = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
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

function inputToRow(input: CustomerInput): Omit<CustomerRow, "id" | "user_id" | "created_at" | "updated_at"> {
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (!cancelled) {
        if (error) {
          console.error("Failed to load customers:", error.message);
        }
        setCustomers((data as CustomerRow[] | null)?.map(rowToCustomer) ?? []);
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel("customers-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, (payload) => {
        if (payload.eventType === "INSERT" && payload.new) {
          setCustomers((prev) => [rowToCustomer(payload.new as CustomerRow), ...prev]);
        } else if (payload.eventType === "UPDATE" && payload.new) {
          const updated = rowToCustomer(payload.new as CustomerRow);
          setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        } else if (payload.eventType === "DELETE" && payload.old) {
          setCustomers((prev) => prev.filter((c) => c.id !== (payload.old as CustomerRow).id));
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const addCustomer = useCallback(async (input: CustomerInput) => {
    const { data, error } = await supabase
      .from("customers")
      .insert(inputToRow(input))
      .select("*")
      .single();
    if (error) {
      console.error("Failed to add customer:", error.message);
      return null;
    }
    return rowToCustomer(data as CustomerRow);
  }, []);

  const updateCustomer = useCallback(async (id: string, input: CustomerInput) => {
    const { error } = await supabase
      .from("customers")
      .update(inputToRow(input))
      .eq("id", id);
    if (error) console.error("Failed to update customer:", error.message);
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) console.error("Failed to delete customer:", error.message);
  }, []);

  const getCustomer = useCallback(
    (id: string) => customers.find((c) => c.id === id) ?? null,
    [customers],
  );

  return { customers, loading, addCustomer, updateCustomer, deleteCustomer, getCustomer };
}
