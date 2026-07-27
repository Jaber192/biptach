import { useMemo, useState } from "react";
import { Plus, Search, Users, Pencil, Trash2, Mail, Phone, MapPin } from "lucide-react";
import { useCustomers } from "../hooks/useCustomers";
import { useNotifications } from "../hooks/useNotifications";
import type { Customer, CustomerInput } from "../types";
import { CustomerFormModal } from "../components/customers/CustomerFormModal";
import { CustomerDetailDrawer } from "../components/customers/CustomerDetailDrawer";

export function CustomersPage() {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const { push } = useNotifications();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      return [c.name, c.email, c.phone, c.address, c.city, c.state, c.zip]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q));
    });
  }, [customers, query]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    setViewing(null);
    setFormOpen(true);
  }

  async function handleSubmit(input: CustomerInput) {
    if (editing) {
      await updateCustomer(editing.id, input);
    } else {
      const c = await addCustomer(input);
      if (c) {
        push({
          type: "customer_created",
          title: "Customer added",
          message: `"${input.name}" was added to your customers.`,
          workOrderId: null,
          recipientRole: "manager",
        });
      }
    }
    setFormOpen(false);
    setEditing(null);
  }

  function handleDelete() {
    if (confirmDelete) {
      deleteCustomer(confirmDelete.id);
      setConfirmDelete(null);
      if (viewing?.id === confirmDelete.id) setViewing(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customers</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {customers.length} {customers.length === 1 ? "customer" : "customers"} in your account
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Add customer
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone, email, or address..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasCustomers={customers.length > 0} onAdd={openAdd} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((customer) => (
              <li
                key={customer.id}
                className="group flex cursor-pointer items-start gap-4 px-4 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                onClick={() => setViewing(customer)}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                  {customer.name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 dark:text-white">
                    {customer.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {customer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </span>
                    )}
                    {customer.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {customer.email}
                      </span>
                    )}
                    {(customer.city || customer.state) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[customer.city, customer.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(customer);
                    }}
                    aria-label={`Edit ${customer.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(customer);
                    }}
                    aria-label={`Delete ${customer.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-error-50 hover:text-error-600 dark:text-slate-400 dark:hover:bg-error-950 dark:hover:text-error-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CustomerFormModal
        open={formOpen}
        initial={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      <CustomerDetailDrawer
        customer={viewing}
        onClose={() => setViewing(null)}
        onEdit={openEdit}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete customer?</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              This will permanently remove{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {confirmDelete.name}
              </span>{" "}
              from your customers. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-error-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-error-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasCustomers, onAdd }: { hasCustomers: boolean; onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
        <Users className="h-6 w-6 text-primary-600 dark:text-primary-300" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
        {hasCustomers ? "No matching customers" : "No customers yet"}
      </h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {hasCustomers
          ? "Try a different search term."
          : "Add your first customer to start creating work orders."}
      </p>
      {!hasCustomers && (
        <button
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Add customer
        </button>
      )}
    </div>
  );
}
