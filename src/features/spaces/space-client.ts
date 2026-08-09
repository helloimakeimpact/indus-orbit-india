import { supabase } from "@/integrations/supabase/client";
import { isMissingSchemaContract } from "@/integrations/supabase/schema-compat";
import type { Database } from "@/integrations/supabase/types";

type Space = Database["public"]["Tables"]["conversation_spaces"]["Row"];
type ContextGroup = Database["public"]["Tables"]["conversation_context_groups"]["Row"];
type Room = Database["public"]["Tables"]["conversation_rooms"]["Row"];
type Membership = Database["public"]["Tables"]["conversation_space_memberships"]["Row"];
type ProfileSummary = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "display_name" | "avatar_url" | "headline"
>;
type Message = Database["public"]["Tables"]["conversation_messages"]["Row"];

export type SpaceMember = Membership & { profiles: ProfileSummary | null };
export type SpaceMessage = Message & {
  profiles: Pick<ProfileSummary, "display_name" | "avatar_url"> | null;
};

export type SpaceWorkspace = {
  space: Space;
  groups: ContextGroup[];
  rooms: Room[];
  members: SpaceMember[];
};

export async function getSourceSpaceId(
  sourceType: "chapter" | "mission",
  sourceId: string,
): Promise<string | null> {
  const query = supabase.from("conversation_spaces").select("id");
  const { data, error } =
    sourceType === "chapter"
      ? await query.eq("chapter_id", sourceId).maybeSingle()
      : await query.eq("mission_id", sourceId).maybeSingle();

  if (!error) return data?.id ?? null;
  if (isMissingSchemaContract(error)) return null;
  throw new Error(error.message);
}

export async function getSpaceWorkspace(spaceId: string): Promise<SpaceWorkspace> {
  const [spaceResult, groupResult, roomResult, memberResult] = await Promise.all([
    supabase.from("conversation_spaces").select("*").eq("id", spaceId).single(),
    supabase
      .from("conversation_context_groups")
      .select("*")
      .eq("space_id", spaceId)
      .order("position"),
    supabase
      .from("conversation_rooms")
      .select("*")
      .eq("space_id", spaceId)
      .is("archived_at", null)
      .order("position"),
    supabase
      .from("conversation_space_memberships")
      .select(
        "*, profiles!conversation_space_memberships_user_id_fkey(display_name, avatar_url, headline)",
      )
      .eq("space_id", spaceId)
      .eq("membership_state", "active")
      .order("joined_at"),
  ]);

  const error =
    spaceResult.error ?? groupResult.error ?? roomResult.error ?? memberResult.error ?? null;
  if (error) throw new Error(error.message);
  if (!spaceResult.data) throw new Error("Space not found");

  return {
    space: spaceResult.data,
    groups: groupResult.data ?? [],
    rooms: roomResult.data ?? [],
    members: (memberResult.data ?? []) as SpaceMember[],
  };
}

export async function getRoomMessages(roomId: string): Promise<SpaceMessage[]> {
  const { data, error } = await supabase
    .from("conversation_messages")
    .select("*, profiles!conversation_messages_author_id_fkey(display_name, avatar_url)")
    .eq("room_id", roomId)
    .is("deleted_at", null)
    .is("thread_id", null)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as SpaceMessage[];
}

export async function sendSpaceMessage(roomId: string, content: string): Promise<SpaceMessage> {
  const cleanContent = content.trim();
  if (!cleanContent) throw new Error("Write a message first");

  const { data, error } = await supabase.rpc("send_my_conversation_message", {
    _room_id: roomId,
    _thread_id: null as unknown as string,
    _content: cleanContent,
    _client_request_id: crypto.randomUUID(),
  });
  if (error) throw new Error(error.message);

  const { data: hydrated, error: hydrationError } = await supabase
    .from("conversation_messages")
    .select("*, profiles!conversation_messages_author_id_fkey(display_name, avatar_url)")
    .eq("id", data.id)
    .single();
  if (hydrationError) throw new Error(hydrationError.message);
  return hydrated as SpaceMessage;
}

export async function markSpaceRoomRead(roomId: string, messageId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_my_conversation_room_read", {
    _room_id: roomId,
    _message_id: messageId,
  });
  if (error) throw new Error(error.message);
}
