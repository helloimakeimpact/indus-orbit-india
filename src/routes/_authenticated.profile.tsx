import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [{ title: "Your profile — Indus Orbit" }, { name: "robots", content: "noindex" }],
  }),
  component: ProfilePage,
});

const SEGMENTS = ["youth", "founder", "expert", "investor", "diaspora"] as const;

const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Required").max(80),
  headline: z.string().trim().max(120).optional().or(z.literal("")),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  linkedin_url: z.string().trim().url("Must be a URL").max(255).optional().or(z.literal("")),
  website_url: z.string().trim().url("Must be a URL").max(255).optional().or(z.literal("")),
  orbit_segment: z.enum(SEGMENTS).nullable(),
  is_public: z.boolean(),
});

type ProfileForm = z.infer<typeof profileSchema>;

function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState<ProfileForm>({
    display_name: "",
    headline: "",
    bio: "",
    city: "",
    country: "",
    linkedin_url: "",
    website_url: "",
    orbit_segment: null,
    is_public: false,
  });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            display_name: data.display_name ?? "",
            headline: data.headline ?? "",
            bio: data.bio ?? "",
            city: data.city ?? "",
            country: data.country ?? "",
            linkedin_url: data.linkedin_url ?? "",
            website_url: data.website_url ?? "",
            orbit_segment: data.orbit_segment,
            is_public: data.is_public,
          });
        }
        setLoading(false);
      });
  }, [user]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: parsed.data.display_name,
        headline: parsed.data.headline || null,
        bio: parsed.data.bio || null,
        city: parsed.data.city || null,
        country: parsed.data.country || null,
        linkedin_url: parsed.data.linkedin_url || null,
        website_url: parsed.data.website_url || null,
        orbit_segment: parsed.data.orbit_segment,
        is_public: parsed.data.is_public,
      })
      .eq("user_id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl px-6 py-12 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl font-medium">Your profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tell the Orbit who you are. Your profile only appears in the public directory if you toggle it on.
      </p>

      <form onSubmit={onSave} className="mt-8 space-y-6 rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Display name" required>
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </Field>
          <Field label="Orbit segment">
            <Select
              value={form.orbit_segment ?? ""}
              onValueChange={(v) => setForm({ ...form, orbit_segment: (v || null) as ProfileForm["orbit_segment"] })}
            >
              <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
              <SelectContent>
                {SEGMENTS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Headline">
          <Input placeholder="Founder · NeoBank for India"
            value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
        </Field>
        <Field label="Bio">
          <Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="City">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="Country">
            <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="LinkedIn URL">
            <Input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} />
          </Field>
          <Field label="Website URL">
            <Input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-muted/40 p-4">
          <div>
            <p className="font-medium">Show in public directory</p>
            <p className="text-sm text-muted-foreground">Other visitors can see your profile.</p>
          </div>
          <Switch checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} />
        </div>

        <Button type="submit" disabled={busy} className="bg-[var(--indigo-night)] text-[var(--parchment)] hover:bg-[var(--indigo-night)]/90">
          {busy ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}
