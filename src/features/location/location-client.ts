import { supabase } from "@/integrations/supabase/client";
import { decodeLocationMutationResult, type LocationMutationResult } from "./location-contract";

export type CountryOption = {
  countryCode: string;
  displayName: string;
};

export type CommunityLocationInput = {
  countryCode: string;
  regionLabel?: string;
  cityLabel?: string;
  timezoneName?: string;
  useForScheduling: boolean;
  useForRecommendations: boolean;
  shareAudience: "members" | "public" | null;
  sharePrecision: "country" | "region" | "city" | null;
  consentVersion: string;
};

function operationId() {
  return crypto.randomUUID();
}

export async function listGlobalCountries(): Promise<CountryOption[]> {
  const { data, error } = await supabase
    .from("geo_countries")
    .select("country_code, display_name")
    .eq("active", true)
    .order("display_name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((country) => ({
    countryCode: country.country_code,
    displayName: country.display_name,
  }));
}

export async function setMyCommunityLocation(
  input: CommunityLocationInput,
  clientOperationId = operationId(),
): Promise<LocationMutationResult> {
  const { data, error } = await supabase.rpc("set_my_community_location", {
    _country_code: input.countryCode,
    _region_label: input.regionLabel ?? "",
    _city_label: input.cityLabel ?? "",
    _timezone_name: input.timezoneName ?? "",
    _use_for_scheduling: input.useForScheduling,
    _use_for_recommendations: input.useForRecommendations,
    _share_audience: input.shareAudience ?? "",
    _share_precision: input.sharePrecision ?? "",
    _consent_version: input.consentVersion,
    _client_operation_id: clientOperationId,
  });

  if (error) throw new Error(error.message);
  return decodeLocationMutationResult(data);
}

export async function withdrawMyLocationConsent(
  consentVersion: string,
  clientOperationId = operationId(),
): Promise<LocationMutationResult> {
  const { data, error } = await supabase.rpc("withdraw_my_location_consent", {
    _consent_version: consentVersion,
    _client_operation_id: clientOperationId,
  });

  if (error) throw new Error(error.message);
  return decodeLocationMutationResult(data);
}
