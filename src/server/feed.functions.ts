import { supabase } from "@/integrations/supabase/client";

export type FeedItem = {
  id: string;
  type: "mission_update" | "story" | "event" | "ask_offer";
  title: string;
  content: string;
  createdAt: string;
  authorName?: string | null;
  authorAvatar?: string | null;
  link?: string;
  metadata?: any;
};

export async function getPersonalizedFeed(): Promise<FeedItem[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const userId = userData.user.id;
  const feed: FeedItem[] = [];

  // 1. Get mission updates for missions the user joined
  const { data: userMissions } = await supabase
    .from("mission_members")
    .select("mission_id, missions(title)")
    .eq("user_id", userId);

  if (userMissions && userMissions.length > 0) {
    const missionIds = userMissions.map((m: any) => m.mission_id);
    const { data: updates } = await supabase
      .from("mission_updates")
      .select("id, content, created_at, mission_id, profiles!mission_updates_author_id_fkey(display_name, avatar_url)")
      .in("mission_id", missionIds)
      .order("created_at", { ascending: false })
      .limit(5);

    if (updates) {
      updates.forEach((u: any) => {
        const missionTitle = userMissions.find(m => m.mission_id === u.mission_id)?.missions?.title || "Mission";
        feed.push({
          id: u.id,
          type: "mission_update",
          title: `Update in ${missionTitle}`,
          content: u.content || "",
          createdAt: u.created_at,
          authorName: u.profiles?.display_name,
          authorAvatar: u.profiles?.avatar_url,
          link: `/app/missions/${u.mission_id}`,
        });
      });
    }
  }

  // 2. Get recent published stories
  const { data: stories } = await supabase
    .from("stories")
    .select("id, title, content, published_at, profiles(display_name, avatar_url)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(3);

  if (stories) {
    stories.forEach((s: any) => {
      // Create a short excerpt
      const excerpt = s.content ? s.content.substring(0, 150) + "..." : "";
      feed.push({
        id: s.id,
        type: "story",
        title: s.title,
        content: excerpt,
        createdAt: s.published_at,
        authorName: s.profiles?.display_name,
        authorAvatar: s.profiles?.avatar_url,
        link: `/app/stories/${s.id}`,
      });
    });
  }

  // 3. Get upcoming events
  const { data: events } = await supabase
    .from("events")
    .select("id, title, description, start_time, location_type, profiles(display_name, avatar_url)")
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(3);

  if (events) {
    events.forEach((e: any) => {
      const excerpt = e.description ? e.description.substring(0, 150) + "..." : "";
      feed.push({
        id: e.id,
        type: "event",
        title: e.title,
        content: excerpt,
        createdAt: e.start_time, // sort by when it happens or when it was created? usually feed is by created_at. We will use start_time for sorting here.
        authorName: e.profiles?.display_name || "Organizer",
        authorAvatar: e.profiles?.avatar_url,
        link: `/app/events/${e.id}`,
        metadata: { location_type: e.location_type },
      });
    });
  }

  // Sort all items by createdAt descending
  feed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return feed;
}
