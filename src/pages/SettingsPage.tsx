import { useCallback, useEffect, useState } from "react";
import { User, Users, Save, Check, Shield, Loader as Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import type { Profile, UserRole } from "../types";

type ProfileRow = Profile;

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  technician: "Technician",
};

const ROLE_STYLES: Record<UserRole, string> = {
  admin: "bg-accent-100 text-accent-700 dark:bg-accent-950 dark:text-accent-300",
  manager: "bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300",
  technician: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function SettingsPage() {
  const { profile, session } = useAuth();
  const [tab, setTab] = useState<"profile" | "team">("profile");

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your account and team members.
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        <TabButton active={tab === "profile"} onClick={() => setTab("profile")} icon={User}>
          My Profile
        </TabButton>
        {profile.role === "admin" && (
          <TabButton active={tab === "team"} onClick={() => setTab("team")} icon={Users}>
            Team Management
          </TabButton>
        )}
      </div>

      {tab === "profile" && <ProfileSettings profile={profile} session={session} />}
      {tab === "team" && profile.role === "admin" && <TeamManagement />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary-600 text-primary-700 dark:text-primary-400"
          : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function ProfileSettings({ profile, session }: { profile: Profile; session: { user: { email?: string } } | null }) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error } = await supabase
      .from("profiles")
      .update({ name, phone: phone || null })
      .eq("id", profile.id);

    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <form onSubmit={handleSave} className="max-w-lg space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-lg font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-300">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{profile.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{session?.user?.email}</p>
          </div>
          <span className={`ml-auto rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_STYLES[profile.role]}`}>
            {ROLE_LABELS[profile.role]}
          </span>
        </div>

        <div className="space-y-4">
          <Field label="Full name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </Field>

          <Field label="Phone number">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </Field>
        </div>

        {error && (
          <p className="mt-4 text-sm text-error-600 dark:text-error-400">{error}</p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || name === profile.name && phone === (profile.phone ?? "")}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}

function TeamManagement() {
  const [members, setMembers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load team members:", error.message);
    }
    setMembers((data as ProfileRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMembers();

    const channel = supabase
      .channel("profiles-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        loadMembers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMembers]);

  async function updateRole(id: string, role: UserRole) {
    setUpdatingId(id);
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    setUpdatingId(null);
    if (error) console.error("Failed to update role:", error.message);
  }

  async function toggleActive(id: string, current: boolean) {
    setUpdatingId(id);
    const { error } = await supabase.from("profiles").update({ is_active: !current }).eq("id", id);
    setUpdatingId(null);
    if (error) console.error("Failed to toggle active:", error.message);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Team Members</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage roles and access for your team. {members.length} member{members.length !== 1 ? "s" : ""} total.
        </p>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {members.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No team members found.
          </p>
        ) : (
          members.map((m) => (
            <div key={m.id} className="flex items-center gap-4 px-6 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {m.name.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900 dark:text-white">{m.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {m.is_active ? "Active" : "Inactive"}
                </p>
              </div>

              {updatingId === m.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : (
                <>
                  <select
                    value={m.role}
                    onChange={(e) => updateRole(m.id, e.target.value as UserRole)}
                    className={`rounded-lg border-0 px-2.5 py-1.5 text-xs font-medium outline-none ring-1 ring-inset ring-slate-300 transition-colors focus:ring-2 focus:ring-primary-500/30 dark:ring-slate-700 dark:bg-slate-800 dark:text-white ${ROLE_STYLES[m.role]}`}
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="technician">Technician</option>
                  </select>

                  <button
                    onClick={() => toggleActive(m.id, m.is_active)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      m.is_active
                        ? "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        : "bg-accent-600 text-white hover:bg-accent-700"
                    }`}
                  >
                    {m.is_active ? "Deactivate" : "Activate"}
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}
