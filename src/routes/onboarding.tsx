import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logo from "@/assets/indus-orbit-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    supabase
      .from("profiles")
      .select("orbit_segment")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const segment = (data as { orbit_segment: string | null } | null)?.orbit_segment;
        if (segment) navigate({ to: "/app" });
        else setReady(true);
      });
  }, [user, loading, navigate]);

  if (loading || !user || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--indigo-night)] text-[var(--parchment)]">
        <p className="text-sm opacity-70">Preparing your onboarding…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--indigo-night)] px-4 py-12 text-[var(--parchment)]">
      <div className="mx-auto flex max-w-2xl flex-col items-center">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <img src={logo} alt="Indus Orbit" className="pixelated h-9 w-9" />
          <span className="font-display text-xl font-semibold">Indus Orbit</span>
        </Link>
        <OnboardingWizard userId={user.id} />
      </div>
    </div>
  );
}
