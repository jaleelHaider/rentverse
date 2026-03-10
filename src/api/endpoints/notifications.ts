import { supabase } from "@/lib/supabase";

export interface AppNotification {
  id: string;
  userId: string;
  actorId: string | null;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
}

interface NotificationRow {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
}

const mapRowToNotification = (row: NotificationRow): AppNotification => ({
  id: row.id,
  userId: row.user_id,
  actorId: row.actor_id,
  type: row.type,
  title: row.title,
  body: row.body,
  data: row.data || {},
  createdAt: row.created_at,
  readAt: row.read_at,
});

export const fetchUserNotifications = async (userId: string, limit = 12): Promise<AppNotification[]> => {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,user_id,actor_id,type,title,body,data,created_at,read_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Failed to load notifications.");
  }

  return ((data || []) as NotificationRow[]).map(mapRowToNotification);
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("read_at", null);

  if (error) {
    throw new Error(error.message || "Failed to mark notification as read.");
  }
};

export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw new Error(error.message || "Failed to mark notifications as read.");
  }
};
