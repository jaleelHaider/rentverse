import "dotenv/config";
import { supabaseAdmin } from "../lib/supabase.js";

const SUPERADMIN_EMAIL = sanitizeEmail(process.env.SUPERADMIN_EMAIL || "haiderjaleel349@gmail.com");
const SUPERADMIN_PASSWORD = String(process.env.SUPERADMIN_PASSWORD || "jaleelhaider");
const SUPERADMIN_NAME = String(process.env.SUPERADMIN_NAME || "Haider Jaleel");

function sanitizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function ensureAuthUser() {
  const existing = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = (existing.data?.users || []).find((user) => sanitizeEmail(user.email) === SUPERADMIN_EMAIL);
  if (found) {
    return found;
  }

  const created = await supabaseAdmin.auth.admin.createUser({
    email: SUPERADMIN_EMAIL,
    password: SUPERADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: SUPERADMIN_NAME },
  });

  if (created.error || !created.data?.user) {
    throw new Error(created.error?.message || "Failed to create superadmin auth user");
  }

  return created.data.user;
}

async function run() {
  const authUser = await ensureAuthUser();

  const profilePayload = {
    id: authUser.id,
    name: SUPERADMIN_NAME,
    email: SUPERADMIN_EMAIL,
    profile_completed: true,
    updated_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
  };

  await supabaseAdmin.from("profiles").upsert(profilePayload, { onConflict: "id" });

  const { data: existingAdmin } = await supabaseAdmin
    .from("admin_users")
    .select("id,user_id")
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (existingAdmin) {
    await supabaseAdmin
      .from("admin_users")
      .update({
        email: SUPERADMIN_EMAIL,
        full_name: SUPERADMIN_NAME,
        role: "superadmin",
        status: "active",
      })
      .eq("user_id", authUser.id);
  } else {
    await supabaseAdmin.from("admin_users").insert({
      user_id: authUser.id,
      email: SUPERADMIN_EMAIL,
      full_name: SUPERADMIN_NAME,
      role: "superadmin",
      status: "active",
    });
  }

  console.log(`Superadmin ready: ${SUPERADMIN_EMAIL}`);
  console.log("Use admin login + MFA setup on first login.");
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
