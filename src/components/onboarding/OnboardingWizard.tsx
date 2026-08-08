import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Globe2, LockKeyhole, MapPinOff, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  SEGMENT_LIST,
  SEGMENT_META,
  type Segment,
  type SegmentDetails,
} from "@/components/auth/segments";
import { SegmentDetailsForm } from "@/components/auth/SegmentDetailsForm";
import {
  listGlobalCountries,
  setMyCommunityLocation,
  type CountryOption,
} from "@/features/location/location-client";
import {
  completeMyCommunityOnboarding,
  recordMyProductEvent,
  setMyMeasurementConsent,
} from "@/features/product/product-access";
import { redeemCode } from "@/server/vouch.functions";

const locationSchema = z.object({
  countryCode: z.string().length(2, "Choose a country"),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  region: z.string().trim().max(120).optional().or(z.literal("")),
});

const storySchema = z.object({
  headline: z.string().trim().max(120).optional().or(z.literal("")),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  linkedin_url: z.string().trim().url("Must be a URL").max(255).optional().or(z.literal("")),
  website_url: z.string().trim().url("Must be a URL").max(255).optional().or(z.literal("")),
});

type LocationMode = "skip" | "private" | "members";

type OnboardingWizardProps = {
  userId: string;
  onboardingVersion: number;
  initialMeasurementConsent: boolean;
};

