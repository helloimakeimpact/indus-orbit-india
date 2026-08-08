import { useEffect, useMemo, useState } from "react";
import { BarChart3, Globe2, LockKeyhole, MapPin, RefreshCcw, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  getMyLocationPreferences,
  listGlobalCountries,
  setMyCommunityLocation,
  withdrawMyLocationConsent,
  type CountryOption,
} from "./location-client";
import { getMyProductAccess, setMyMeasurementConsent } from "@/features/product/product-access";

type ShareMode = "private" | "members" | "public";

export function LocationPrivacySettings() {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [countryCode, setCountryCode] = useState("");
  const [regionLabel, setRegionLabel] = useState("");
  const [cityLabel, setCityLabel] = useState("");
  const [shareMode, setShareMode] = useState<ShareMode>("private");
  const [useForScheduling, setUseForScheduling] = useState(false);
  const [useForRecommendations, setUseForRecommendations] = useState(false);
  const [legacyLabel, setLegacyLabel] = useState<string | null>(null);
  const [hasSavedLocation, setHasSavedLocation] = useState(false);
  const [measurementConsent, setMeasurementConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [measurementBusy, setMeasurementBusy] = useState(false);

  const suggestedTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "";
    }
  }, []);

  async function loadSettings() {
    try {
      const [location, countryOptions, access] = await Promise.all([
        getMyLocationPreferences(),
        listGlobalCountries(),
        getMyProductAccess(),
      ]);
      setCountries(countryOptions);
      setCountryCode(location.countryCode ?? "");
      setRegionLabel(location.regionLabel ?? "");
      setCityLabel(location.cityLabel ?? "");
      setShareMode(location.shareAudience ?? "private");
      setUseForScheduling(location.useForScheduling);
      setUseForRecommendations(location.useForRecommendations);
      setLegacyLabel(location.legacyCountryLabel);
      setHasSavedLocation(
        location.source !== null ||
          location.countryCode !== null ||
          location.legacyCountryLabel !== null,
      );
      setMeasurementConsent(access.measurementConsent);
      setLoadError(null);
    } catch (error) {
      setLoadError((error as Error).message || "Privacy settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadSettings);
  }, []);

  async function saveLocation() {
    if (!countryCode) {
      toast.error("Choose a country before saving location preferences.");
      return;
    }

    setSaving(true);
    try {
      await setMyCommunityLocation({
        countryCode,
        regionLabel: regionLabel.trim() || undefined,
        cityLabel: cityLabel.trim() || undefined,
        timezoneName: useForScheduling ? suggestedTimezone : undefined,
        useForScheduling,
        useForRecommendations,
        shareAudience: shareMode === "private" ? null : shareMode,
        sharePrecision: shareMode === "private" ? null : "country",
        consentVersion: "community-location-v1",
      });
      setLegacyLabel(null);
      setHasSavedLocation(true);
      toast.success("Location choices saved.");
    } catch (error) {
      toast.error((error as Error).message || "Location choices could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function withdrawLocation() {
    setWithdrawing(true);
    try {
      await withdrawMyLocationConsent("community-location-v1");
      setCountryCode("");
      setRegionLabel("");
      setCityLabel("");
      setShareMode("private");
      setUseForScheduling(false);
      setUseForRecommendations(false);
      setLegacyLabel(null);
      setHasSavedLocation(false);
      toast.success("Saved location and its sharing projection were removed.");
    } catch (error) {
      toast.error((error as Error).message || "Location consent could not be withdrawn.");
    } finally {
      setWithdrawing(false);
    }
  }

  async function changeMeasurementConsent(enabled: boolean) {
    const previous = measurementConsent;
    setMeasurementConsent(enabled);
    setMeasurementBusy(true);
    try {
      await setMyMeasurementConsent(enabled);
      toast.success(
        enabled ? "Limited product measurement enabled." : "Product measurement disabled.",
      );
    } catch (error) {
      setMeasurementConsent(previous);
      toast.error((error as Error).message || "Measurement choice could not be saved.");
    } finally {
      setMeasurementBusy(false);
    }
  }

  if (loading) {
    return <p className="py-4 text-sm text-muted-foreground">Loading privacy choices…</p>;
  }

  if (loadError) {
    return (
      <div className="py-3">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => {
            setLoading(true);
            void loadSettings();
          }}
        >
          <RefreshCcw className="h-4 w-4" /> Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 py-1">
      <div className="space-y-4 rounded-2xl border border-border bg-background/55 p-4">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-5 w-5 text-[var(--saffron)]" />
          <div>
            <p className="text-sm font-semibold">Location and local relevance</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Optional. Region and city stay private in this phase; sharing exposes country only. No
              coordinates or background location are collected.
            </p>
          </div>
        </div>

        {legacyLabel && (
          <p className="rounded-xl border border-[var(--saffron)]/30 bg-[var(--saffron)]/10 p-3 text-xs leading-5">
            An older unconfirmed country label ({legacyLabel}) is stored privately. Select and save
            a country to confirm it, or withdraw to remove it.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Country">
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.countryCode} value={country.countryCode}>
                    {country.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Who may see my country">
            <Select value={shareMode} onValueChange={(value) => setShareMode(value as ShareMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Only product features I enable</SelectItem>
                <SelectItem value="members">Community members</SelectItem>
                <SelectItem value="public">Public profile visitors</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Region or state (private, optional)">
            <Input value={regionLabel} onChange={(event) => setRegionLabel(event.target.value)} />
          </Field>
          <Field label="City (private, optional)">
            <Input value={cityLabel} onChange={(event) => setCityLabel(event.target.value)} />
          </Field>
        </div>

        <PurposeToggle
          icon={<Globe2 className="h-4 w-4" />}
          label="Use my country for relevant local recommendations"
          detail="This purpose is separate from whether other people can see your country."
          checked={useForRecommendations}
          onCheckedChange={setUseForRecommendations}
        />
        <PurposeToggle
          icon={<Users className="h-4 w-4" />}
          label="Use my timezone for scheduling"
          detail={
            suggestedTimezone
              ? `If enabled, ${suggestedTimezone} will be stored for scheduling.`
              : "No valid browser timezone was detected."
          }
          checked={useForScheduling}
          onCheckedChange={setUseForScheduling}
          disabled={!suggestedTimezone}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" disabled={saving} onClick={() => void saveLocation()}>
            <LockKeyhole className="h-4 w-4" /> {saving ? "Saving…" : "Save location choices"}
          </Button>
          {hasSavedLocation && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={withdrawing}>
                  <Trash2 className="h-4 w-4" /> Withdraw and remove
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove all saved Community location?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This deletes the private preference and any member/public country share. A
                    metadata-only withdrawal event remains for consent accountability.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep location</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => void withdrawLocation()}
                  >
                    Remove location
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-background/55 p-4">
        <div className="flex items-start gap-3">
          <BarChart3 className="mt-0.5 h-5 w-5 text-[var(--saffron)]" />
          <div>
            <Label htmlFor="settings-measurement-consent" className="text-sm font-semibold">
              Limited product measurement
            </Label>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Off by default. When enabled, only allowlisted product milestones are recorded—never
              prompts, messages, profile answers, location, email, IP or device details.
            </p>
          </div>
        </div>
        <Switch
          id="settings-measurement-consent"
          checked={measurementConsent}
          disabled={measurementBusy}
          onCheckedChange={(enabled) => void changeMeasurementConsent(enabled)}
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

function PurposeToggle({
  icon,
  label,
  detail,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-[var(--saffron)]">{icon}</span>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
