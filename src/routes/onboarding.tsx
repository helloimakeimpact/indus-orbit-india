import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Orbit, TerminalSquare } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/indus-orbit-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  getMyProductAccess,
  recordMyProductEvent,
  setMyMeasurementConsent,
  startMyCommunityOnboarding,
  type ProductAccess,
} from "@/features/product/product-access";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [{ title: "Community setup — Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [access, setAccess] = useState<ProductAccess | null>(null);
  const [checking, setChecking] = useState(true);
  const [starting, setStarting] = useState(false);
  const [entryMeasurementConsent, setEntryMeasurementConsent] = useState(false);

  const loadAccess = useCallback(async () => {
    setChecking(true);
    try {
      const nextAccess = await getMyProductAccess();
      if (nextAccess.communityAccess) {
        navigate({ to: "/app", replace: true });
        return;
      }
      setAccess(nextAccess);
      setEntryMeasurementConsent(nextAccess.measurementConsent);
    } catch (error) {
      toast.error((error as Error).message || "Could not confirm your product access.");
      setAccess(null);
    } finally {
      setChecking(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", search: { intent: "community", tab: "signup" } });
      return;
    }
    void Promise.resolve().then(loadAccess);
  }, [user, loading, navigate, loadAccess]);

  async function beginCommunityOnboarding() {
    if (!access) return;
    setStarting(true);
    try {
      if (entryMeasurementConsent !== access.measurementConsent) {
        await setMyMeasurementConsent(entryMeasurementConsent);
      }
      const nextAccess = await startMyCommunityOnboarding(access.communityVersion);
      setAccess(nextAccess);
      if (entryMeasurementConsent) {
        void recordMyProductEvent("community", "onboarding_started").catch(() => undefined);
      }
    } catch (error) {
      toast.error((error as Error).message || "Community setup could not be started.");
    } finally {
      setStarting(false);
    }
  }

  if (loading || !user || checking) {
    return <LoadingState label="Checking your product access…" />;
  }

  if (!access) {
    return (
      <PageFrame>
        <div className="w-full max-w-xl rounded-3xl bg-[var(--parchment)] p-7 text-center text-foreground shadow-2xl">
          <h1 className="font-display text-2xl font-semibold">Access check needs another try</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is safe. We could not load its Community state.
          </p>
          <Button className="mt-5" onClick={() => void loadAccess()}>
            Try again
          </Button>
        </div>
      </PageFrame>
    );
  }

  if (access.communityStatus === "not_started") {
    return (
      <PageFrame>
        <div className="w-full max-w-2xl rounded-3xl bg-[var(--parchment)] p-6 text-foreground shadow-2xl md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--saffron-dark)]">
            One identity, two products
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold">Choose what you want to use</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Your account already opens I/O Port. Joining the people-centred Community is a separate,
            optional choice and takes a few profile steps.
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <Link
              to="/io"
              className="group rounded-2xl border border-[var(--indigo-night)]/15 bg-[var(--indigo-night)] p-5 text-[var(--parchment)] transition hover:-translate-y-0.5"
            >
              <TerminalSquare className="h-6 w-6 text-[var(--saffron)]" />
              <h2 className="mt-4 font-display text-xl font-semibold">Use I/O Port</h2>
              <p className="mt-2 text-sm leading-5 text-[var(--parchment)]/70">
                Start with models, tools and shared compute. No Community profile is required.
              </p>
              <span className="mt-5 inline-flex items-center text-sm font-semibold text-[var(--saffron)]">
                Open I/O Port <ArrowRight className="ml-1.5 h-4 w-4" />
              </span>
            </Link>

            <button
              type="button"
              disabled={starting}
              onClick={() => void beginCommunityOnboarding()}
              className="group rounded-2xl border border-border bg-background p-5 text-left transition hover:-translate-y-0.5 hover:border-[var(--saffron)] disabled:cursor-wait disabled:opacity-60"
            >
              <Orbit className="h-6 w-6 text-[var(--saffron-dark)]" />
              <h2 className="mt-4 font-display text-xl font-semibold">Join the Community</h2>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                Create a member identity for conversations, missions, chapters and collaboration.
              </p>
              <span className="mt-5 inline-flex items-center text-sm font-semibold text-[var(--indigo-night)]">
                {starting ? "Starting…" : "Start Community setup"}
                {!starting && <ArrowRight className="ml-1.5 h-4 w-4" />}
              </span>
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-background/70 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="entry-measurement-consent"
                checked={entryMeasurementConsent}
                onCheckedChange={(checked) => setEntryMeasurementConsent(checked === true)}
              />
              <div>
                <Label htmlFor="entry-measurement-consent" className="text-sm font-semibold">
                  Help us measure whether Community setup is useful
                </Label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Optional and off by default. If enabled, we record only allowlisted start and
                  completion milestones—never profile answers, messages, location, email, IP or
                  device details. This choice does not affect either product.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            Neither option locks you in. You can join the Community later from I/O Port.
          </p>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <OnboardingWizard
        userId={user.id}
        onboardingVersion={access.communityVersion}
        initialMeasurementConsent={access.measurementConsent}
      />
    </PageFrame>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--indigo-night)] text-[var(--parchment)]">
      <p className="text-sm opacity-70">{label}</p>
    </div>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--indigo-night)] px-4 py-12 text-[var(--parchment)]">
      <div className="mx-auto flex max-w-2xl flex-col items-center">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <img src={logo} alt="Indus Orbit" className="pixelated h-9 w-9" />
          <span className="font-display text-xl font-semibold">Indus Orbit</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
