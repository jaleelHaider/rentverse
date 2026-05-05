import { supabaseAdmin } from "../lib/supabase.js";

const ROLE_LEVEL = {
  superadmin: 100,
  admin: 80,
  manager: 60,
  moderator: 50,
  kyc_reviewer: 45,
  finance: 40,
  support: 30,
};

export const getRoleLevel = (role) => ROLE_LEVEL[String(role || "")] || 0;

export const canManageRole = (actorRole, targetRole) => {
  const actor = getRoleLevel(actorRole);
  const target = getRoleLevel(targetRole);
  if (!actor || !target) {
    return false;
  }
  return actor > target;
};

const loadAdminRow = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id,user_id,email,full_name,role,status,mfa_enabled,last_login")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load admin account");
  }

  return data;
};

export const requireAdminRole = (minRole = "support") => {
  return async (req, res, next) => {
    try {
      const userId = req.auth?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const adminRow = await loadAdminRow(userId);
      if (!adminRow) {
        return res.status(403).json({ message: "Admin access denied" });
      }

      if (adminRow.status !== "active") {
        return res.status(403).json({ message: "Admin account is not active" });
      }

      if (getRoleLevel(adminRow.role) < getRoleLevel(minRole)) {
        return res.status(403).json({ message: "Insufficient admin permissions" });
      }

      req.admin = adminRow;
      return next();
    } catch (error) {
      return res.status(500).json({ message: error.message || "Admin access check failed" });
    }
  };
};

export const logAdminAudit = async ({
  actorUserId,
  actorRole,
  action,
  entityType,
  entityId,
  metadata,
  ipAddress,
}) => {
  await supabaseAdmin.from("admin_audit_logs").insert({
    actor_user_id: actorUserId,
    actor_role: actorRole,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    metadata: metadata || {},
    ip_address: ipAddress || null,
  });
};
