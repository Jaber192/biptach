import { Navigate, useLocation } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types";
import { Loader as Loader2 } from "lucide-react";
import { debugLog } from "../lib/debugBanner";

export function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: UserRole[];
}) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    debugLog(
      `ProtectedRoute — loading: ${loading} | session: ${session ? "present" : "NULL"} | profile: ${profile ? profile.role : "NULL"} | ${location.pathname}`,
      !loading && !session ? "error" : "info",
    );
  }, [loading, session, profile, location.pathname]);

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

  // Wait for profile to load before deciding — otherwise a null profile
  // (still loading) triggers a false redirect to /signup.
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
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
