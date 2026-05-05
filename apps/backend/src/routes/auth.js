import { Router } from "express";
import { supabaseAdmin, supabaseAnon } from "../lib/supabase.js";
import { requireAuth, signAppToken } from "../middleware/auth.js";

export const authRouter = Router();

const OAUTH_PROVIDERS = new Set(["google", "facebook", "apple"]);
const KYC_DOCUMENTS_BUCKET = "kyc-documents";
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "";
const AI_SERVICE_TIMEOUT_MS = Number.parseInt(String(process.env.AI_SERVICE_TIMEOUT_MS || "12000"), 10) || 12000;
const DOCUMENT_AUTH_MIN_SCORE = Number.parseFloat(String(process.env.DOCUMENT_AUTH_MIN_SCORE || "0.78")) || 0.78;

const sanitizeNextPath = (value) => {
  if (!value || typeof value !== "string") {
    return "/";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
};

const resolveFrontendUrl = () => process.env.FRONTEND_URL || "http://localhost:5173";

const normalizeFileName = (value) => String(value || "document.jpg").replace(/[^a-zA-Z0-9_.-]+/g, "_").slice(0, 100);

const decodeFile = (file) => {
  const content = String(file?.contentBase64 || "").trim();

  if (!content) {
    throw new Error("Invalid document image payload");
  }

  return Buffer.from(content, "base64");
};

const uploadKycDocument = async (userId, side, file) => {
  const path = `${userId}/${Date.now()}-${side}-${normalizeFileName(file?.name || `${side}.jpg`)}`;

  const { error } = await supabaseAdmin.storage.from(KYC_DOCUMENTS_BUCKET).upload(path, decodeFile(file), {
    cacheControl: "3600",
    upsert: true,
    contentType: file?.type || "image/jpeg",
  });

  if (error) {
    throw new Error(error.message || `Failed to upload ${side} document image`);
  }

  return path;
};

const getSignedUrl = async (path) => {
  if (!path) {
    return null;
  }

  const { data, error } = await supabaseAdmin.storage.from(KYC_DOCUMENTS_BUCKET).createSignedUrl(path, 60 * 60 * 24);
  if (error) {
    return null;
  }

  return data?.signedUrl || null;
};

const mapKycRecord = async (row) => {
  if (!row) {
    return null;
  }

  return {
    status: row.status || "unverified",
    verificationSource: row.verification_source || "ai_service",
    documentType: row.document_type || null,
    documentNumberLast4: row.document_number_last4 || null,
    frontImageUrl: await getSignedUrl(row.front_image_path),
    backImageUrl: await getSignedUrl(row.back_image_path),
    submittedAt: row.submitted_at || null,
    verifiedAt: row.verified_at || null,
    reviewMessage: row.review_message || null,
    analysisVerdict: row.analysis_verdict || null,
    analysisScore: row.analysis_score || null,
    analysisPayload: row.analysis_payload || {},
  };
};

const updateAuthKycMetadata = async (userId, existingMetadata, values) => {
  const mergedMetadata = {
    ...existingMetadata,
    kyc_status: values.status,
    ...(values.verificationSource ? { kyc_verification_source: values.verificationSource } : {}),
    ...(values.status === "verified" ? { kyc_verified: true } : { kyc_verified: false }),
    ...(values.verifiedAt ? { kyc_verified_at: values.verifiedAt } : {}),
    ...(values.documentType ? { kyc_document_type: values.documentType } : {}),
    ...(values.documentNumberLast4 ? { kyc_document_last4: values.documentNumberLast4 } : {}),
    ...(values.reviewMessage ? { kyc_review_message: values.reviewMessage } : {}),
    ...(values.analysisVerdict ? { kyc_analysis_verdict: values.analysisVerdict } : {}),
    ...(values.analysisScore !== undefined ? { kyc_analysis_score: values.analysisScore } : {}),
  };

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: mergedMetadata,
  });

  if (error) {
    throw new Error(error.message || "Failed to update auth metadata");
  }

  return mergedMetadata;
};

