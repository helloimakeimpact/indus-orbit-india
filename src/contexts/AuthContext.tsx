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

type AccessState = Pick<
  AuthContextValue,
  "isAdmin" | "isChapterLead" | "isMissionLead" | "userSegment"
>;

const emptyAccessState: AccessState = {
  isAdmin: false,
  isChapterLead: false,
  isMissionLead: false,
  userSegment: null,
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
    let active = true;

    const applyAccessState = (access: AccessState) => {
      setIsAdmin(access.isAdmin);
      setIsChapterLead(access.isChapterLead);
      setIsMissionLead(access.isMissionLead);
      setUserSegment(access.userSegment);
    };

    const applySession = (newSession: Session | null, deferAccessCheck: boolean) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (!newSession?.user) {
        applyAccessState(emptyAccessState);
        setLoading(false);
        return;
      }

      setLoading(true);
      applyAccessState(emptyAccessState);
      const run = () => {
        loadAccessState(newSession.user.id)
          .then((access) => {
            if (active) applyAccessState(access);
          })
          .catch(() => {
            if (active) applyAccessState(emptyAccessState);
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      };

      if (deferAccessCheck) {
        setTimeout(run, 0);
      } else {
        run();
      }
    };

    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "INITIAL_SESSION") return;
      applySession(newSession, true);
    });

    // THEN check existing session
    supabase.auth
      .getSession()
      .then(({ data: { session: existing }, error }) => {
        if (!active) return;
        if (error) {
          applySession(null, false);
          return;
        }
        applySession(existing, false);
      })
      .catch(() => {
        if (active) applySession(null, false);
      });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function loadAccessState(userId: string): Promise<AccessState> {
    const [roleRes, profileRes, leadRes] = await Promise.all([
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle(),
      supabase.from("profiles").select("orbit_segment").eq("user_id", userId).maybeSingle(),
      supabase.rpc("my_lead_summary"),
    ]);

    if (roleRes.error || profileRes.error || leadRes.error) return emptyAccessState;
    const leadSummary = leadRes.data ?? {};
    const summary = leadSummary as { chapter_lead_count?: number; mission_lead_count?: number };

    return {
      isAdmin: !!roleRes.data,
      isChapterLead: (summary.chapter_lead_count ?? 0) > 0,
      isMissionLead: (summary.mission_lead_count ?? 0) > 0,
      userSegment: profileRes.data?.orbit_segment ?? null,
    };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isAdmin,
        isChapterLead,
        isMissionLead,
        userSegment,
        loading,
        signOut,
      }}
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
