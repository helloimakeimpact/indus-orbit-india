import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isChapterLead: boolean;
  isMissionLead: boolean;
  userSegment: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChapterLead, setIsChapterLead] = useState(false);
  const [isMissionLead, setIsMissionLead] = useState(false);
  const [userSegment, setUserSegment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Defer Supabase call to avoid deadlock
        setTimeout(() => {
          checkAdmin(newSession.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
        setIsChapterLead(false);
        setIsMissionLead(false);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        checkAdmin(existing.user.id);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function checkAdmin(userId: string) {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!roleData);

    const { data: profile } = await supabase
      .from("profiles")
      .select("orbit_segment")
      .eq("user_id", userId)
      .maybeSingle();
    setUserSegment(profile?.orbit_segment ?? null);

    const { data: leadSummary } = await (supabase.rpc as any)("my_lead_summary");
    const summary = (leadSummary ?? {}) as { chapter_lead_count?: number; mission_lead_count?: number };
    setIsChapterLead((summary.chapter_lead_count ?? 0) > 0);
    setIsMissionLead((summary.mission_lead_count ?? 0) > 0);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, user, isAdmin, isChapterLead, isMissionLead, userSegment, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