export function OnboardingWizard({
  userId,
  onboardingVersion,
  initialMeasurementConsent,
}: OnboardingWizardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countryError, setCountryError] = useState<string | null>(null);

  const [segment, setSegment] = useState<Segment | null>(null);
  const [locationMode, setLocationMode] = useState<LocationMode>("skip");
  const [location, setLocation] = useState({ countryCode: "", city: "", region: "" });
  const [useForScheduling, setUseForScheduling] = useState(false);
  const [useForRecommendations, setUseForRecommendations] = useState(false);
  const [measurementConsent, setMeasurementConsent] = useState(initialMeasurementConsent);
  const [details, setDetails] = useState<SegmentDetails>({});
  const [story, setStory] = useState({ headline: "", bio: "", linkedin_url: "", website_url: "" });
  const [vouchCode, setVouchCode] = useState("");

  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function loadCountries() {
      setCountriesLoading(true);
      setCountryError(null);
      try {
        const options = await listGlobalCountries();
        if (active) setCountries(options);
      } catch {
        if (active) setCountryError("The global country list could not be loaded.");
      } finally {
        if (active) setCountriesLoading(false);
      }
    }
    void loadCountries();
    return () => {
      active = false;
    };
  }, []);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  function next() {
    if (step === 1 && !segment) {
      toast.error("Pick which part of the orbit you belong to");
      return;
    }
    if (step === 2 && locationMode !== "skip") {
      const result = locationSchema.safeParse(location);
      if (!result.success) {
        toast.error(result.error.issues[0].message);
        return;
      }
    }
    setStep((current) => Math.min(totalSteps, current + 1));
  }

  async function finish() {
    const result = storySchema.safeParse(story);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    if (!segment) return;

    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          orbit_segment: segment,
          headline: story.headline || null,
          bio: story.bio || null,
          linkedin_url: story.linkedin_url || null,
          website_url: story.website_url || null,
          ...({ segment_details: details } as Record<string, unknown>),
        } as never)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);

      if (locationMode !== "skip") {
        await setMyCommunityLocation({
          countryCode: location.countryCode,
          regionLabel: location.region || undefined,
          cityLabel: location.city || undefined,
          timezoneName: useForScheduling ? timezone : undefined,
          useForScheduling,
          useForRecommendations,
          shareAudience: locationMode === "members" ? "members" : null,
          sharePrecision: locationMode === "members" ? "country" : null,
          consentVersion: "community-location-v1",
        });
      }

      if (measurementConsent !== initialMeasurementConsent) {
        await setMyMeasurementConsent(measurementConsent);
      }

      await completeMyCommunityOnboarding(onboardingVersion);

      if (measurementConsent) {
        void recordMyProductEvent("community", "onboarding_completed").catch(() => undefined);
      }

      if (vouchCode.trim().length >= 6) {
        try {
          await redeemCode(vouchCode.trim());
          toast.success("Welcome to the Orbit! Your vouch code was redeemed.");
        } catch (error) {
          toast.error(`Community joined, but vouch code failed: ${(error as Error).message}`);
        }
      } else {
        toast.success("Welcome to the Orbit");
      }

      navigate({ to: "/app" });
    } catch (error) {
      toast.error((error as Error).message || "Community setup could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-2xl rounded-3xl bg-[var(--parchment)] p-6 text-foreground shadow-2xl md:p-8">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Step {step} of {totalSteps}
        </p>
        <p className="text-xs text-muted-foreground">
          {step === 1 && "Your orbit"}
          {step === 2 && "Location choices"}
          {step === 3 && "A bit more"}
          {step === 4 && "Your story"}
        </p>
      </div>
      <Progress
        value={progress}
        className="mb-6 h-1.5 bg-foreground/10 [&>div]:bg-[var(--saffron)]"
      />

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-medium">Which part of the Orbit are you?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick the one closest to you. You can change it later.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SEGMENT_LIST.map((option) => {
              const meta = SEGMENT_META[option];
              const Icon = meta.icon;
              const active = segment === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSegment(option)}
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
        <LocationStep
          mode={locationMode}
          setMode={setLocationMode}
          location={location}
          setLocation={setLocation}
          countries={countries}
          countriesLoading={countriesLoading}
          countryError={countryError}
          timezone={timezone}
          useForScheduling={useForScheduling}
          setUseForScheduling={setUseForScheduling}
          useForRecommendations={useForRecommendations}
          setUseForRecommendations={setUseForRecommendations}
        />
      )}

      {step === 3 && segment && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-medium">
              A few questions for {SEGMENT_META[segment].label}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              All optional — share what feels right.
            </p>
          </div>
          <SegmentDetailsForm segment={segment} value={details} onChange={setDetails} />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl font-medium">Tell the Orbit your story</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Optional — fill in what you want other members to see.
            </p>
          </div>
          <Field label="Headline">
            <Input
              placeholder="Founder · NeoBank for India"
              value={story.headline}
              onChange={(event) => setStory({ ...story, headline: event.target.value })}
            />
          </Field>
          <Field label="Short bio">
            <Textarea
              rows={4}
              value={story.bio}
              onChange={(event) => setStory({ ...story, bio: event.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="LinkedIn URL">
              <Input
                value={story.linkedin_url}
                onChange={(event) => setStory({ ...story, linkedin_url: event.target.value })}
              />
            </Field>
            <Field label="Website URL">
              <Input
                value={story.website_url}
                onChange={(event) => setStory({ ...story, website_url: event.target.value })}
              />
            </Field>
          </div>

          <div className="border-t border-border pt-4">
            <Field label="Have a Vouch Code? (Optional)">
              <Input
                placeholder="e.g. A1B2C3D4"
                value={vouchCode}
                onChange={(event) => setVouchCode(event.target.value.toUpperCase())}
                className="uppercase"
              />
            </Field>
          </div>

          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="measurement-consent"
                checked={measurementConsent}
                onCheckedChange={(checked) => setMeasurementConsent(checked === true)}
              />
              <div>
                <Label htmlFor="measurement-consent" className="text-sm font-semibold">
                  Help improve the product with limited usage measurement
                </Label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Optional and off by default. We record only allowlisted product milestones—not
                  prompts, messages, location, email, IP address or device details. You can revoke
                  this later.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-7 flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={step === 1 || busy}
          onClick={() => setStep((current) => Math.max(1, current - 1))}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        {step < totalSteps ? (
          <Button
            type="button"
            onClick={next}
            className="bg-[var(--indigo-night)] text-[var(--parchment)] hover:bg-[var(--indigo-night)]/90"
          >
            Continue <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => void finish()}
            disabled={busy}
            className="bg-[var(--saffron)] text-[var(--indigo-night)] hover:bg-[var(--indigo-night)] hover:text-[var(--parchment)]"
          >
            {busy ? "Finishing…" : "Enter the Community"}
          </Button>
        )}
      </div>
    </div>
  );
}

type LocationStepProps = {
  mode: LocationMode;
  setMode: (mode: LocationMode) => void;
  location: { countryCode: string; city: string; region: string };
  setLocation: (location: { countryCode: string; city: string; region: string }) => void;
  countries: CountryOption[];
  countriesLoading: boolean;
  countryError: string | null;
  timezone: string;
  useForScheduling: boolean;
  setUseForScheduling: (value: boolean) => void;
  useForRecommendations: boolean;
  setUseForRecommendations: (value: boolean) => void;
};

function LocationStep({
  mode,
  setMode,
  location,
  setLocation,
  countries,
  countriesLoading,
  countryError,
  timezone,
  useForScheduling,
  setUseForScheduling,
  useForRecommendations,
  setUseForRecommendations,
}: LocationStepProps) {
  const choices: Array<{
    mode: LocationMode;
    icon: typeof Globe2;
    title: string;
    description: string;
  }> = [
    {
      mode: "skip",
      icon: MapPinOff,
      title: "Not now",
      description: "Continue without saving location.",
    },
    {
      mode: "private",
      icon: LockKeyhole,
      title: "Keep it private",
      description: "Use only for the features you enable below.",
    },
    {
      mode: "members",
      icon: Users,
      title: "Share country",
      description: "Show only your country to Community members.",
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-medium">Location is optional</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Choose exactly how Indus Orbit may use it. Region and city remain private in this phase;
          member sharing is country-level only.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {choices.map((choice) => {
          const Icon = choice.icon;
          const active = mode === choice.mode;
          return (
            <button
              key={choice.mode}
              type="button"
              onClick={() => setMode(choice.mode)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-[var(--saffron)] bg-[var(--saffron)]/10"
                  : "border-border bg-background/60 hover:border-[var(--saffron)]/60"
              }`}
            >
              <Icon className="h-5 w-5 text-[var(--saffron-dark)]" />
              <span className="mt-3 block text-sm font-semibold">{choice.title}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {choice.description}
              </span>
            </button>
          );
        })}
      </div>

      {mode !== "skip" && (
        <div className="space-y-4 rounded-2xl border border-border bg-background/60 p-4">
          <Field label="Country">
            <Select
              value={location.countryCode}
              onValueChange={(countryCode) => setLocation({ ...location, countryCode })}
              disabled={countriesLoading || Boolean(countryError)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={countriesLoading ? "Loading countries…" : "Choose a country"}
                />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.countryCode} value={country.countryCode}>
                    {country.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {countryError && <p className="text-xs text-destructive">{countryError}</p>}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Region or state (private, optional)">
              <Input
                value={location.region}
                onChange={(event) => setLocation({ ...location, region: event.target.value })}
              />
            </Field>
            <Field label="City (private, optional)">
              <Input
                value={location.city}
                onChange={(event) => setLocation({ ...location, city: event.target.value })}
              />
            </Field>
          </div>

          <ConsentSwitch
            id="location-recommendations"
            label="Use my country for relevant local recommendations"
            detail="Allows country-level discovery; this does not make your location public."
            checked={useForRecommendations}
            onCheckedChange={setUseForRecommendations}
          />
          <ConsentSwitch
            id="location-scheduling"
            label="Use my timezone for scheduling"
            detail={
              timezone
                ? `If enabled, the saved timezone will be ${timezone}.`
                : "No valid browser timezone was detected, so this option is unavailable."
            }
            checked={useForScheduling}
            onCheckedChange={setUseForScheduling}
            disabled={!timezone}
          />
        </div>
      )}
    </div>
  );
}

function ConsentSwitch({
  id,
  label,
  detail,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  id: string;
  label: string;
  detail: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-3">
      <div>
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
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
