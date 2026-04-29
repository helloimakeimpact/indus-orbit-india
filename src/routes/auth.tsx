import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import logo from "@/assets/indus-orbit-logo.png";
import contactImg from "@/assets/contact-rooftop.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Indus Orbit" },
      { name: "description", content: "Sign in or create your Indus Orbit member account." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    tab: s.tab === "signup" ? "signup" : "signin",
    admin: s.admin === "true" || s.admin === true,
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});

const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "Required").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const search = Route.useSearch();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/onboarding" });
    }
  }, [user, loading, navigate]);

  if (!search.admin) {
    return <RestrictedAuthView />;
  }

  return (
    <div className="min-h-screen bg-[var(--indigo-night)] text-[var(--parchment)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
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
              <Divider />
              <GoogleButton />
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <SignUpForm />
              <Divider />
              <GoogleButton />
              <p className="mt-4 text-center text-xs text-muted-foreground">
                After you sign up, we'll ask a few quick questions to set up your profile.
              </p>
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

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
      <div className="h-px flex-1 bg-border" />
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

function SignUpForm() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signUpSchema.safeParse({ displayName, email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: { display_name: parsed.data.displayName },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created. Let's set up your profile.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="su-name">Your name</Label>
        <Input id="su-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-email">Email</Label>
        <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-password">Password</Label>
        <Input id="su-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      <Button type="submit" disabled={busy} className="w-full bg-[var(--saffron)] text-[var(--indigo-night)] hover:bg-[var(--indigo-night)] hover:text-[var(--parchment)]">
        {busy ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

function GoogleButton() {
  const [busy, setBusy] = useState(false);
  async function onClick() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/onboarding` },
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

function RestrictedAuthView() {
  const [role, setRole] = useState<"Youth" | "Expert" | "Investor" | "Partner">("Youth");
  const [submitting, setSubmitting] = useState(false);
  const [num1, setNum1] = useState(Math.floor(Math.random() * 10) + 1);
  const [num2, setNum2] = useState(Math.floor(Math.random() * 10) + 1);
  const [answer, setAnswer] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (parseInt(answer) !== num1 + num2) {
      toast.error("Incorrect math answer. Are you human?");
      return;
    }
    setSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const message = formData.get("message") as string;

    const { error } = await supabase.from('contact_submissions').insert([{
      name,
      email,
      role,
      message,
      source: 'auth_restricted_page'
    }]);

    setSubmitting(false);

    if (error) {
      toast.error("Failed to send message. Please try again later.");
    } else {
      (e.target as HTMLFormElement).reset();
      setAnswer("");
      setNum1(Math.floor(Math.random() * 10) + 1);
      setNum2(Math.floor(Math.random() * 10) + 1);
      toast.success("Thanks — we'll be in touch soon.");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--indigo-night)] flex flex-col md:flex-row">
      <div className="w-full md:w-1/2 relative h-64 md:h-auto">
        <img src={contactImg} alt="Indus Orbit Rooftop" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[var(--indigo-night)] via-[var(--indigo-night)]/80 to-transparent" />
        <div className="absolute bottom-10 left-6 md:left-12 max-w-sm">
          <Link to="/" className="flex items-center gap-2 mb-6">
            <img src={logo} alt="Indus Orbit" width={32} height={32} className="invert" />
            <span className="font-display text-2xl font-semibold text-white">Indus Orbit</span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-display font-medium text-white mb-3 leading-tight">Access Restricted</h1>
          <p className="text-white/80 leading-relaxed">Indus Orbit platform access is currently invitation only. If you'd like to join the orbit as a builder, expert, or partner, please get in touch.</p>
        </div>
      </div>
      
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-md bg-[var(--parchment)] p-8 rounded-3xl shadow-2xl">
          <h2 className="text-2xl font-display font-semibold mb-6 text-foreground">Request Access</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Your name</Label>
              <Input id="name" name="name" required className="mt-1" placeholder="Aarav Sharma" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required className="mt-1" placeholder="you@domain.com" />
            </div>
            <div>
              <Label>I am a...</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["Youth", "Expert", "Investor", "Partner"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition",
                      role === r
                        ? "border-[var(--indigo-night)] bg-[var(--indigo-night)] text-[var(--parchment)]"
                        : "border-border bg-background text-foreground/70 hover:bg-foreground/5",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <textarea
                id="message"
                name="message"
                required
                rows={3}
                placeholder="Tell us what you're building or what you'd like to bring."
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div>
              <Label>Verify you're human: {num1} + {num2} = ?</Label>
              <Input
                type="number"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                required
                className="mt-1 w-24"
                placeholder="Answer"
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full mt-6 bg-[var(--indigo-night)] text-[var(--parchment)] hover:bg-[var(--indigo-night)]/90 py-6 text-base">
              {submitting ? "Sending..." : "Send to the orbit"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:underline">← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
