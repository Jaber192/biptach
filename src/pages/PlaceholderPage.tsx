import type { ReactNode } from "react";

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

export function WorkOrdersPage() {
  return <PlaceholderPage title="Work Orders" description="Work order management will be built in Milestone 4." />;
}

export function SchedulingPage() {
  return <PlaceholderPage title="Scheduling & Dispatch" description="Scheduling will be built in Milestone 5." />;
}

export function ReportsPage() {
  return <PlaceholderPage title="Reports & Analytics" description="Reporting will be built in Milestone 8." />;
}

export function SettingsPage() {
  return <PlaceholderPage title="Settings" description="Settings will be built in a future milestone." />;
}

export function NotFoundPage(): ReactNode {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <p className="text-6xl font-bold text-primary-600">404</p>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Page not found.</p>
      </div>
    </div>
  );
}
