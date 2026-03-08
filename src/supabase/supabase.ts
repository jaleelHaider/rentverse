import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  profileCompleted: boolean;
  createdAt: string;
  lastLogin: string;
}

const getAuthErrorMessage = (message: string, fallback: string): string => {
  const normalized = message.toLowerCase();

  if (normalized.includes("already registered") || normalized.includes("already been registered")) {
    return "Email already registered";
  }
  if (normalized.includes("invalid login credentials")) {
    return "Invalid email or password";
  }
  if (normalized.includes("email not confirmed")) {
    return "Please verify your email first";
  }
  if (normalized.includes("password should be") || normalized.includes("at least")) {
    return "Password should be at least 6 characters";
  }

  return fallback;
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,email,phone,city,profile_completed,created_at,last_login")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to fetch user profile");
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name || "",
    email: data.email || "",
    phone: data.phone || undefined,
    city: data.city || undefined,
    profileCompleted: Boolean(data.profile_completed),
    createdAt: data.created_at,
    lastLogin: data.last_login,
  };
};

export const upsertUserProfile = async (
  userId: string,
  values: Partial<Omit<UserProfile, "id" | "createdAt">>
): Promise<void> => {
  const payload: Record<string, unknown> = {
    id: userId,
    updated_at: new Date().toISOString(),
  };

  if (values.name !== undefined) payload.name = values.name;
  if (values.email !== undefined) payload.email = values.email;
  if (values.phone !== undefined) payload.phone = values.phone;
  if (values.city !== undefined) payload.city = values.city;
  if (values.profileCompleted !== undefined) payload.profile_completed = values.profileCompleted;
  if (values.lastLogin !== undefined) payload.last_login = values.lastLogin;

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

  if (error) {
    throw new Error(error.message || "Failed to update profile");
  }
};

export const registerWithEmail = async (
  email: string,
  password: string,
  name: string,
  extra?: { phone?: string; city?: string }
): Promise<{ user: User; needsVerification: boolean }> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/verify-email`,
      data: {
        full_name: name,
      },
    },
  });

  if (error || !data.user) {
    throw new Error(getAuthErrorMessage(error?.message || "Registration failed", "Registration failed"));
  }

  // With email confirmation enabled, signUp often returns no active session.
  // In that case, RLS blocks profile writes until the user verifies and logs in.
  if (data.session) {
    await upsertUserProfile(data.user.id, {
      name,
      email,
      phone: extra?.phone,
      city: extra?.city,
      profileCompleted: true,
      lastLogin: new Date().toISOString(),
    });
  }

  return {
    user: data.user,
    needsVerification: !data.user.email_confirmed_at,
  };
};

export const loginWithEmail = async (email: string, password: string): Promise<User> => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    const message = error?.message || "Login failed";
    if (message.toLowerCase().includes("email not confirmed")) {
      throw new Error("EMAIL_NOT_VERIFIED");
    }
    throw new Error(getAuthErrorMessage(message, "Login failed"));
  }

  await upsertUserProfile(data.user.id, {
    email: data.user.email || email,
    name: (data.user.user_metadata?.full_name as string | undefined) || "",
    lastLogin: new Date().toISOString(),
  });

  return data.user;
};

export const logoutUser = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message || "Logout failed");
  }
};

export const resetPassword = async (email: string): Promise<boolean> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    throw new Error(error.message || "Failed to send reset email");
  }

  return true;
};

export const resendVerificationEmail = async (email: string): Promise<boolean> => {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/verify-email`,
    },
  });

  if (error) {
    throw new Error(error.message || "Failed to resend verification email");
  }

  return true;
};

export const refreshCurrentUser = async (): Promise<User | null> => {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message || "Failed to refresh user");
  }

  return data.user;
};