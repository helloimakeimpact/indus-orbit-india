import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  SEGMENT_LIST,
  SEGMENT_META,
  type Segment,
  type SegmentDetails,
} from "@/components/auth/segments";
import { SegmentDetailsForm } from "@/components/auth/SegmentDetailsForm";

const locationSchema = z.object({
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

export function OnboardingWizard({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  const [segment, setSegment] = useState<Segment | null>(null);
  const [location, setLocation] = useState({ city: "", country: "", region: "" });
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
      const r = locationSchema.safeParse(location);
      if (!r.success) { toast.error(r.error.issues[0].message); return; }
    }
    setStep((s) => Math.min(totalSteps, s + 1));
  }

  async function finish() {
    const r = storySchema.safeParse(story);
    if (!r.success) { toast.error(r.error.issues[0].message); return; }
    if (!segment) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        orbit_segment: segment,
        city: location.city || null,
        country: location.country || null,
        headline: story.headline || null,
        bio: story.bio || null,
        linkedin_url: story.linkedin_url || null,
        website_url: story.website_url || null,
        ...({
          region: location.region || null,
          timezone: tz || null,
          segment_details: details,
        } as Record<string, unknown>),
      } as never)
      .eq("user_id", userId);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome to the Orbit");
    navigate({ to: "/app" });
  }

  return (
    <div className="w-full max-w-2xl rounded-3xl bg-[var(--parchment)] p-6 text-foreground shadow-2xl md:p-8">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Step {step} of {totalSteps}
        </p>
        <p className="text-xs text-muted-foreground">
          {step === 1 && "Your orbit"}
          {step === 2 && "Where you are"}
          {step === 3 && "A bit more"}
          {step === 4 && "Your story"}
        </p>
      </div>
      <Progress value={progress} className="mb-6 h-1.5 bg-foreground/10 [&>div]:bg-[var(--saffron)]" />

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-medium">Which part of the Orbit are you?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pick the one closest to you. You can change it later.</p>
          </div>
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
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-medium">Where in the world are you?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Helps us connect you locally and across borders.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City">
              <Input value={location.city} onChange={(e) => setLocation({ ...location, city: e.target.value })} />
            </Field>
            <Field label="Country">
              <Input value={location.country} onChange={(e) => setLocation({ ...location, country: e.target.value })} />
            </Field>
          </div>
          <Field label="Region (optional)">
            <Input placeholder="e.g. South Asia, North America" value={location.region} onChange={(e) => setLocation({ ...location, region: e.target.value })} />
          </Field>
          {tz && <p className="text-xs text-muted-foreground">We'll save your timezone as <span className="font-medium">{tz}</span>.</p>}
        </div>
      )}

      {step === 3 && segment && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-medium">A few questions for {SEGMENT_META[segment].label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">All optional — share what feels right.</p>
          </div>
          <SegmentDetailsForm segment={segment} value={details} onChange={setDetails} />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-medium">Tell the Orbit your story</h2>
            <p className="mt-1 text-sm text-muted-foreground">Optional — fill in what you want others to see.</p>
          </div>
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
            An Indus Orbit admin will review your profile. Verified stakeholders get a saffron badge.
          </p>
        </div>
      )}

      <div className="mt-7 flex items-center justify-between">
        <Button type="button" variant="outline" disabled={step === 1 || busy} onClick={() => setStep((s) => Math.max(1, s - 1))}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        {step < totalSteps ? (
          <Button type="button" onClick={next} className="bg-[var(--indigo-night)] text-[var(--parchment)] hover:bg-[var(--indigo-night)]/90">
            Continue <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={finish} disabled={busy} className="bg-[var(--saffron)] text-[var(--indigo-night)] hover:bg-[var(--indigo-night)] hover:text-[var(--parchment)]">
            {busy ? "Finishing…" : "Enter the Orbit"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
