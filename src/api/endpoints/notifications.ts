import { apiJsonRequest } from "@/api/clients";

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

export const fetchUserNotifications = async (userId: string, limit = 12): Promise<AppNotification[]> => {
  void userId;
  const data = await apiJsonRequest<AppNotification[]>(`/notifications/me?limit=${limit}`, {
    method: "GET",
    auth: true,
  });

  return data || [];
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
  await apiJsonRequest<{ ok: boolean }>(`/notifications/${notificationId}/read`, {
    method: "POST",
    auth: true,
  });
};

export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  void userId;
  await apiJsonRequest<{ ok: boolean }>("/notifications/me/read-all", {
    method: "POST",
    auth: true,
  });
};
