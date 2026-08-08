import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/app/AppShell";
import { getMyProductAccess } from "@/features/product/product-access";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [checked, setChecked] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessCheckVersion, setAccessCheckVersion] = useState(0);

  useEffect(() => {
    if (loading) return;
    let active = true;

    const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
    if (normalizedPath === "/app/io") {
      navigate({ to: "/io", replace: true });
      return () => {
        active = false;
      };
    }

    const checkAccess = async () => {
      setChecked(false);
      setAccessError(null);
      if (!user) {
        navigate({ to: "/auth" });
        return;
      }

      try {
        const access = await getMyProductAccess();
        if (!active) return;
        if (!access.communityAccess) {
          navigate({ to: "/onboarding" });
          return;
        }
        setChecked(true);
      } catch {
        if (!active) return;
        const message = "We could not verify access to your member workspace.";
        toast.error(message);
        setAccessError(message);
      }
    };

    void Promise.resolve().then(checkAccess);

    return () => {
      active = false;
    };
  }, [user, loading, navigate, pathname, accessCheckVersion]);

  if (!loading && user && accessError) {
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

  if (loading || !user || !checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
