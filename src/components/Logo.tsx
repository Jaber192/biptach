import { Wind } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
        <Wind className="h-5 w-5" strokeWidth={2.5} />
      </div>
      <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
        Biptach
      </span>
    </div>
  );
}
