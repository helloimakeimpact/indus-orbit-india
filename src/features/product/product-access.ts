import { supabase } from "@/integrations/supabase/client";
import { decodeProductAccess, type ProductAccess } from "./product-access.contract";

export type { CommunityOnboardingStatus, ProductAccess } from "./product-access.contract";

function operationId() {
  return crypto.randomUUID();
}

export async function getMyProductAccess(): Promise<ProductAccess> {
  const { data, error } = await supabase.rpc("get_my_product_access");
  if (error) throw new Error(error.message);
  return decodeProductAccess(data);
}

export async function startMyCommunityOnboarding(
  version: number,
  clientOperationId = operationId(),
): Promise<ProductAccess> {
  const { data, error } = await supabase.rpc("start_my_community_onboarding", {
    _version: version,
    _client_operation_id: clientOperationId,
  });
  if (error) throw new Error(error.message);
  return decodeProductAccess(data);
}

export async function completeMyCommunityOnboarding(
  version: number,
  clientOperationId = operationId(),
): Promise<ProductAccess> {
  const { data, error } = await supabase.rpc("complete_my_community_onboarding", {
    _version: version,
    _client_operation_id: clientOperationId,
  });
  if (error) throw new Error(error.message);
  return decodeProductAccess(data);
}

export async function setMyMeasurementConsent(
  enabled: boolean,
  clientOperationId = operationId(),
): Promise<boolean> {
  const { data, error } = await supabase.rpc("set_my_measurement_consent", {
    _enabled: enabled,
    _client_operation_id: clientOperationId,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== "boolean") throw new Error("Measurement consent could not be confirmed.");
  return data;
}

export async function recordMyProductEvent(
  surface: "io" | "community",
  eventName:
    | "surface_opened"
    | "onboarding_started"
    | "onboarding_completed"
    | "action_started"
    | "action_completed"
    | "action_failed",
  clientOperationId = operationId(),
): Promise<boolean> {
  const { data, error } = await supabase.rpc("record_my_product_event", {
    _surface: surface,
    _event_name: eventName,
    _client_operation_id: clientOperationId,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== "boolean") throw new Error("Product measurement could not be confirmed.");
  return data;
}
