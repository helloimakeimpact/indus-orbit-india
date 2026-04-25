import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { redeemCode } from "@/server/vouch.functions";

export const Route = createFileRoute("/redeem/$code")({
  head: () => ({ meta: [{ title: "Redeem vouch — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: RedeemPage,
});

type CodeRow = {
  id: string;
  code: string;
  issuer_id: string;
  expires_at: string;
  status: string;
};

function RedeemPage() {
  const { code } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [row, setRow] = useState<CodeRow | null>(null);
  const [issuerName, setIssuerName] = useState<string>("");
  const [busy, setBusy] = useState(true);
  const [done, setDone] = useState(false);
  const redeemFn = useServerFn(redeemCode);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("vouch_codes")
        .select("id, code, issuer_id, expires_at, status")
        .eq("code", code.toUpperCase())
        .maybeSingle();
      setRow((data as CodeRow | null) ?? null);
      if (data) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", (data as CodeRow).issuer_id)
          .maybeSingle();
        setIssuerName((prof?.display_name as string) ?? "a verified member");
      }
      setBusy(false);
    })();
  }, [code]);

  async function onRedeem() {
    try {
      await redeemFn({ data: { code: code.toUpperCase() } });
      toast.success("You're now verified.");
      setDone(true);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (busy || loading) return <div className="mx-auto max-w-lg p-10">Loading…</div>;

  return (
    <div className="mx-auto max-w-lg p-6 md:p-10">
      <div className="rounded-3xl border border-border bg-card p-8 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--saffron)]">Vouch invitation</p>
        <h1 className="mt-3 font-display text-2xl">{code.toUpperCase()}</h1>

        {!row ? (
          <p className="mt-6 text-sm text-muted-foreground">This code doesn't exist.</p>
        ) : row.status !== "active" ? (
          <p className="mt-6 text-sm text-muted-foreground">
            This code is <Badge variant="secondary">{row.status}</Badge> and can no longer be used.
          </p>
        ) : new Date(row.expires_at).getTime() < Date.now() ? (
          <p className="mt-6 text-sm text-muted-foreground">This code has expired.</p>
        ) : done ? (
          <>
            <p className="mt-6">You're verified. Welcome to the orbit.</p>
            <Button className="mt-4" onClick={() => navigate({ to: "/app" })}>Go to your dashboard</Button>
          </>
        ) : !user ? (
          <>
            <p className="mt-4 text-sm">{issuerName} has invited you. Sign in to accept.</p>
            <Button className="mt-4" asChild>
              <Link to="/auth">Sign in or create account</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm">
              <strong>{issuerName}</strong> has vouched for you. Accept to become a verified member instantly.
            </p>
            <Button className="mt-4" onClick={onRedeem}>Accept &amp; verify me</Button>
          </>
        )}
      </div>
    </div>
  );
}
