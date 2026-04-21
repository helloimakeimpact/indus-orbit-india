import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logo from "@/assets/indus-orbit-logo.png";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  SEGMENT_LIST,
  SEGMENT_META,
  type Segment,
  type SegmentDetails,
} from "@/components/auth/segments";
import { SegmentDetailsForm } from "@/components/auth/SegmentDetailsForm";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Indus Orbit" },
      { name: "description", content: "Sign in or create your Indus Orbit member account." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    tab: s.tab === "signup" ? "signup" : "signin",
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});

const signUpSchema = signInSchema.extend({
  displayName: z.string().trim().min(1, "Required").max(80),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const search = Route.useSearch();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-[var(--indigo-night)] text-[var(--parchment)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <img src={logo} alt="Indus Orbit" width={36} height={36} className="h-9 w-9" />
          <span className="font-display text-xl font-semibold">Indus Orbit</span>
        </Link>

        <div className="rounded-3xl bg-[var(--parchment)] text-foreground p-8 shadow-2xl">
          <Tabs defaultValue={search.tab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Join the Orbit</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-6">
              <SignInForm />
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <GoogleButton />
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <SignUpWizard />
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--parchment)]/70">
          <Link to="/" className="hover:underline">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
  }

  async function onForgot() {
    const parsed = z.string().email().safeParse(email);
    if (!parsed.success) {
      toast.error("Enter your email above first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input id="signin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">Password</Label>
          <button type="button" onClick={onForgot} className="text-xs text-muted-foreground hover:underline">
            Forgot?
          </button>
        </div>
        <Input id="signin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" disabled={busy} className="w-full bg-[var(--indigo-night)] text-[var(--parchment)] hover:bg-[var(--indigo-night)]/90">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

const basicsSchema = z.object({
  displayName: z.string().trim().min(1, "Required").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  region: z.string().trim().max(80).optional().or(z.literal("")),
});

const storySchema = z.object({
  headline: z.string().trim().max(120).optional().or(z.literal("")),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  linkedin_url: z.string().trim().url("Must be a URL").max(255).optional().or(z.literal("")),
  website_url: z.string().trim().url("Must be a URL").max(255).optional().or(z.literal("")),
});

function SignUpWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  const [segment, setSegment] = useState<Segment | null>(null);
  const [basics, setBasics] = useState({
    displayName: "",
    email: "",
    password: "",
    city: "",
    country: "",
    region: "",
  });
  const [details, setDetails] = useState<SegmentDetails>({});
  const [story, setStory] = useState({ headline: "", bio: "", linkedin_url: "", website_url: "" });

  const tz = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ""; }
  }, []);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  function next() {
    if (step === 1 && !segment) {
      toast.error("Pick which part of the orbit you belong to");
      return;
    }
    if (step === 2) {
      const r = basicsSchema.safeParse(basics);
      if (!r.success) {
        toast.error(r.error.issues[0].message);
        return;
      }
    }
    setStep((s) => Math.min(totalSteps, s + 1));
  }

  async function submit() {
    const r = storySchema.safeParse(story);
    if (!r.success) {
      toast.error(r.error.issues[0].message);
      return;
    }
    if (!segment) return;
    setBusy(true);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: basics.email.trim(),
      password: basics.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: basics.displayName.trim() },
      },
    });
    if (signUpError) {
      setBusy(false);
      toast.error(signUpError.message);
      return;
    }
    const userId = signUpData.user?.id;
    if (userId) {
      // The handle_new_user trigger created a base profile row.
      // Update it with everything the wizard collected.
      await supabase
        .from("profiles")
        .update({
          display_name: basics.displayName.trim(),
          headline: story.headline || null,
          bio: story.bio || null,
          city: basics.city || null,
          country: basics.country || null,
          linkedin_url: story.linkedin_url || null,
          website_url: story.website_url || null,
          orbit_segment: segment,
          ...({
            region: basics.region || null,
            timezone: tz || null,
            segment_details: details,
          } as Record<string, unknown>),
        } as never)
        .eq("user_id", userId);
    }
    setBusy(false);
    toast.success("Welcome to the Orbit. Check your email if confirmation is required.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Step {step} of {totalSteps}
        </p>
        <p className="text-xs text-muted-foreground">
          {step === 1 && "Who you are"}
          {step === 2 && "Account basics"}
          {step === 3 && "Tell us more"}
          {step === 4 && "Your story"}
        </p>
      </div>
      <Progress value={progress} className="mb-7 h-1.5 bg-foreground/10 [&>div]:bg-[var(--saffron)]" />

      {step === 1 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SEGMENT_LIST.map((s) => {
            const meta = SEGMENT_META[s];
            const Icon = meta.icon;
            const active = segment === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSegment(s)}
                className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-[var(--saffron)] bg-[var(--saffron)]/10"
                    : "border-border hover:border-[var(--saffron)]/60 hover:bg-foreground/5"
                }`}
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--indigo-night)] text-[var(--parchment)]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-display text-sm font-semibold">{meta.label}</span>
                <span className="text-xs leading-snug text-muted-foreground">{meta.blurb}</span>
              </button>
            );
          })}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Field label="Your name" required>
            <Input value={basics.displayName} onChange={(e) => setBasics({ ...basics, displayName: e.target.value })} />
          </Field>
          <Field label="Email" required>
            <Input type="email" value={basics.email} onChange={(e) => setBasics({ ...basics, email: e.target.value })} />
          </Field>
          <Field label="Password" required>
            <Input type="password" value={basics.password} onChange={(e) => setBasics({ ...basics, password: e.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City">
              <Input value={basics.city} onChange={(e) => setBasics({ ...basics, city: e.target.value })} />
            </Field>
            <Field label="Country">
              <Input value={basics.country} onChange={(e) => setBasics({ ...basics, country: e.target.value })} />
            </Field>
          </div>
          <Field label="Region (optional)">
            <Input placeholder="e.g. South Asia, North America" value={basics.region} onChange={(e) => setBasics({ ...basics, region: e.target.value })} />
          </Field>
          {tz && <p className="text-xs text-muted-foreground">We'll save your timezone as <span className="font-medium">{tz}</span>.</p>}
        </div>
      )}

      {step === 3 && segment && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A few questions tuned to <span className="font-semibold text-foreground">{SEGMENT_META[segment].label}</span>. All optional — share what feels right.
          </p>
          <SegmentDetailsForm segment={segment} value={details} onChange={setDetails} />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <Field label="Headline">
            <Input placeholder="Founder · NeoBank for India" value={story.headline} onChange={(e) => setStory({ ...story, headline: e.target.value })} />
          </Field>
          <Field label="Short bio">
            <Textarea rows={4} value={story.bio} onChange={(e) => setStory({ ...story, bio: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="LinkedIn URL">
              <Input value={story.linkedin_url} onChange={(e) => setStory({ ...story, linkedin_url: e.target.value })} />
            </Field>
            <Field label="Website URL">
              <Input value={story.website_url} onChange={(e) => setStory({ ...story, website_url: e.target.value })} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            After you join, an Indus Orbit admin will review your profile. Verified stakeholders get a saffron badge.
          </p>
        </div>
      )}

      <div className="mt-7 flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={step === 1 || busy}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        {step < totalSteps ? (
          <Button type="button" onClick={next} className="bg-[var(--indigo-night)] text-[var(--parchment)] hover:bg-[var(--indigo-night)]/90">
            Continue <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={submit} disabled={busy} className="bg-[var(--saffron)] text-[var(--indigo-night)] hover:bg-[var(--indigo-night)] hover:text-[var(--parchment)]">
            {busy ? "Joining…" : "Join the Orbit"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}

function GoogleButton() {
  const [busy, setBusy] = useState(false);
  async function onClick() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      toast.error(error.message);
      setBusy(false);
    }
  }
  return (
    <Button type="button" variant="outline" disabled={busy} onClick={onClick} className="w-full">
      <svg width="18" height="18" viewBox="0 0 24 24" className="mr-2"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
      Continue with Google
    </Button>
  );
}
