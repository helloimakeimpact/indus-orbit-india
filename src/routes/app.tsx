import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessCheckVersion, setAccessCheckVersion] = useState(0);

  useEffect(() => {
    if (loading) return;
    let active = true;

    const checkAccess = async () => {
      setChecked(false);
      setAccessError(null);
      if (!user) {
        navigate({ to: "/auth" });
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("orbit_segment")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        const message = "We could not verify access to your member workspace.";
        toast.error(message);
        setAccessError(message);
        return;
      }
      if (!data?.orbit_segment) {
        navigate({ to: "/onboarding" });
        return;
      }
      setChecked(true);
    };

    void Promise.resolve().then(checkAccess);

    return () => {
      active = false;
    };
  }, [user, loading, navigate, accessCheckVersion]);

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
