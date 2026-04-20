import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <SiteShell>
        <div className="flex min-h-[60vh] items-center justify-center pt-24">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="pt-28">
        <Outlet />
      </div>
    </SiteShell>
  );
}
