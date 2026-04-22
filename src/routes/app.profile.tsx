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
import { SEGMENT_LIST, SEGMENT_META, type Segment, type SegmentDetails } from "@/components/auth/segments";
import { SegmentDetailsForm } from "@/components/auth/SegmentDetailsForm";
import { VerifiedBadge } from "@/components/auth/VerifiedBadge";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Your profile — Indus Orbit" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

const schema = z.object({
  display_name: z.string().trim().min(1, "Required").max(80),
  headline: z.string().trim().max(120).optional().or(z.literal("")),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  region: z.string().trim().max(80).optional().or(z.literal("")),
  timezone: z.string().trim().max(80).optional().or(z.literal("")),
  linkedin_url: z.string().trim().url("Must be a URL").max(255).optional().or(z.literal("")),
  website_url: z.string().trim().url("Must be a URL").max(255).optional().or(z.literal("")),
  orbit_segment: z.enum(SEGMENT_LIST as unknown as [Segment, ...Segment[]]).nullable(),
  is_public: z.boolean(),
});
type Form = z.infer<typeof schema>;

function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState<Form>({
    display_name: "",
    headline: "",
    bio: "",
    city: "",
    country: "",
    region: "",
    timezone: "",
    linkedin_url: "",
    website_url: "",
    orbit_segment: null,
    is_public: false,
  });
  const [details, setDetails] = useState<SegmentDetails>({});
  const [verified, setVerified] = useState(false);
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
          const d = data as Record<string, unknown>;
          setForm({
            display_name: (d.display_name as string) ?? "",
            headline: (d.headline as string) ?? "",
            bio: (d.bio as string) ?? "",
            city: (d.city as string) ?? "",
            country: (d.country as string) ?? "",
            region: (d.region as string) ?? "",
            timezone: (d.timezone as string) ?? "",
            linkedin_url: (d.linkedin_url as string) ?? "",
            website_url: (d.website_url as string) ?? "",
            orbit_segment: (d.orbit_segment as Segment | null) ?? null,
            is_public: Boolean(d.is_public),
          });
          setDetails((d.segment_details as SegmentDetails) ?? {});
          setVerified(Boolean(d.is_verified));
        }
        setLoading(false);
      });
  }, [user]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
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
        ...({ region: parsed.data.region || null, timezone: parsed.data.timezone || null, segment_details: details } as Record<string, unknown>),
      } as never)
      .eq("user_id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-3xl font-medium">Your profile</h1>
        {verified && <VerifiedBadge size="md" />}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Tell the Orbit who you are. Toggle "Public" to appear in the directory. Verification is granted by admins.
      </p>

      <form onSubmit={onSave} className="mt-8 space-y-6 rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Display name" required>
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </Field>
          <Field label="Orbit segment">
            <Select value={form.orbit_segment ?? ""} onValueChange={(v) => setForm({ ...form, orbit_segment: (v || null) as Segment | null })}>
              <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
              <SelectContent>
                {SEGMENT_LIST.map((s) => (<SelectItem key={s} value={s}>{SEGMENT_META[s].label}</SelectItem>))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Headline">
          <Input placeholder="Founder · NeoBank for India" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
        </Field>
        <Field label="Bio">
          <Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="Country"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Region"><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></Field>
          <Field label="Timezone"><Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} /></Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="LinkedIn URL"><Input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} /></Field>
          <Field label="Website URL"><Input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} /></Field>
        </div>

        {form.orbit_segment && (
          <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--saffron)]">
                {SEGMENT_META[form.orbit_segment].label} details
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Helps the Orbit connect you with the right people.</p>
            </div>
            <SegmentDetailsForm segment={form.orbit_segment} value={details} onChange={setDetails} />
          </div>
        )}

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