const callDocumentAuthenticityService = async ({ contentBase64, documentType, side, documentNumberLast4 }) => {
  if (!AI_SERVICE_URL) {
    return {
      verdict: "warn",
      score: 0,
      warnings: ["AI service is not configured."],
      failures: [],
      metrics: { modelReady: false, side, documentType, documentNumberLast4: documentNumberLast4 || "" },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_SERVICE_URL}/check-document-authenticity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentBase64,
        documentType,
        side,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const message = await response.text();
      const error = new Error(message || "Document authenticity service failed");
      error.statusCode = 503;
      throw error;
    }

    const payload = await response.json();
    if (!["accept", "warn", "reject"].includes(String(payload?.verdict || ""))) {
      const error = new Error("Invalid document authenticity payload from AI service.");
      error.statusCode = 503;
      throw error;
    }

    return {
      verdict: payload.verdict,
      score: toNormalizedConfidence(payload.score) ?? 0,
      warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
      failures: Array.isArray(payload.failures) ? payload.failures : [],
      metrics: payload.metrics || {},
    };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("Document authenticity service timed out.");
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const summarizeAuthenticityOutcome = ({ documentType, frontResult, backResult }) => {
  const results = [frontResult, backResult].filter(Boolean);
  const anyReject = results.some((item) => item.verdict === "reject");
  const anyWarn = results.some((item) => item.verdict === "warn");
  const bestScore = results.length ? Math.min(...results.map((item) => Number(item.score || 0))) : 0;

  const status = "pending";
  const reviewMessage = "Your KYC request has been submitted and is pending admin review.";

  return {
    status,
    reviewMessage,
    analysisVerdict: anyReject ? "reject" : anyWarn ? "warn" : "accept",
    analysisScore: bestScore,
  };
};

const toNormalizedConfidence = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.max(0, Math.min(1, number));
};

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
    verifiedSeller: Boolean(row.verified_seller),
    profileCompleted: Boolean(row.profile_completed),
    createdAt: row.created_at,
    lastLogin: row.last_login,
  };
};

const ACCOUNT_DELETION_BLOCKING_RENT_STATUSES = [
  "approved",
  "handover_otp_pending",
  "in_use",
  "return_otp_pending",
];

