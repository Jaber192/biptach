import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader as Loader2, Mail, Check } from "lucide-react";
import { AuthLayout } from "../components/AuthLayout";
import { useAuth } from "../hooks/useAuth";

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await resetPassword(email);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    setSent(true);
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a secure link to reset it."
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-100 text-accent-600 dark:bg-accent-950 dark:text-accent-400">
            <Check className="h-6 w-6" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Check your inbox for a password reset link. The link expires shortly.
          </p>
          <Link
            to="/signin"
            className="mt-2 font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="you@company.com"
              />
            </div>
          </div>
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
            Send reset link
          </button>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Remembered it?{" "}
            <Link to="/signin" className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
