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

  useEffect(() => {
    if (loading) return;
    let active = true;
    setChecked(false);

    if (!user) {
      navigate({ to: "/auth" });
      return () => {
        active = false;
      };
    }

    const userId = user.id;

    // Onboarding gate: must have orbit_segment set
    supabase
      .from("profiles")
      .select("orbit_segment")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          toast.error(error.message);
          setChecked(true);
          return;
        }
        const segment = (data as { orbit_segment: string | null } | null)?.orbit_segment;
        if (!segment) {
          navigate({ to: "/onboarding" });
        } else {
          setChecked(true);
        }
      });

    return () => {
      active = false;
    };
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
