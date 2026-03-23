import { Router } from "express";
import { supabaseAdmin, supabaseAnon } from "../lib/supabase.js";
import { requireAuth, signAppToken } from "../middleware/auth.js";

export const authRouter = Router();

const mapUser = (user) => ({
  id: user.id,
  email: user.email,
  email_confirmed_at: user.email_confirmed_at,
  user_metadata: user.user_metadata || {},
});

const mapProfile = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name || "",
    email: row.email || "",
    phone: row.phone || undefined,
    city: row.city || undefined,
    profileCompleted: Boolean(row.profile_completed),
    createdAt: row.created_at,
    lastLogin: row.last_login,
  };
};

const upsertProfile = async (userId, values) => {
  const payload = {
    id: userId,
    updated_at: new Date().toISOString(),
  };

  if (values.name !== undefined) payload.name = values.name;
  if (values.email !== undefined) payload.email = values.email;
  if (values.phone !== undefined) payload.phone = values.phone;
  if (values.city !== undefined) payload.city = values.city;
  if (values.profileCompleted !== undefined) payload.profile_completed = values.profileCompleted;
  if (values.lastLogin !== undefined) payload.last_login = values.lastLogin;

  const { error } = await supabaseAdmin.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) {
    throw new Error(error.message || "Failed to update profile");
  }
};

authRouter.post("/register", async (req, res) => {
  const { email, password, name, phone, city } = req.body || {};

  const { data, error } = await supabaseAnon.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-email`,
      data: {
        full_name: name,
      },
    },
  });

  if (error || !data.user) {
    return res.status(400).json({ message: error?.message || "Registration failed" });
  }

  if (data.session) {
    await upsertProfile(data.user.id, {
      name,
      email,
      phone,
      city,
      profileCompleted: true,
      lastLogin: new Date().toISOString(),
    });
  }

  return res.json({
    user: mapUser(data.user),
    needsVerification: !data.user.email_confirmed_at,
  });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return res.status(400).json({ message: error?.message || "Login failed" });
  }

  await upsertProfile(data.user.id, {
    email: data.user.email || email,
    name: data.user.user_metadata?.full_name || "",
    lastLogin: new Date().toISOString(),
  });

  const token = signAppToken({
    sub: data.user.id,
    email: data.user.email || email,
    email_confirmed_at: data.user.email_confirmed_at,
    user_metadata: data.user.user_metadata || {},
  });

  return res.json({
    token,
    user: mapUser(data.user),
  });
});

authRouter.post("/logout", (_req, res) => {
  return res.json({ ok: true });
});

authRouter.post("/reset-password", async (req, res) => {
  const { email } = req.body || {};

  const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password`,
  });

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to send reset email" });
  }

  return res.json({ ok: true });
});

authRouter.post("/resend-verification", async (req, res) => {
  const { email } = req.body || {};

  const { error } = await supabaseAnon.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-email`,
    },
  });

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to resend verification email" });
  }

  return res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const userId = req.auth.sub;

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id,name,email,phone,city,profile_completed,created_at,last_login")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to fetch profile" });
  }

  return res.json({
    user: {
      id: req.auth.sub,
      email: req.auth.email,
      email_confirmed_at: req.auth.email_confirmed_at || null,
      user_metadata: req.auth.user_metadata || {},
    },
    profile: mapProfile(profile),
  });
});

authRouter.patch("/profile", requireAuth, async (req, res) => {
  const userId = req.auth.sub;
  const { name, email, phone, city, profileCompleted, lastLogin } = req.body || {};

  if (name !== undefined) {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { full_name: name },
    });

    if (authError) {
      return res.status(400).json({ message: authError.message || "Failed to update auth profile" });
    }
  }

  await upsertProfile(userId, {
    name,
    email,
    phone,
    city,
    profileCompleted,
    lastLogin,
  });

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id,name,email,phone,city,profile_completed,created_at,last_login")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to fetch updated profile" });
  }

  return res.json({ profile: mapProfile(profile) });
});
