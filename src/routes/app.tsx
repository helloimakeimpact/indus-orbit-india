import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/app/AppShell";
import { getMyProductAccess } from "@/features/product/product-access";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessCheckVersion, setAccessCheckVersion] = useState(0);

  useEffect(() => {
    const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
    if (normalizedPath === "/app/io") {
      navigate({ to: "/io", replace: true });
    }
  }, [navigate, pathname]);

  useEffect(() => {
    if (loading) return;
    let active = true;

    const checkAccess = async () => {
      if (!active) return;
      setAccessError(null);
      if (!userId) {
        navigate({
          to: "/auth",
          search: { tab: "signin", intent: "community", next: "/app" },
          replace: true,
        });
        return;
      }

      try {
        const access = await getMyProductAccess();
        if (!active) return;
        if (!access.communityAccess) {
          setVerifiedUserId(null);
          navigate({ to: "/onboarding" });
          return;
        }
        setVerifiedUserId(userId);
      } catch {
        if (!active) return;
        const message = "We could not verify access to your member workspace.";
        setAccessError(message);
      }
    };

    void Promise.resolve().then(checkAccess);

    return () => {
      active = false;
    };
  }, [userId, loading, navigate, accessCheckVersion]);

  useEffect(() => {
    if (!userId) return;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const revalidate = () => {
      if (document.visibilityState !== "visible" || refreshTimer !== undefined) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        setAccessCheckVersion((version) => version + 1);
      }, 0);
    };
    window.addEventListener("focus", revalidate);
    window.addEventListener("online", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    return () => {
      clearTimeout(refreshTimer);
      window.removeEventListener("focus", revalidate);
      window.removeEventListener("online", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
    };
  }, [userId]);

  const hasVerifiedAccess = userId !== null && verifiedUserId === userId;

  if (!loading && userId && !hasVerifiedAccess && accessError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">Workspace access not verified</h1>
          <p className="mt-2 text-sm text-muted-foreground">{accessError}</p>
          <button
            type="button"
            className="mt-4 rounded-xl bg-[var(--indigo-night)] px-4 py-2 text-sm font-semibold text-white"
            onClick={() => setAccessCheckVersion((version) => version + 1)}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (loading || !userId || !hasVerifiedAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      </div>
    );
  }

  return (
    <AppShell>
      {accessError && (
        <div
          className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p>We could not refresh workspace access. Your open work is still here.</p>
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            onClick={() => setAccessCheckVersion((version) => version + 1)}
          >
            Retry access check
          </button>
        </div>
      )}
      <Outlet />
    </AppShell>
  );
}
