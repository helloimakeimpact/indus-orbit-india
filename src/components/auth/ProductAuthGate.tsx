import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import type { AuthIntent, AuthReturnPath } from "@/lib/auth-navigation";

type ProductAuthGateProps = {
  children: ReactNode;
  intent: AuthIntent;
  returnTo: AuthReturnPath;
  loadingLabel?: string;
};

/**
 * Shared identity gate for product shells. Product-specific membership and
 * entitlement checks stay inside the product boundary instead of being
 * treated as authentication.
 */
export function ProductAuthGate({
  children,
  intent,
  returnTo,
  loadingLabel = "Checking your account…",
}: ProductAuthGateProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || user) return;

    navigate({
      to: "/auth",
      search: { tab: "signin", intent, next: returnTo },
      replace: true,
    });
  }, [intent, loading, navigate, returnTo, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--indigo-night)] px-6 text-[var(--parchment)]">
        <p className="text-sm text-[var(--parchment)]/65">{loadingLabel}</p>
      </div>
    );
  }

  return children;
}
