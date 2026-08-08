import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types";
import { Loader as Loader2 } from "lucide-react";

export function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: UserRole[];
}) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // If the session exists but the profile row is missing (e.g. the database was
  // cleared/reset, or the auto-create trigger didn't fire), do NOT spin forever.
  // Redirect to /signup so the user can create/join a company, which recreates
  // the profile row via the create-company edge function / DB trigger.
  if (!profile) {
    return <Navigate to="/signup" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(profile.role)) {
    const home = profile.role === "technician" ? "/my-jobs" : "/dashboard";
    return <Navigate to={home} replace />;
  }

  if (!profile.company_id) {
    return <Navigate to="/signup" replace />;
  }

  return <>{children}</>;
}
