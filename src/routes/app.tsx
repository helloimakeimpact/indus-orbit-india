import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    // Onboarding gate: must have orbit_segment set
    supabase
      .from("profiles")
      .select("orbit_segment")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const segment = (data as { orbit_segment: string | null } | null)?.orbit_segment;
        if (!segment) {
          navigate({ to: "/onboarding" });
        } else {
          setChecked(true);
        }
      });
  }, [user, loading, navigate]);

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
