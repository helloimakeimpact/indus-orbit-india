import { supabase } from "@/integrations/supabase/client";

export async function sendNotification({
  userId,
  type,
  message,
  link,
}: {
  userId: string;
  type: string;
  message: string;
  link?: string | null;
}) {
  const { error } = await supabase.rpc("send_notification", {
    _user_id: userId,
    _type: type,
    _message: message,
    _link: link || undefined,
  });
  if (error) throw new Error(error.message);
}

export const getUnreadNotificationCount = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userData.user.id)
    .eq("is_read", false);

  if (error) throw new Error(error.message);
  return count || 0;
};

export const getNotifications = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

export const markNotificationsRead = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userData.user.id)
    .eq("is_read", false);
};
