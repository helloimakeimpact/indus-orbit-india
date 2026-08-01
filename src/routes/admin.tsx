import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Opening admin control plane — Indus Orbit" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminAppHandoff,
});

const adminAppUrl = import.meta.env.VITE_ADMIN_APP_URL?.trim() || "http://127.0.0.1:5175";

function AdminAppHandoff() {
  useEffect(() => {
    window.location.replace(adminAppUrl);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f1e9] p-6 text-[var(--indigo-night)]">
      <section className="w-full max-w-lg rounded-3xl border border-black/8 bg-white/70 p-8 text-center shadow-xl">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--indigo-night)] text-[var(--saffron)]">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-black/42">
          Separate operations surface
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Opening the admin control plane</h1>
        <p className="mt-3 text-sm leading-6 text-black/52">
          Administration is isolated from the member app and its conversations. If the new app does
          not open automatically, use the button below.
        </p>
        <Button className="mt-6" asChild>
          <a href={adminAppUrl}>
            Open admin app
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </section>
    </main>
  );
}
