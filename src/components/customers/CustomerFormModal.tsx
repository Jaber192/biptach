import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Customer, CustomerInput } from "../../types";

interface CustomerFormModalProps {
  open: boolean;
  initial: Customer | null;
  onClose: () => void;
  onSubmit: (input: CustomerInput) => void;
}

const EMPTY: CustomerInput = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  notes: "",
};

export function CustomerFormModal({ open, initial, onClose, onSubmit }: CustomerFormModalProps) {
  const [form, setForm] = useState<CustomerInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerInput, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              name: initial.name,
              email: initial.email ?? "",
              phone: initial.phone ?? "",
              address: initial.address ?? "",
              city: initial.city ?? "",
              state: initial.state ?? "",
              zip: initial.zip ?? "",
              notes: initial.notes ?? "",
            }
          : EMPTY,
      );
      setErrors({});
    }
  }, [open, initial]);

  if (!open) return null;

  function update<K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof CustomerInput, string>> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Enter a valid email";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...form,
      name: form.name.trim(),
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      address: form.address?.trim() || null,
      city: form.city?.trim() || null,
      state: form.state?.trim() || null,
      zip: form.zip?.trim() || null,
      notes: form.notes?.trim() || null,
    });
  }

  const fieldClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500";
  const labelClass =
    "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {initial ? "Edit customer" : "Add new customer"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5">
          <div>
            <label className={labelClass}>Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Customer or company name"
              className={fieldClass}
              autoFocus
            />
            {errors.name && <p className="mt-1 text-xs text-error-600">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => update("email", e.target.value)}
                placeholder="name@example.com"
                className={fieldClass}
              />
              {errors.email && <p className="mt-1 text-xs text-error-600">{errors.email}</p>}
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={form.phone ?? ""}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(512) 555-0100"
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Street address</label>
            <input
              type="text"
              value={form.address ?? ""}
              onChange={(e) => update("address", e.target.value)}
              placeholder="123 Main St"
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className={labelClass}>City</label>
              <input
                type="text"
                value={form.city ?? ""}
                onChange={(e) => update("city", e.target.value)}
                placeholder="Austin"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input
                type="text"
                value={form.state ?? ""}
                onChange={(e) => update("state", e.target.value)}
                placeholder="TX"
                maxLength={2}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>ZIP</label>
              <input
                type="text"
                value={form.zip ?? ""}
                onChange={(e) => update("zip", e.target.value)}
                placeholder="78704"
                maxLength={10}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Service notes, access instructions, preferences..."
              rows={3}
              className={fieldClass}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
            >
              {initial ? "Save changes" : "Add customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
