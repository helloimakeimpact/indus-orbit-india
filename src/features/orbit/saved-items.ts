import { supabase } from "@/integrations/supabase/client";
import { isMissingSchemaContract } from "@/integrations/supabase/schema-compat";
import { parseOrbitSavedItems, type OrbitSavedItem, type OrbitSavedItemType } from "./saved-state";

export type { OrbitSavedItem, OrbitSavedItemType } from "./saved-state";

export async function listMyOrbitSavedItems(query = ""): Promise<OrbitSavedItem[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length > 100) throw new Error("Search must be 100 characters or fewer");
  const { data, error } = await supabase.rpc(
    "list_my_orbit_saved_items" as never,
    {
      _query: cleanQuery,
      _limit: 250,
    } as never,
  );
  // Saved work is additive; keep the rest of the shared Orbit shell usable if
  // the database release is deliberately held back.
  if (isMissingSchemaContract(error)) return [];
  if (error) throw new Error(error.message);
  return parseOrbitSavedItems(data);
}

export async function setMyOrbitSavedItem(input: {
  objectType: OrbitSavedItemType;
  objectId: string;
  saved: boolean;
  note?: string;
}): Promise<void> {
  const { error } = await supabase.rpc(
    "set_my_orbit_saved_item" as never,
    {
      _object_type: input.objectType,
      _object_id: input.objectId,
      _saved: input.saved,
      _note: input.note?.trim() || null,
    } as never,
  );
  if (error) throw new Error(error.message);
}

export function downloadOrbitSavedItems(items: OrbitSavedItem[]) {
  const payload = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      source: "Indus Orbit saved work",
      items,
    },
    null,
    2,
  );
  const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `indus-orbit-saved-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
