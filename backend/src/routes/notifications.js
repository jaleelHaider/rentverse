import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";

export const notificationsRouter = Router();

const mapRowToNotification = (row) => ({
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

notificationsRouter.get("/me", requireAuth, async (req, res) => {
  const userId = req.auth.sub;
  const limit = Number(req.query.limit || 12);

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("id,user_id,actor_id,type,title,body,data,created_at,read_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to load notifications." });
  }

  return res.json((data || []).map(mapRowToNotification));
});

notificationsRouter.post("/:notificationId/read", requireAuth, async (req, res) => {
  const { notificationId } = req.params;

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("read_at", null);

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to mark notification as read." });
  }

  return res.json({ ok: true });
});

notificationsRouter.post("/me/read-all", requireAuth, async (req, res) => {
  const userId = req.auth.sub;

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to mark notifications as read." });
  }

  return res.json({ ok: true });
});