const removeBucketObjectsByPrefix = async (bucket, prefix) => {
  const pendingPrefixes = [prefix];

  while (pendingPrefixes.length > 0) {
    const currentPrefix = pendingPrefixes.pop();

    const { data: objects, error: listError } = await supabaseAdmin.storage
      .from(bucket)
      .list(currentPrefix, {
        limit: 1000,
        offset: 0,
      });

    if (listError) {
      continue;
    }

    const filesToDelete = [];
    for (const item of objects || []) {
      const itemName = item.name || "";
      if (!itemName) {
        continue;
      }

      if (item.metadata === null) {
        pendingPrefixes.push(`${currentPrefix}/${itemName}`);
        continue;
      }

      filesToDelete.push(`${currentPrefix}/${itemName}`);
    }

    if (filesToDelete.length > 0) {
      await supabaseAdmin.storage.from(bucket).remove(filesToDelete);
    }
  }
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

const finalizeSocialUserLogin = async (user) => {
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "";
  const now = new Date().toISOString();

  // Upsert acts as register-if-new and login-if-existing profile sync.
  await upsertProfile(user.id, {
    email: user.email || "",
    name: fullName,
    phone: user.user_metadata?.phone,
    city: user.user_metadata?.city,
    profileCompleted: Boolean(fullName && user.email),
    lastLogin: now,
  });

  const token = signAppToken({
    sub: user.id,
    email: user.email || "",
    email_confirmed_at: user.email_confirmed_at,
    user_metadata: user.user_metadata || {},
  });

  return {
    token,
    user: mapUser(user),
  };
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
  try {
    console.log('[AUTH] Login request received:', {
      body: req.body,
      headers: {
        origin: req.headers.origin,
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length'],
      },
    });

    const { email, password } = req.body || {};

    if (!email || !password) {
      console.log('[AUTH] Missing email or password');
      return res.status(400).json({ message: 'Email and password required' });
    }

    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      console.log('[AUTH] Login failed:', error?.message);
      return res.status(400).json({ message: error?.message || "Login failed" });
    }

    if (!data.user.email_confirmed_at) {
      console.log('[AUTH] Email not confirmed');
      return res.status(403).json({ message: "Please verify your email before logging in." });
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

    console.log('[AUTH] Login successful for:', email);
    return res.json({
      token,
      user: mapUser(data.user),
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

authRouter.post("/oauth/session", async (req, res) => {
  const { accessToken } = req.body || {};

  if (!accessToken || typeof accessToken !== "string") {
    return res.status(400).json({ message: "Missing OAuth access token" });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  const user = data?.user;

  if (error || !user) {
    return res.status(401).json({ message: error?.message || "Invalid OAuth session" });
  }

  if (!user.email_confirmed_at) {
    return res.status(403).json({ message: "Please verify your email before logging in." });
  }

  const payload = await finalizeSocialUserLogin(user);
  return res.json(payload);
});

authRouter.get("/oauth/:provider/start", async (req, res) => {
  const provider = req.params.provider;
  const nextPath = sanitizeNextPath(req.query.next);

  if (!OAUTH_PROVIDERS.has(provider)) {
    return res.status(400).json({ message: "Unsupported social provider" });
  }

  const backendBaseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get("host")}`;
  const callbackUrl = `${backendBaseUrl}/api/auth/oauth/callback?next=${encodeURIComponent(nextPath)}`;

  const { data, error } = await supabaseAnon.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl,
    },
  });

  if (error || !data?.url) {
    return res.status(400).json({ message: error?.message || "Failed to start social login" });
  }

  return res.redirect(data.url);
});

authRouter.get("/oauth/callback", async (req, res) => {
  const nextPath = sanitizeNextPath(req.query.next);
  const frontendUrl = resolveFrontendUrl();

  try {
    const code = req.query.code;

    if (!code || typeof code !== "string") {
      const redirectUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent("Missing OAuth code")}&next=${encodeURIComponent(nextPath)}`;
      return res.redirect(redirectUrl);
    }

    const { data, error } = await supabaseAnon.auth.exchangeCodeForSession(code);
    const user = data?.user;

    if (error || !user) {
      const redirectUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(error?.message || "Failed to complete social login")}&next=${encodeURIComponent(nextPath)}`;
      return res.redirect(redirectUrl);
    }

    if (!user.email_confirmed_at) {
      const redirectUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent("Please verify your email before logging in.")}&next=${encodeURIComponent(nextPath)}`;
      return res.redirect(redirectUrl);
    }

    const payload = await finalizeSocialUserLogin(user);
    const redirectUrl = `${frontendUrl}/auth/callback?token=${encodeURIComponent(payload.token)}&next=${encodeURIComponent(nextPath)}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected social login error";
    const redirectUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(message)}&next=${encodeURIComponent(nextPath)}`;
    return res.redirect(redirectUrl);
  }
});

authRouter.post("/logout", (_req, res) => {
  return res.json({ ok: true });
});

authRouter.delete("/account", requireAuth, async (req, res) => {
  const userId = req.auth.sub;

  const { data: blockingOrders, error: blockingOrdersError } = await supabaseAdmin
    .from("marketplace_orders")
    .select("id,status,buyer_id,seller_id,order_mode")
    .eq("order_mode", "rent")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .in("status", ACCOUNT_DELETION_BLOCKING_RENT_STATUSES)
    .limit(20);

  if (blockingOrdersError) {
    return res
      .status(400)
      .json({ message: blockingOrdersError.message || "Failed to validate active rental orders." });
  }

  if ((blockingOrders || []).length > 0) {
    return res.status(409).json({
      message:
        "Account deletion is blocked while you are part of active rental transactions. Complete or close these rentals first.",
      code: "ACTIVE_RENTAL_ORDERS",
      blockingOrders: (blockingOrders || []).map((order) => ({
        id: order.id,
        status: order.status,
        role: order.buyer_id === userId ? "buyer" : "seller",
      })),
    });
  }

  const { data: ownedListingImages, error: listingImagesError } = await supabaseAdmin
    .from("listing_images")
    .select("storage_path,listings!inner(owner_user_id)")
    .eq("listings.owner_user_id", userId);

  if (!listingImagesError && (ownedListingImages || []).length > 0) {
    const paths = (ownedListingImages || [])
      .map((row) => row.storage_path)
      .filter((value) => typeof value === "string" && value.length > 0);

    if (paths.length > 0) {
      await supabaseAdmin.storage.from("listing-images").remove(paths);
    }
  }

  await removeBucketObjectsByPrefix("listing-images", userId);
  await removeBucketObjectsByPrefix("chat-attachments", userId);

  const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (deleteAuthError) {
    return res.status(400).json({ message: deleteAuthError.message || "Failed to delete account." });
  }

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

  const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (authUserError || !authUserData?.user) {
    return res.status(401).json({ message: authUserError?.message || "Failed to fetch authenticated user" });
  }

  const authUser = authUserData.user;

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id,name,email,phone,city,verified_seller,profile_completed,created_at,last_login")
    .eq("id", userId)
    .maybeSingle();

  const { data: kycRow, error: kycError } = await supabaseAdmin
    .from("profile_kyc_verifications")
    .select(
      "user_id,status,verification_source,document_type,document_number_last4,front_image_path,back_image_path,analysis_verdict,analysis_score,analysis_payload,submitted_at,verified_at,rejected_at,review_message"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to fetch profile" });
  }

  if (kycError) {
    return res.status(400).json({ message: kycError.message || "Failed to fetch KYC status" });
  }

  let resolvedProfile = profile;
  if (authUser.email_confirmed_at && authUser.email && profile?.email && profile.email !== authUser.email) {
    try {
      await upsertProfile(userId, {
        email: authUser.email,
      });

      const { data: refreshedProfile } = await supabaseAdmin
        .from("profiles")
        .select("id,name,email,phone,city,verified_seller,profile_completed,created_at,last_login")
        .eq("id", userId)
        .maybeSingle();

      if (refreshedProfile) {
        resolvedProfile = refreshedProfile;
      }
    } catch {
      resolvedProfile = {
        ...profile,
        email: authUser.email,
      };
    }
  }

  const kyc = await mapKycRecord(kycRow);

  return res.json({
    user: mapUser(authUser),
    profile: mapProfile(resolvedProfile),
    kyc,
  });
});

authRouter.get("/kyc", requireAuth, async (req, res) => {
  const userId = req.auth.sub;

  const { data: row, error } = await supabaseAdmin
    .from("profile_kyc_verifications")
    .select(
      "user_id,status,verification_source,document_type,document_number_last4,front_image_path,back_image_path,analysis_verdict,analysis_score,analysis_payload,submitted_at,verified_at,rejected_at,review_message"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to fetch KYC verification" });
  }

  return res.json({ kyc: await mapKycRecord(row) });
});

authRouter.post("/kyc/submit", requireAuth, async (req, res) => {
  const userId = req.auth.sub;
  const { documentType, documentNumber, frontImage, backImage } = req.body || {};

  if (!documentType || typeof documentType !== "string") {
    return res.status(400).json({ message: "Document type is required" });
  }

  if (!frontImage || !backImage) {
    return res.status(400).json({ message: "Front and back document images are required" });
  }

  const documentNumberLast4 = String(documentNumber || "").replace(/\D/g, "").slice(-4) || null;
  const submittedAt = new Date().toISOString();

  const [frontAnalysis, backAnalysis] = await Promise.all([
    callDocumentAuthenticityService({
      contentBase64: frontImage.contentBase64,
      documentType,
      side: "front",
      documentNumberLast4,
    }).catch((error) => ({
      verdict: "warn",
      score: 0,
      warnings: [error instanceof Error ? error.message : "Document screening failed."],
      failures: [],
      metrics: { modelReady: false, side: "front", documentType, documentNumberLast4 },
    })),
    callDocumentAuthenticityService({
      contentBase64: backImage.contentBase64,
      documentType,
      side: "back",
      documentNumberLast4,
    }).catch((error) => ({
      verdict: "warn",
      score: 0,
      warnings: [error instanceof Error ? error.message : "Document screening failed."],
      failures: [],
      metrics: { modelReady: false, side: "back", documentType, documentNumberLast4 },
    })),
  ]);

  const outcome = summarizeAuthenticityOutcome({ documentType, frontResult: frontAnalysis, backResult: backAnalysis });
  const verifiedAt = null;
  const rejectedAt = null;

  const frontPath = await uploadKycDocument(userId, "front", frontImage);
  const backPath = await uploadKycDocument(userId, "back", backImage);

  const reviewMessage = outcome.reviewMessage;

  const payload = {
    user_id: userId,
    status: outcome.status,
    verification_source: "ai_service",
    document_type: documentType,
    document_number_last4: documentNumberLast4,
    front_image_path: frontPath,
    back_image_path: backPath,
    analysis_verdict: outcome.analysisVerdict,
    analysis_score: outcome.analysisScore,
    analysis_payload: {
      front: frontAnalysis,
      back: backAnalysis,
      outcome,
    },
    review_message: reviewMessage,
    submitted_at: submittedAt,
    verified_at: verifiedAt,
    rejected_at: rejectedAt,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabaseAdmin
    .from("profile_kyc_verifications")
    .upsert(payload, { onConflict: "user_id" });

  if (upsertError) {
    return res.status(400).json({ message: upsertError.message || "Failed to save KYC verification" });
  }

  const { data: savedRow, error: savedError } = await supabaseAdmin
    .from("profile_kyc_verifications")
    .select(
      "user_id,status,verification_source,document_type,document_number_last4,front_image_path,back_image_path,analysis_verdict,analysis_score,analysis_payload,submitted_at,verified_at,rejected_at,review_message"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (savedError) {
    return res.status(400).json({ message: savedError.message || "Failed to load saved KYC verification" });
  }

  const { data: updatedUserData, error: updatedUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (updatedUserError || !updatedUserData?.user) {
    return res.status(400).json({ message: updatedUserError?.message || "Failed to refresh user after KYC submission" });
  }

  await updateAuthKycMetadata(userId, updatedUserData.user.user_metadata || {}, {
    status: savedRow?.status || outcome.status,
    verificationSource: "ai_service",
    verifiedAt: verifiedAt || undefined,
    documentType,
    documentNumberLast4,
    reviewMessage,
    analysisVerdict: outcome.analysisVerdict,
    analysisScore: outcome.analysisScore,
  });

  const { data: refreshedUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id,name,email,phone,city,profile_completed,created_at,last_login")
    .eq("id", userId)
    .maybeSingle();

  return res.json({
    message: reviewMessage,
    kyc: await mapKycRecord(savedRow),
    profile: mapProfile(profile),
    user: mapUser(refreshedUserData.user),
  });
});

authRouter.post("/kyc/webhook", async (req, res) => {
  return res.status(410).json({ message: "External KYC webhooks are disabled. Use the AI screening flow instead." });
});

authRouter.patch("/profile", requireAuth, async (req, res) => {
  const userId = req.auth.sub;
  const {
    name,
    phone,
    city,
    description,
    avatarUrl,
    profileCompleted,
    lastLogin,
    kycVerified,
    kycVerifiedAt,
    kycDocumentType,
    kycDocumentLast4,
  } = req.body || {};

  if (req.body?.email !== undefined) {
    return res.status(400).json({ message: "Use the update email button to change your email address." });
  }

  const existingMetadata = req.auth.user_metadata || {};
  const mergedMetadata = {
    ...existingMetadata,
    ...(name !== undefined ? { full_name: name } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
    ...(kycVerified !== undefined ? { kyc_verified: Boolean(kycVerified) } : {}),
    ...(kycVerifiedAt !== undefined ? { kyc_verified_at: kycVerifiedAt } : {}),
    ...(kycDocumentType !== undefined ? { kyc_document_type: kycDocumentType } : {}),
    ...(kycDocumentLast4 !== undefined ? { kyc_document_last4: kycDocumentLast4 } : {}),
  };

  if (
    name !== undefined ||
    description !== undefined ||
    avatarUrl !== undefined ||
    kycVerified !== undefined ||
    kycVerifiedAt !== undefined ||
    kycDocumentType !== undefined ||
    kycDocumentLast4 !== undefined
  ) {
    const authUpdatePayload = {
      ...(name !== undefined || description !== undefined || avatarUrl !== undefined
        ? { user_metadata: mergedMetadata }
        : {}),
    };

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ...authUpdatePayload,
    });

    if (authError) {
      return res.status(400).json({ message: authError.message || "Failed to update auth profile" });
    }
  }

  await upsertProfile(userId, {
    name,
    phone,
    city,
    profileCompleted,
    lastLogin,
  });

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id,name,email,phone,city,verified_seller,profile_completed,created_at,last_login")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to fetch updated profile" });
  }

  return res.json({
    profile: mapProfile(profile),
    user: {
      id: userId,
      email: req.auth.email,
      email_confirmed_at: req.auth.email_confirmed_at || null,
      user_metadata: mergedMetadata,
    },
  });
});

authRouter.post("/profile/email", requireAuth, async (req, res) => {
  const userId = req.auth.sub;
  const nextEmail = String(req.body?.email || "").trim().toLowerCase();
  const currentEmail = String(req.auth.email || "").trim().toLowerCase();

  if (!nextEmail) {
    return res.status(400).json({ message: "Email is required." });
  }

  if (nextEmail === currentEmail) {
    return res.json({ message: "You are already using this email." });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email: nextEmail,
  });

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to update email" });
  }

  return res.json({
    message: "Check your mail for verification. Your profile email will update after verification.",
  });
});
