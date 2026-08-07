import { useCallback, useEffect, useState } from "react";
import { User, Users, Save, Check, Shield, Loader as Loader2, Building2, Mail, Plus, Trash2, Copy, Wrench } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { TECHNICIAN_COLORS } from "../hooks/useTechnicians";
import type { Invitation, InvitationRole, Profile, UserRole } from "../types";

type ProfileRow = Profile;
type InvitationRow = Invitation;

const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  manager: "Manager",
  dispatcher: "Dispatcher",
  technician: "Technician",
};

const ROLE_STYLES: Record<UserRole, string> = {
  owner: "bg-accent-100 text-accent-700 dark:bg-accent-950 dark:text-accent-300",
  manager: "bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300",
  dispatcher: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  technician: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const INVITE_ROLES: InvitationRole[] = ["manager", "dispatcher", "technician"];

export function SettingsPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"profile" | "company" | "team" | "invitations">("profile");

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your account, company, and team members.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        <TabButton active={tab === "profile"} onClick={() => setTab("profile")} icon={User}>
          My Profile
        </TabButton>
        {profile.role === "owner" && (
          <>
            <TabButton active={tab === "company"} onClick={() => setTab("company")} icon={Building2}>
              Company
            </TabButton>
            <TabButton active={tab === "team"} onClick={() => setTab("team")} icon={Users}>
              Team
            </TabButton>
            <TabButton active={tab === "invitations"} onClick={() => setTab("invitations")} icon={Mail}>
              Invitations
            </TabButton>
          </>
        )}
      </div>

      {tab === "profile" && <ProfileSettings profile={profile} />}
      {tab === "company" && profile.role === "owner" && <CompanySettings />}
      {tab === "team" && profile.role === "owner" && <TeamManagement />}
      {tab === "invitations" && profile.role === "owner" && <InvitationManagement />}
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
      className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
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

function ProfileSettings({ profile }: { profile: Profile }) {
  const { session } = useAuth();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTechnician, setIsTechnician] = useState(!!profile.owner_technician_id);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

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

  async function handleTechnicianToggle(enabled: boolean) {
    setToggling(true);
    setToggleError(null);

    try {
      if (enabled) {
        // Check if technician record already exists
        const { data: existing, error: fetchError } = await supabase
          .from("technicians")
          .select("*")
          .eq("user_id", profile.id)
          .eq("company_id", profile.company_id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        let techId: string;
        if (existing) {
          // Reactivate existing record
          const { error: updateError } = await supabase
            .from("technicians")
            .update({ is_active: true })
            .eq("id", existing.id);
          if (updateError) throw updateError;
          techId = existing.id;
        } else {
          // Create new technician record
          const { data: newTech, error: createError } = await supabase
            .from("technicians")
            .insert({
              name: profile.name,
              email: session?.user?.email ?? null,
              phone: profile.phone,
              color: TECHNICIAN_COLORS[0],
              is_active: true,
            })
            .select("*")
            .single();
          if (createError) throw createError;
          techId = newTech.id;
        }

        // Link technician to profile
        const { error: linkError } = await supabase
          .from("profiles")
          .update({ owner_technician_id: techId })
          .eq("id", profile.id);
        if (linkError) throw linkError;

        setIsTechnician(true);
      } else {
        // Deactivate technician record
        if (profile.owner_technician_id) {
          const { error: deactivateError } = await supabase
            .from("technicians")
            .update({ is_active: false })
            .eq("id", profile.owner_technician_id);
          if (deactivateError) throw deactivateError;
        }

        // Clear the link
        const { error: unlinkError } = await supabase
          .from("profiles")
          .update({ owner_technician_id: null })
          .eq("id", profile.id);
        if (unlinkError) throw unlinkError;

        setIsTechnician(false);
      }
    } catch (err: any) {
      setToggleError(err.message || "Failed to update technician status");
    } finally {
      setToggling(false);
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

        {error && <p className="mt-4 text-sm text-error-600 dark:text-error-400">{error}</p>}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || (name === profile.name && phone === (profile.phone ?? ""))}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
          </button>
        </div>
      </div>

      {profile.role === "owner" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-100 dark:bg-accent-900">
              <Wrench className="h-5 w-5 text-accent-700 dark:text-accent-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                I also work as a technician
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Enable this to assign jobs to yourself and access the technician mobile view. You can turn this off anytime — your work history will be preserved.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {isTechnician ? "Technician mode is ON" : "Technician mode is OFF"}
            </span>
            <button
              type="button"
              onClick={() => handleTechnicianToggle(!isTechnician)}
              disabled={toggling}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                isTechnician ? "bg-primary-600" : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isTechnician ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {toggling && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Updating...</span>
            </div>
          )}

          {toggleError && (
            <p className="mt-3 text-sm text-error-600 dark:text-error-400">{toggleError}</p>
          )}
        </div>
      )}
    </form>
  );
}

