import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import type { AuthContextValue, Company, Profile } from "../types";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function extractEdgeError(data: unknown): string | null {
  if (data && typeof data === "object" && "error" in data) {
    const msg = (data as Record<string, unknown>).error;
    return typeof msg === "string" ? msg : "Operation failed";
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthContextValue["session"]>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadCompany(companyId: string | null): Promise<Company | null> {
    if (!companyId) {
      setCompany(null);
      return null;
    }
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .maybeSingle();
    if (error) {
      console.error("Failed to load company:", error.message);
      setCompany(null);
      return null;
    }
    const c = data as Company | null;
    setCompany(c);
    return c;
  }

  async function loadProfile(uid: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (error) {
      console.error("Failed to load profile:", error.message);
      setProfile(null);
      setCompany(null);
      return null;
    }
    const p = data as Profile | null;
    setProfile(p);
    if (p?.company_id) {
      await loadCompany(p.company_id);
    } else {
      setCompany(null);
    }
    return p;
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        setSession(newSession);
        if (newSession?.user) {
          await loadProfile(newSession.user.id);
        } else {
          setProfile(null);
          setCompany(null);
        }
      })();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUpWithCompany(name: string, email: string, password: string, companyName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Failed to create account" };

    // Wait for the profile row (created by the DB trigger)
    let p: Profile | null = null;
    for (let i = 0; i < 10; i++) {
      const { data: row } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();
      p = row as Profile | null;
      if (p) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!p) return { error: "Profile was not created" };

    // Create the company via edge function (sets role=owner + company_id)
    const fnResponse = await supabase.functions.invoke("create-company", {
      body: { company_name: companyName },
    });
    const fnError = fnResponse.error ?? extractEdgeError(fnResponse.data);
    if (fnError) return { error: fnError };

    await loadProfile(data.user.id);
    return { error: null };
  }

  async function acceptInvitation(inviteCode: string) {
    const fnResponse = await supabase.functions.invoke("accept-invitation", {
      body: { invite_code: inviteCode },
    });
    const fnError = fnResponse.error ?? extractEdgeError(fnResponse.data);
    if (fnError) return { error: fnError };

    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (uid) await loadProfile(uid);
    return { error: null };
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setCompany(null);
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, company, loading, signIn, signUpWithCompany, acceptInvitation, resetPassword, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
