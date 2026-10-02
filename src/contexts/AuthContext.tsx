import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { transitionConversationOutboxOwner } from "@/features/conversations/conversation-state";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** Backwards-compatible alias for the root platform administrator. */
  isAdmin: boolean;
  isAdminTeam: boolean;
  isSuperAdmin: boolean;
  adminRoles: string[];
  adminCapabilities: string[];
  hasAdminCapability: (capability: string) => boolean;
  isChapterLead: boolean;
  isMissionLead: boolean;
  userSegment: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

type AccessState = Pick<
  AuthContextValue,
  | "isAdmin"
  | "isAdminTeam"
  | "isSuperAdmin"
  | "adminRoles"
  | "adminCapabilities"
  | "isChapterLead"
  | "isMissionLead"
  | "userSegment"
>;

const emptyAccessState: AccessState = {
  isAdmin: false,
  isAdminTeam: false,
  isSuperAdmin: false,
  adminRoles: [],
  adminCapabilities: [],
  isChapterLead: false,
  isMissionLead: false,
  userSegment: null,
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getPrivateSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

async function loadAccessState(userId: string): Promise<AccessState> {
  const [adminAccessRes, profileRes, leadRes] = await Promise.all([
    supabase.rpc("get_my_admin_access"),
    supabase.from("profiles").select("orbit_segment").eq("user_id", userId).maybeSingle(),
    supabase.rpc("my_lead_summary"),
  ]);

  if (adminAccessRes.error || profileRes.error || leadRes.error) {
    throw new Error("Unable to refresh account access");
  }
  const adminAccess =
    adminAccessRes.data &&
    typeof adminAccessRes.data === "object" &&
    !Array.isArray(adminAccessRes.data)
      ? (adminAccessRes.data as Record<string, unknown>)
      : {};
  const isSuperAdmin = adminAccess.isSuperAdmin === true;
  const adminRoles = Array.isArray(adminAccess.roles)
    ? adminAccess.roles.filter((role): role is string => typeof role === "string")
    : [];
  const adminCapabilities = Array.isArray(adminAccess.capabilities)
    ? adminAccess.capabilities.filter(
        (capability): capability is string => typeof capability === "string",
      )
    : [];
  const leadSummary = leadRes.data ?? {};
  const summary = leadSummary as { chapter_lead_count?: number; mission_lead_count?: number };

  return {
    isAdmin: isSuperAdmin,
    isAdminTeam: adminAccess.isAdminTeam === true,
    isSuperAdmin,
    adminRoles,
    adminCapabilities,
    isChapterLead: (summary.chapter_lead_count ?? 0) > 0,
    isMissionLead: (summary.mission_lead_count ?? 0) > 0,
    userSegment: profileRes.data?.orbit_segment ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminTeam, setIsAdminTeam] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [adminRoles, setAdminRoles] = useState<string[]>([]);
  const [adminCapabilities, setAdminCapabilities] = useState<string[]>([]);
  const [isChapterLead, setIsChapterLead] = useState(false);
  const [isMissionLead, setIsMissionLead] = useState(false);
  const [userSegment, setUserSegment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const authenticatedOutboxOwner = useRef<string | null>(null);
  const activeUserId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    let authEventVersion = 0;
    let accessRefreshVersion = 0;

    const applyAccessState = (access: AccessState) => {
      setIsAdmin(access.isAdmin);
      setIsAdminTeam(access.isAdminTeam);
      setIsSuperAdmin(access.isSuperAdmin);
      setAdminRoles(access.adminRoles);
      setAdminCapabilities(access.adminCapabilities);
      setIsChapterLead(access.isChapterLead);
      setIsMissionLead(access.isMissionLead);
      setUserSegment(access.userSegment);
    };

    const applySession = (
      newSession: Session | null,
      deferAccessCheck: boolean,
      userProfileChanged = false,
    ) => {
      if (!active) return;
      const refreshVersion = ++accessRefreshVersion;
      const nextUserId = newSession?.user.id ?? null;
      const sameUser = nextUserId !== null && activeUserId.current === nextUserId;
      activeUserId.current = nextUserId;
      const isCurrentRefresh = () =>
        active && activeUserId.current === nextUserId && accessRefreshVersion === refreshVersion;
      authenticatedOutboxOwner.current = transitionConversationOutboxOwner(
        getPrivateSessionStorage(),
        authenticatedOutboxOwner.current,
        nextUserId,
      );
      setSession(newSession);

      if (sameUser) {
        // Token refresh and tab return must not replace an open workspace with its loading gate.
        if (userProfileChanged && newSession) setUser(newSession.user);
        const refreshAccess = () => {
          if (!isCurrentRefresh()) return;
          void loadAccessState(nextUserId)
            .then((access) => {
              if (isCurrentRefresh()) applyAccessState(access);
            })
            .catch(() => {
              // Keep the last known access projection until a later successful refresh.
            })
            .finally(() => {
              if (isCurrentRefresh()) setLoading(false);
            });
        };
        if (deferAccessCheck) setTimeout(refreshAccess, 0);
        else refreshAccess();
        return;
      }

      setUser(newSession?.user ?? null);

      if (!newSession?.user) {
        applyAccessState(emptyAccessState);
        setLoading(false);
        return;
      }

      setLoading(true);
      applyAccessState(emptyAccessState);
      const run = () => {
        if (!isCurrentRefresh()) return;
        loadAccessState(newSession.user.id)
          .then((access) => {
            if (isCurrentRefresh()) applyAccessState(access);
          })
          .catch(() => {
            if (isCurrentRefresh()) applyAccessState(emptyAccessState);
          })
          .finally(() => {
            if (isCurrentRefresh()) setLoading(false);
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
      authEventVersion += 1;
      applySession(newSession, true, event === "USER_UPDATED");
    });

    // THEN check existing session
    supabase.auth
      .getSession()
      .then(({ data: { session: existing }, error }) => {
        if (!active || authEventVersion !== 0) return;
        if (error) {
          applySession(null, false);
          return;
        }
        applySession(existing, false);
      })
      .catch(() => {
        if (active && authEventVersion === 0) applySession(null, false);
      });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isAdmin,
        isAdminTeam,
        isSuperAdmin,
        adminRoles,
        adminCapabilities,
        hasAdminCapability: (capability: string) =>
          isSuperAdmin || adminCapabilities.includes("*") || adminCapabilities.includes(capability),
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
