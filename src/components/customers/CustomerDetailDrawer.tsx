import { X, Mail, Phone, MapPin, StickyNote, Pencil } from "lucide-react";
import type { Customer } from "../../types";

interface CustomerDetailDrawerProps {
  customer: Customer | null;
  onClose: () => void;
  onEdit: (customer: Customer) => void;
}

export function CustomerDetailDrawer({ customer, onClose, onEdit }: CustomerDetailDrawerProps) {
  if (!customer) return null;

  const fullAddress = [customer.address, customer.city, customer.state, customer.zip]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-white">
              {customer.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Added {new Date(customer.created_at).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
          <DetailRow icon={Mail} label="Email" value={customer.email} />
          <DetailRow icon={Phone} label="Phone" value={customer.phone} />
          <DetailRow icon={MapPin} label="Address" value={fullAddress || null} />
          <DetailRow icon={StickyNote} label="Notes" value={customer.notes} multiline />
        </div>

        <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <button
            onClick={() => onEdit(customer)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <Pencil className="h-4 w-4" />
            Edit customer
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  multiline,
}: {
  icon: typeof Mail;
  label: string;
  value: string | null;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {value ? (
        <p
          className={`mt-1.5 text-sm text-slate-900 dark:text-slate-100 ${
            multiline ? "whitespace-pre-wrap" : ""
          }`}
        >
          {value}
        </p>
      ) : (
        <p className="mt-1.5 text-sm italic text-slate-400 dark:text-slate-500">Not provided</p>
      )}
    </div>
  );
}
