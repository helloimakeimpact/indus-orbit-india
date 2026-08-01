import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type FeedItem = {
  id: string;
  type: "mission_update" | "story" | "event" | "ask_offer";
  title: string;
  content: string;
  createdAt: string;
  authorName?: string | null;
  authorAvatar?: string | null;
  link?: string;
  metadata?: Record<string, Json | undefined>;
};

export async function getPersonalizedFeed(): Promise<FeedItem[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const userId = userData.user.id;
  const feed: FeedItem[] = [];

  // 1. Get mission updates for missions the user joined
  const { data: userMissions, error: userMissionsError } = await supabase
    .from("mission_members")
    .select("mission_id, missions(title)")
    .eq("user_id", userId);
  if (userMissionsError) throw new Error(userMissionsError.message);

  if (userMissions && userMissions.length > 0) {
    const missionIds = userMissions.map((membership) => membership.mission_id);
    const { data: updates, error: updatesError } = await supabase
      .from("mission_updates")
      .select(
        "id, content, created_at, mission_id, profiles!mission_updates_author_id_fkey(display_name, avatar_url)",
      )
      .in("mission_id", missionIds)
      .order("created_at", { ascending: false })
      .limit(5);
    if (updatesError) throw new Error(updatesError.message);

    if (updates) {
      updates.forEach((update) => {
        const missionTitle =
          userMissions.find((membership) => membership.mission_id === update.mission_id)?.missions
            ?.title || "Mission";
        feed.push({
          id: update.id,
          type: "mission_update",
          title: `Update in ${missionTitle}`,
          content: update.content || "",
          createdAt: update.created_at,
          authorName: update.profiles?.display_name,
          authorAvatar: update.profiles?.avatar_url,
          link: `/app/missions/${update.mission_id}`,
        });
      });
    }
  }

  // 2. Get recent published stories
  const { data: stories, error: storiesError } = await supabase
    .from("stories")
    .select(
      "id, title, content, published_at, created_at, profiles!stories_author_id_fkey(display_name, avatar_url)",
    )
    .in("status", ["approved", "featured"])
    .order("published_at", { ascending: false })
    .limit(3);
  if (storiesError) throw new Error(storiesError.message);

  if (stories) {
    stories.forEach((story) => {
      // Create a short excerpt
      const excerpt = story.content ? `${story.content.substring(0, 150)}...` : "";
      feed.push({
        id: story.id,
        type: "story",
        title: story.title,
        content: excerpt,
        createdAt: story.published_at ?? story.created_at,
        authorName: story.profiles?.display_name,
        authorAvatar: story.profiles?.avatar_url,
        link: `/app/stories/${story.id}`,
      });
    });
  }

  // 3. Get upcoming events
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select(
      "id, title, description, start_time, location_type, profiles!events_organizer_id_fkey(display_name, avatar_url)",
    )
    .eq("status", "approved")
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(3);
  if (eventsError) throw new Error(eventsError.message);

  if (events) {
    events.forEach((event) => {
      const excerpt = event.description ? `${event.description.substring(0, 150)}...` : "";
      feed.push({
        id: event.id,
        type: "event",
        title: event.title,
        content: excerpt,
        createdAt: event.start_time,
        authorName: event.profiles?.display_name || "Organizer",
        authorAvatar: event.profiles?.avatar_url,
        link: `/app/events/${event.id}`,
        metadata: { location_type: event.location_type },
      });
    });
  }

  // Sort all items by createdAt descending
  feed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return feed;
}
