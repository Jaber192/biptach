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
    
    // Save profile to localStorage for instant offline restore
    if (p) {
      try {
        localStorage.setItem('biptach-profile', JSON.stringify(p));
      } catch (e) {
        console.warn('Failed to cache profile to localStorage:', e);
      }
    }
    
    if (p?.company_id) {
      const c = await loadCompany(p.company_id);
      // Save company to localStorage too
      if (c) {
        try {
          localStorage.setItem('biptach-company', JSON.stringify(c));
        } catch (e) {
          console.warn('Failed to cache company to localStorage:', e);
        }
      }
    } else {
      setCompany(null);
    }
    return p;
  }

  function loadProfileOffline(uid: string, sessionUser?: any): Profile | null {
    // Try localStorage first (instant, synchronous)
    try {
      const cachedProfile = localStorage.getItem('biptach-profile');
      if (cachedProfile) {
        const p = JSON.parse(cachedProfile) as Profile;
        if (p.id === uid) {
          console.log('[Auth] Restored profile from localStorage');
          setProfile(p);
          
          // Restore company too
          const cachedCompany = localStorage.getItem('biptach-company');
          if (cachedCompany && p.company_id) {
            const c = JSON.parse(cachedCompany) as Company;
            if (c.id === p.company_id) {
              console.log('[Auth] Restored company from localStorage');
              setCompany(c);
            }
          }
          return p;
        }
      }
    } catch (e) {
      console.warn('Failed to load profile from localStorage:', e);
    }
    
    // Fallback: construct minimal profile from session data
    if (sessionUser) {
      console.log('[Auth] Profile not in localStorage, constructing fallback from session');
      const fallbackProfile: Profile = {
        id: uid,
        name: sessionUser.user_metadata?.name || sessionUser.email || 'User',
        role: 'owner',
        phone: sessionUser.phone || null,
        is_active: true,
        company_id: null,
        owner_technician_id: null,
        created_at: sessionUser.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProfile(fallbackProfile);
      return fallbackProfile;
    }
    
    return null;
  }

  useEffect(() => {
    let mounted = true;

    // Check if we're offline - if so, skip Supabase calls and load from cache
    const isOffline = !navigator.onLine;
    
    if (isOffline) {
      // When offline, try to restore session from localStorage
      try {
        const storedSession = localStorage.getItem('biptach-auth');
        console.log('[Auth] Offline mode — stored session key found:', !!storedSession);
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          console.log('[Auth] Parsed session keys:', Object.keys(parsed));
          // Supabase stores the session directly: { access_token, refresh_token, user, ... }
          if (parsed?.access_token && parsed?.user) {
            console.log('[Auth] Restoring offline session for user:', parsed.user.id);
            setSession(parsed);
            // Load profile from localStorage (instant) with session user as fallback
            loadProfileOffline(parsed.user.id, parsed.user);
          } else {
            console.warn('[Auth] Stored session missing access_token or user:', parsed);
          }
        }
      } catch (e) {
        console.error('Failed to restore offline session:', e);
      }
      setLoading(false);
      return;
    }

    // Online: normal auth flow with timeout
    const authTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth loading timed out');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        clearTimeout(authTimeout);
        (async () => {
          setSession(data.session);
          if (data.session?.user) {
            await loadProfile(data.session.user.id);
          }
          if (mounted) setLoading(false);
        })();
      })
      .catch(() => {
        if (mounted) {
          clearTimeout(authTimeout);
          setLoading(false);
        }
      });

    // Skip INITIAL_SESSION — getSession() above already restores the saved
    // session from storage. onAuthStateChange fires INITIAL_SESSION before
    // storage is read, which can arrive with null and overwrite the real
    // session, causing a false redirect to /signin on every page reload.
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "INITIAL_SESSION") return;
      (async () => {
        setSession(newSession);
        if (newSession?.user) {
          await loadProfile(newSession.user.id);
        } else {
          setProfile(null);
          setCompany(null);
        }
        if (mounted) setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      clearTimeout(authTimeout);
      listener.subscription.unsubscribe();
    };
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
    await supabase.auth.signOut({ scope: "local" });
    setProfile(null);
    setCompany(null);
  }

  async function refreshProfile(): Promise<Profile | null> {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) return null;
    return loadProfile(uid);
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, company, loading, signIn, signUpWithCompany, acceptInvitation, resetPassword, signOut, refreshProfile }}
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