function CompanySettings() {
  const { company } = useAuth();
  const [name, setName] = useState(company?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error } = await supabase.from("companies").update({ name }).eq("id", company.id);
    setSaving(false);
    if (error) setError(error.message);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  if (!company) return null;

  return (
    <form onSubmit={handleSave} className="max-w-lg space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{company.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Company workspace</p>
          </div>
        </div>
        <Field label="Company name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </Field>
        {error && <p className="mt-4 text-sm text-error-600 dark:text-error-400">{error}</p>}
        <div className="mt-6">
          <button
            type="submit"
            disabled={saving || name === company.name}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
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

    if (error) console.error("Failed to load team members:", error.message);
    setMembers((data as ProfileRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMembers();
    const channel = supabase
      .channel("profiles-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadMembers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
          <p className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No team members found.</p>
        ) : (
          members.map((m) => (
            <div key={m.id} className="flex items-center gap-4 px-6 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900 dark:text-white">{m.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{m.is_active ? "Active" : "Inactive"}</p>
              </div>
              {updatingId === m.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : (
                <>
                  <select
                    value={m.role}
                    onChange={(e) => updateRole(m.id, e.target.value as UserRole)}
                    disabled={m.role === "owner"}
                    className={`rounded-lg border-0 px-2.5 py-1.5 text-xs font-medium outline-none ring-1 ring-inset ring-slate-300 transition-colors focus:ring-2 focus:ring-primary-500/30 disabled:opacity-60 dark:ring-slate-700 dark:bg-slate-800 dark:text-white ${ROLE_STYLES[m.role]}`}
                  >
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                    <option value="dispatcher">Dispatcher</option>
                    <option value="technician">Technician</option>
                  </select>
                  {m.role !== "owner" && (
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
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function InvitationManagement() {
  const { company } = useAuth();
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitationRole>("technician");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Failed to load invitations:", error.message);
    setInvitations((data as InvitationRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;
    setCreating(true);
    setError(null);
    const { error } = await supabase
      .from("invitations")
      .insert({ company_id: company.id, email, role });
    setCreating(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEmail("");
    setRole("technician");
    loadInvitations();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("invitations").delete().eq("id", id);
    if (error) console.error("Failed to delete invitation:", error.message);
    loadInvitations();
  }

  function copyCode(code: string) {
    const link = `${window.location.origin}/signup?invite=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Invite a team member</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="teammate@company.com"
              />
            </Field>
          </div>
          <div className="sm:w-40">
            <Field label="Role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as InvitationRole)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {INVITE_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </Field>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {creating && <Loader2 className="h-4 w-4 animate-spin" />}
            Send invite
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-error-600 dark:text-error-400">{error}</p>}
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pending Invitations</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Share the invite link with your teammate. Codes expire after 7 days.
          </p>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            </div>
          ) : invitations.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No invitations yet.</p>
          ) : (
            invitations.map((inv) => (
              <div key={inv.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900 dark:text-white">{inv.email}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${ROLE_STYLES[inv.role]}`}>
                      {ROLE_LABELS[inv.role]}
                    </span>
                    {inv.accepted_by ? (
                      <span className="text-accent-600 dark:text-accent-400">Accepted</span>
                    ) : inv.expires_at < new Date().toISOString() ? (
                      <span className="text-error-600 dark:text-error-400">Expired</span>
                    ) : (
                      <span>Pending</span>
                    )}
                  </div>
                </div>
                {!inv.accepted_by && inv.expires_at >= new Date().toISOString() && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyCode(inv.invite_code)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedCode === inv.invite_code ? "Copied!" : "Copy link"}
                    </button>
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-error-500/10 hover:text-error-600 dark:hover:text-error-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
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
