import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { indexedDBManager } from "../lib/indexeddb";
import { enqueueOperation, getCurrentUserContext, getPendingCreates, isOnline } from "../lib/offlineQueue";
import { debugLog } from "../lib/debugBanner";
import type { Customer, CustomerInput } from "../types";

type CustomerRow = {
  id: string;
  user_id: string;
  company_id: string;
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

function inputToRow(input: CustomerInput): Omit<CustomerRow, "id" | "user_id" | "company_id" | "created_at" | "updated_at"> {
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
      const sortByNewest = (list: Customer[]) =>
        [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      let hadCache = false;

      // 1. Load from IndexedDB cache first
      try {
        const cached = await indexedDBManager.getAll<CustomerRow>("customers");
        if (!cancelled && cached.length > 0) {
          hadCache = true;
          setCustomers(sortByNewest(cached.map(rowToCustomer)));
          setLoading(false);
        }
      } catch (e) {
        console.error("Failed to load customers from cache:", e);
      }

      // 2. If online, fetch from Supabase and update cache
      if (isOnline()) {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .order("created_at", { ascending: false });

        if (!cancelled) {
          if (error) {
            // Transient failure: keep cached data instead of wiping the list.
            debugLog(`fetch customers FAILED: ${error.message} — keeping cached data`, "warn");
            setLoading(false);
            return;
          }

          const rows = (data as CustomerRow[] | null) ?? [];

          // Never wipe good cached data with an empty server response
          // (transient issue, e.g. expired JWT → RLS returns 0 rows).
          if (rows.length === 0 && hadCache) {
            debugLog("fetch customers returned EMPTY but cache has data — keeping cache", "warn");
            setLoading(false);
            return;
          }

          let merged = rows.map(rowToCustomer);

          if (rows.length > 0) {
            await indexedDBManager.seedStore("customers", rows);
          }

          // Merge in pending offline creates that haven't been synced yet
          const pendingCreates = await getPendingCreates("customers");
          if (pendingCreates.length > 0) {
            const serverIds = new Set(rows.map(r => r.id));
            const offlineItems = pendingCreates
              .filter(op => !serverIds.has(op.data.id as string))
              .map(op => rowToCustomer(op.data as CustomerRow));
            if (offlineItems.length > 0) {
              merged = [...offlineItems, ...merged];
            }
          }

          setCustomers(sortByNewest(merged));
          setLoading(false);
        }
      } else if (!cancelled) {
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel("customers-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, (payload) => {
        if (payload.eventType === "INSERT" && payload.new) {
          const row = payload.new as CustomerRow;
          setCustomers((prev) => [rowToCustomer(row), ...prev]);
          indexedDBManager.add("customers", row).catch(() => {});
        } else if (payload.eventType === "UPDATE" && payload.new) {
          const row = payload.new as CustomerRow;
          const updated = rowToCustomer(row);
          setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          indexedDBManager.update("customers", row.id, row).catch(() => {});
        } else if (payload.eventType === "DELETE" && payload.old) {
          const row = payload.old as CustomerRow;
          setCustomers((prev) => prev.filter((c) => c.id !== row.id));
          indexedDBManager.delete("customers", row.id).catch(() => {});
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const addCustomer = useCallback(async (input: CustomerInput) => {
    if (isOnline()) {
      const { data, error } = await supabase
        .from("customers")
        .insert(inputToRow(input))
        .select("*")
        .single();
      if (error) {
        console.error("Failed to add customer:", error.message);
        return null;
      }
      const row = data as CustomerRow;
      await indexedDBManager.add("customers", row).catch(() => {});
      setCustomers((prev) => [rowToCustomer(row), ...prev]);
      return rowToCustomer(row);
    } else {
      const { userId, companyId } = getCurrentUserContext();
      const tempId = crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 15);
      const now = new Date().toISOString();
      const row: CustomerRow = {
        id: tempId,
        user_id: userId,
        company_id: companyId,
        ...inputToRow(input),
        created_at: now,
        updated_at: now,
      };
      await indexedDBManager.add("customers", row).catch(() => {});
      await enqueueOperation({
        type: "create",
        entity: "customers",
        data: row as unknown as Record<string, unknown>,
      });
      setCustomers((prev) => [rowToCustomer(row), ...prev]);
      return rowToCustomer(row);
    }
  }, []);

  const updateCustomer = useCallback(async (id: string, input: CustomerInput) => {
    if (isOnline()) {
      const { error } = await supabase
        .from("customers")
        .update(inputToRow(input))
        .eq("id", id);
      if (error) console.error("Failed to update customer:", error.message);
      else {
        const row = { id, ...inputToRow(input), updated_at: new Date().toISOString() };
        await indexedDBManager.update("customers", id, row).catch(() => {});
        setCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...input, updated_at: new Date().toISOString() } : c)),
        );
      }
    } else {
      const patch = inputToRow(input);
      await indexedDBManager.update("customers", id, { ...patch, updated_at: new Date().toISOString() }).catch(() => {});
      await enqueueOperation({
        type: "update",
        entity: "customers",
        data: { id, ...patch } as Record<string, unknown>,
      });
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...input, updated_at: new Date().toISOString() } : c)),
      );
    }
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    if (isOnline()) {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) console.error("Failed to delete customer:", error.message);
      else {
        await indexedDBManager.delete("customers", id).catch(() => {});
        setCustomers((prev) => prev.filter((c) => c.id !== id));
      }
    } else {
      await indexedDBManager.delete("customers", id).catch(() => {});
      await enqueueOperation({
        type: "delete",
        entity: "customers",
        data: { id } as Record<string, unknown>,
      });
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    }
  }, []);

  const getCustomer = useCallback(
    (id: string) => customers.find((c) => c.id === id) ?? null,
    [customers],
  );

  return { customers, loading, addCustomer, updateCustomer, deleteCustomer, getCustomer };
}
