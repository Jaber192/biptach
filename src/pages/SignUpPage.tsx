import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader as Loader2, Building2, UserPlus } from "lucide-react";
import { AuthLayout } from "../components/AuthLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

export function SignUpPage() {
  const { signUpWithCompany, acceptInvitation, session, profile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialInvite = params.get("invite") ?? "";

  // A user is "signed in without a company" when they have a session but no
  // company yet. This includes the case where the profile row is missing
  // entirely (e.g. after the DB was cleared) — profile may be null, so we only
  // require a session and no company_id.
  const signedInWithoutCompany = Boolean(session?.user && !profile?.company_id);

  const [mode, setMode] = useState<"company" | "join">(initialInvite ? "join" : "company");
  const [name, setName] = useState(profile?.name ?? session?.user?.user_metadata?.name ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [inviteCode, setInviteCode] = useState(initialInvite);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (signedInWithoutCompany) {
      if (mode === "company") {
        const { error: fnError } = await supabase.functions.invoke("create-company", {
          body: { company_name: companyName },
        });
        const errMsg = fnError?.message ?? extractEdgeError(fnError?.data);
        if (errMsg) {
          setError(errMsg);
          setSubmitting(false);
          return;
        }
      } else {
        const { error: acceptError } = await acceptInvitation(inviteCode);
        if (acceptError) {
          setError(acceptError);
          setSubmitting(false);
          return;
        }
      }
      navigate("/dashboard");
      return;
    }

    if (mode === "company") {
      const { error } = await signUpWithCompany(name, email, password, companyName);
      if (error) {
        setError(error);
        setSubmitting(false);
        return;
      }
      navigate("/dashboard");
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (signUpError) {
        setError(signUpError.message);
        setSubmitting(false);
        return;
      }
      if (!data.user) {
        setError("Failed to create account");
        setSubmitting(false);
        return;
      }
      const { error: acceptError } = await acceptInvitation(inviteCode);
      if (acceptError) {
        setError(acceptError);
        setSubmitting(false);
        return;
      }
      navigate("/dashboard");
    }
  }

  return (
    <AuthLayout
      title={signedInWithoutCompany ? "Set up your company" : "Create your account"}
      subtitle={
        signedInWithoutCompany
          ? "Create a company workspace or join an existing one."
          : "Start managing your HVAC business with Biptach."
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => setMode("company")}
          className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "company"
              ? "bg-white text-primary-700 shadow-sm dark:bg-slate-900 dark:text-primary-300"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Create Company
        </button>
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "join"
              ? "bg-white text-primary-700 shadow-sm dark:bg-slate-900 dark:text-primary-300"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <UserPlus className="h-4 w-4" />
          Join Company
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === "company" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Company name
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="Acme HVAC Services"
            />
          </div>
        )}

        {mode === "join" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Invitation code
            </label>
            <input
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="Paste your invitation code"
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Ask your company owner for an invitation link or code.
            </p>
          </div>
        )}

        {!signedInWithoutCompany && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Full name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="At least 6 characters"
              />
            </div>
          </>
        )}

        {error && (
          <p className="rounded-lg bg-error-500/10 px-3 py-2 text-sm text-error-600 dark:text-error-500">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "company" ? "Create company" : "Join company"}
        </button>
      </form>

      {!signedInWithoutCompany && (
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link to="/signin" className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400">
            Sign in
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}

function extractEdgeError(data: unknown): string | null {
  if (data && typeof data === "object" && "error" in data) {
    const msg = (data as Record<string, unknown>).error;
    return typeof msg === "string" ? msg : "Operation failed";
  }
  return null;
}
