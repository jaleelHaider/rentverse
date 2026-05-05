import { Router } from "express";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import { authenticator } from "otplib";
import { supabaseAdmin, supabaseAnon } from "../lib/supabase.js";
import { requireAuth, signAppToken } from "../middleware/auth.js";
import { canManageRole, getRoleLevel, logAdminAudit, requireAdminRole } from "../middleware/admin.js";

export const adminRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in backend env.");
}

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "";
const AI_SERVICE_TIMEOUT_MS = Number.parseInt(String(process.env.AI_SERVICE_TIMEOUT_MS || "12000"), 10) || 12000;
const ADMIN_MFA_REQUIRED = String(process.env.ADMIN_MFA_REQUIRED || "false").toLowerCase() === "true";

const ADMIN_ROLES = ["superadmin", "admin", "manager", "moderator", "kyc_reviewer", "finance", "support"];
const ADMIN_STATUSES = ["active", "suspended"];
const DISPUTE_STATUSES = ["open", "under_review", "awaiting_parties", "resolved", "closed"];
const ACTIVE_DISPUTE_STATUSES = ["open", "under_review", "awaiting_parties"];
const DISPUTE_PRIORITIES = ["low", "medium", "high", "urgent"];
const DISPUTE_VERDICTS = [
  "buyer_favor",
  "seller_favor",
  "partial_refund",
  "full_refund",
  "replacement",
  "warning",
  "no_action",
  "other",
];
const ORDER_STATUSES = [
  "pending_seller_approval",
  "approved",
  "handover_otp_pending",
  "in_use",
  "return_otp_pending",
  "completed",
  "rejected",
  "cancelled",
];
const DISPUTE_EVIDENCE_BUCKET = "dispute-evidence";
const REPORT_STATUSES = ["open", "investigating", "actioned", "dismissed"];
const LISTING_REPORT_ACTIONS = ["pause_listing", "activate_listing", "delete_listing", "dismiss_reports", "mark_investigating"];
const USER_REPORT_ACTIONS = [
  "warn_user",
  "restrict_listing_activity",
  "restrict_messaging",
  "restrict_order_activity",
  "restrict_all_activity",
  "suspend_user",
  "clear_user_restrictions",
  "dismiss_reports",
  "mark_investigating",
];
const VERIFIED_SELLER_STATUSES = ["candidate", "verified", "all"];
const VERIFIED_SELLER_SORTS = [
  "orders_desc",
  "orders_asc",
  "rating_desc",
  "rating_asc",
  "reviews_desc",
  "reviews_asc",
  "positive_desc",
  "positive_asc",
  "recent_desc",
  "recent_asc",
];

const PRIORITY_LEVEL = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

const SLA_ESCALATION_RULES = [
  { hours: 24, priority: "medium" },
  { hours: 48, priority: "high" },
  { hours: 72, priority: "urgent" },
];

const targetPriorityForAge = (createdAt) => {
  const createdMs = new Date(createdAt || "").getTime();
  if (!Number.isFinite(createdMs)) {
    return null;
  }

  const ageHours = (Date.now() - createdMs) / (1000 * 60 * 60);
  let target = null;
  for (const rule of SLA_ESCALATION_RULES) {
    if (ageHours >= rule.hours) {
      target = rule.priority;
    }
  }

  return target;
};

const buildSlaMeta = (row) => {
  const createdMs = new Date(row?.created_at || "").getTime();
  if (!Number.isFinite(createdMs)) {
    return null;
  }

  const firstResponseDueAt = new Date(createdMs + 12 * 60 * 60 * 1000).toISOString();
  const resolutionDueAt = new Date(createdMs + 72 * 60 * 60 * 1000).toISOString();
  const now = Date.now();

  return {
    firstResponseDueAt,
    resolutionDueAt,
    firstResponseBreached: now > new Date(firstResponseDueAt).getTime(),
    resolutionBreached: now > new Date(resolutionDueAt).getTime(),
  };
};

const resolveEvidenceSignedUrls = async (evidence) => {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    return [];
  }

  return Promise.all(
    evidence
      .filter((item) => item && typeof item === "object")
      .map(async (item) => {
        const storagePath = item.storagePath || item.storage_path;
        if (!storagePath) {
          return item;
        }

        const signed = await supabaseAdmin.storage
          .from(DISPUTE_EVIDENCE_BUCKET)
          .createSignedUrl(storagePath, 60 * 60);

        return {
          ...item,
          storagePath,
          signedUrl: signed.data?.signedUrl || item.url || null,
          url: signed.data?.signedUrl || item.url || "",
        };
      })
  );
};

const applyDisputeSlaEscalation = async () => {
  const { data, error } = await supabaseAdmin
    .from("marketplace_order_disputes")
    .select("id,priority,created_at,status")
    .in("status", ACTIVE_DISPUTE_STATUSES)
    .limit(500);

  if (error || !data) {
    return;
  }

  for (const dispute of data) {
    const targetPriority = targetPriorityForAge(dispute.created_at);
    if (!targetPriority) {
      continue;
    }

    const currentLevel = PRIORITY_LEVEL[String(dispute.priority || "low")] || 1;
    const targetLevel = PRIORITY_LEVEL[targetPriority] || currentLevel;
    if (targetLevel <= currentLevel) {
      continue;
    }

    await supabaseAdmin
      .from("marketplace_order_disputes")
      .update({
        priority: targetPriority,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dispute.id);
  }
};

const mapAdminUser = (row) => ({
  id: row.id,
  userId: row.user_id,
  email: row.email,
  fullName: row.full_name,
  role: row.role,
  status: row.status,
  mfaEnabled: Boolean(row.mfa_enabled),
  lastLogin: row.last_login,
  createdAt: row.created_at,
});

const fetchUserProfile = async (userId) => {
  if (!userId) return null;
  
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id,name,email,phone,city,kyc_status,profile_completed,moderation_status,created_at,updated_at,last_login,verified_seller,verified_seller_at,verified_seller_note")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return null;
  }

  return {
    userId: profile.id,
    name: profile.name || "Unknown User",
    email: profile.email || "",
    phone: profile.phone || "",
    city: profile.city || "",
    kycStatus: profile.kyc_status || "unverified",
    profileCompleted: Boolean(profile.profile_completed),
    moderationStatus: profile.moderation_status || "active",
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
    lastLogin: profile.last_login || null,
    verifiedSeller: Boolean(profile.verified_seller),
    verifiedSellerAt: profile.verified_seller_at || null,
    verifiedSellerNote: profile.verified_seller_note || null,
  };
};

const normalizeVerifiedSellerStatus = (value) => {
  const key = String(value || "candidate").trim().toLowerCase();
  if (VERIFIED_SELLER_STATUSES.includes(key)) {
    return key;
  }
  return "candidate";
};

const normalizeVerifiedSellerSort = (value) => {
  const key = String(value || "orders_desc").trim().toLowerCase();
  if (VERIFIED_SELLER_SORTS.includes(key)) {
    return key;
  }
  return "orders_desc";
};

const maxIso = (...values) => {
  let latest = null;
  let latestTime = Number.NEGATIVE_INFINITY;

  for (const value of values.flat()) {
    const time = new Date(value || "").getTime();
    if (Number.isFinite(time) && time > latestTime) {
      latestTime = time;
      latest = value;
    }
  }

  return latest;
};

const createVerifiedSellerStats = () => ({
  totalOrders: 0,
  completedOrders: 0,
  sellerSoldCount: 0,
  sellerRentedCount: 0,
  buyerPurchasedCount: 0,
  buyerRentedCount: 0,
  activeListings: 0,
  totalListings: 0,
  totalReviews: 0,
  avgRating: 0,
  positivePercentage: 0,
  latestOrderAt: null,
  latestReviewAt: null,
  latestListingAt: null,
  latestActivityAt: null,
});

const initializeVerifiedSellerStatsMap = (profiles = []) => {
  return profiles.reduce((acc, profile) => {
    acc[profile.id] = createVerifiedSellerStats();
    return acc;
  }, {});
};

const aggregateVerifiedSellerStats = ({ profiles = [], orders = [], reviews = [], listings = [] }) => {
  const statsByUserId = initializeVerifiedSellerStatsMap(profiles);
  const ensureStats = (userId) => {
    if (!statsByUserId[userId]) {
      statsByUserId[userId] = createVerifiedSellerStats();
    }
    return statsByUserId[userId];
  };

  const uniqueOrders = new Map();
  for (const row of orders) {
    if (row?.id) {
      uniqueOrders.set(row.id, row);
    }
  }

  for (const order of uniqueOrders.values()) {
    const orderAt = maxIso(order.created_at, order.completed_at, order.updated_at);
    const status = String(order.status || "");
    const mode = String(order.order_mode || "");
    const involvedUserIds = [order.buyer_id, order.seller_id].filter(Boolean);

    for (const userId of involvedUserIds) {
      const stats = ensureStats(userId);
      stats.totalOrders += 1;
      stats.latestOrderAt = maxIso(stats.latestOrderAt, orderAt);
      if (status === "completed") {
        stats.completedOrders += 1;
      }
    }

    if (order.seller_id) {
      const stats = ensureStats(order.seller_id);
      if (mode === "buy") {
        stats.sellerSoldCount += 1;
      }
      if (mode === "rent") {
        stats.sellerRentedCount += 1;
      }
    }

    if (order.buyer_id) {
      const stats = ensureStats(order.buyer_id);
      if (mode === "buy") {
        stats.buyerPurchasedCount += 1;
      }
      if (mode === "rent") {
        stats.buyerRentedCount += 1;
      }
    }
  }

  for (const review of reviews) {
    if (!review?.reviewee_id) {
      continue;
    }

    const stats = ensureStats(review.reviewee_id);
    stats.totalReviews += 1;
    stats.avgRating += Number(review.rating) || 0;
    stats.positivePercentage += Number(review.rating) >= 4 ? 1 : 0;
    stats.latestReviewAt = maxIso(stats.latestReviewAt, review.created_at);
  }

  for (const listing of listings) {
    if (!listing?.owner_user_id) {
      continue;
    }

    const stats = ensureStats(listing.owner_user_id);
    stats.totalListings += 1;
    if (String(listing.status || "") === "active") {
      stats.activeListings += 1;
    }
    stats.latestListingAt = maxIso(stats.latestListingAt, listing.created_at, listing.updated_at);
  }

  return Object.entries(statsByUserId).reduce((acc, [userId, stats]) => {
    const reviewCount = stats.totalReviews;
    const avgRating = reviewCount > 0 ? Number((stats.avgRating / reviewCount).toFixed(2)) : 0;
    const positivePercentage = reviewCount > 0 ? Number(((stats.positivePercentage / reviewCount) * 100).toFixed(1)) : 0;

    acc[userId] = {
      ...stats,
      avgRating,
      positivePercentage,
      latestActivityAt: maxIso(stats.latestOrderAt, stats.latestReviewAt, stats.latestListingAt),
    };
    return acc;
  }, {});
};

const mapVerifiedSellerProfile = (profile) => ({
  id: profile.id,
  name: profile.name || "Unknown User",
  email: profile.email || "",
  phone: profile.phone || "",
  city: profile.city || "",
  kycStatus: profile.kyc_status || "unverified",
  profileCompleted: Boolean(profile.profile_completed),
  moderationStatus: profile.moderation_status || "active",
  createdAt: profile.created_at,
  updatedAt: profile.updated_at,
  lastLogin: profile.last_login || null,
  verifiedSeller: Boolean(profile.verified_seller),
  verifiedSellerAt: profile.verified_seller_at || null,
  verifiedSellerNote: profile.verified_seller_note || null,
});

const mapVerifiedSellerOrder = (row, userId, counterpartyById = {}) => {
  const role = row.buyer_id === userId ? "buyer" : "seller";
  const counterpartyId = role === "buyer" ? row.seller_id : row.buyer_id;
  const counterparty = counterpartyById[counterpartyId] || null;

  return {
    id: row.id,
    role,
    status: row.status,
    mode: row.order_mode,
    listingId: row.listing_id,
    listingTitle: row.listings?.title || "Listing",
    listingLink: row.listing_id ? `/listing/${row.listing_id}` : null,
    totalDue: Number(row.total_due || 0),
    createdAt: row.created_at,
    approvedAt: row.approved_at || null,
    rejectedAt: row.rejected_at || null,
    completedAt: row.completed_at || null,
    updatedAt: row.updated_at,
    counterparty: counterparty
      ? {
          id: counterparty.id,
          name: counterparty.name || "Unknown User",
          email: counterparty.email || "",
        }
      : null,
  };
};

const mapVerifiedSellerReview = (row, helpers = {}) => ({
  id: row.id,
  orderId: row.order_id,
  listingId: row.listing_id,
  reviewerId: row.reviewer_id,
  reviewTargetRole: row.review_target_role,
  transactionType: row.transaction_type,
  rating: row.rating,
  title: row.title || "",
  comment: row.comment || "",
  isPublic: Boolean(row.is_public),
  createdAt: row.created_at,
  reviewerName: helpers.reviewerNameById?.get(row.reviewer_id) || "User",
  listingTitle: helpers.listingTitleById?.get(row.listing_id) || "Listing",
});

const buildVerifiedSellerListItem = (profile, stats) => ({
  profile: mapVerifiedSellerProfile(profile),
  stats,
});

const sortVerifiedSellerRows = (rows, sort) => {
  const compare = (left, right, field, ascending = false) => {
    const leftValue = Number(left?.stats?.[field] || 0);
    const rightValue = Number(right?.stats?.[field] || 0);
    if (leftValue === rightValue) {
      const leftName = String(left?.profile?.name || "").toLowerCase();
      const rightName = String(right?.profile?.name || "").toLowerCase();
      return leftName.localeCompare(rightName);
    }
    return ascending ? leftValue - rightValue : rightValue - leftValue;
  };

  const compareDate = (left, right, field, ascending = false) => {
    const leftValue = new Date(left?.stats?.[field] || 0).getTime();
    const rightValue = new Date(right?.stats?.[field] || 0).getTime();
    if (leftValue === rightValue) {
      const leftName = String(left?.profile?.name || "").toLowerCase();
      const rightName = String(right?.profile?.name || "").toLowerCase();
      return leftName.localeCompare(rightName);
    }
    return ascending ? leftValue - rightValue : rightValue - leftValue;
  };

  return [...rows].sort((left, right) => {
    if (sort === "orders_asc") return compare(left, right, "totalOrders", true);
    if (sort === "rating_desc") return compare(left, right, "avgRating", false);
    if (sort === "rating_asc") return compare(left, right, "avgRating", true);
    if (sort === "reviews_desc") return compare(left, right, "totalReviews", false);
    if (sort === "reviews_asc") return compare(left, right, "totalReviews", true);
    if (sort === "positive_desc") return compare(left, right, "positivePercentage", false);
    if (sort === "positive_asc") return compare(left, right, "positivePercentage", true);
    if (sort === "recent_asc") return compareDate(left, right, "latestActivityAt", true);
    return compareDate(left, right, "latestActivityAt", false);
  });
};

const mapUserHistoryOrder = (row, userId, counterpartyById = {}) => {
  const role = row.buyer_id === userId ? "buyer" : "seller";
  const counterpartyId = role === "buyer" ? row.seller_id : row.buyer_id;
  const counterparty = counterpartyById[counterpartyId] || null;

  return {
    id: row.id,
    role,
    status: row.status,
    mode: row.order_mode,
    listingId: row.listing_id,
    listingTitle: row.listings?.title || "Listing",
    listingLink: row.listing_id ? `/listing/${row.listing_id}` : null,
    totalDue: Number(row.total_due || 0),
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
    counterparty: counterparty
      ? {
          id: counterparty.id,
          name: counterparty.name || "Unknown User",
          email: counterparty.email || "",
        }
      : null,
  };
};

const mapDisputeRow = (row) => ({
  id: row.id,
  orderId: row.order_id,
  listingId: row.listing_id,
  buyerId: row.buyer_id,
  sellerId: row.seller_id,
  openedByUserId: row.opened_by_user_id,
  openedByRole: row.opened_by_role,
  counterpartyUserId: row.counterparty_user_id,
  reasonCode: row.reason_code,
  title: row.title,
  description: row.description,
  requestedResolution: row.requested_resolution,
  evidence: row.evidence || [],
  priority: row.priority,
  status: row.status,
  assignedAdminUserId: row.assigned_admin_user_id,
  resolutionVerdict: row.resolution_verdict,
  resolutionSummary: row.resolution_summary,
  resolutionActions: row.resolution_actions || {},
  resolvedByAdminUserId: row.resolved_by_admin_user_id,
  resolvedAt: row.resolved_at,
  closedAt: row.closed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  sla: buildSlaMeta(row),
  buyer: row.buyer || null,
  seller: row.seller || null,
});

const mapDisputeMessageRow = (row) => ({
  id: row.id,
  disputeId: row.dispute_id,
  orderId: row.order_id,
  authorUserId: row.author_user_id,
  authorType: row.author_type,
  body: row.body,
  attachments: row.attachments || [],
  isInternalNote: Boolean(row.is_internal_note),
  createdAt: row.created_at,
});

const mapModerationReport = (row, reporterById = {}) => ({
  id: row.id,
  reporterUserId: row.reporter_user_id,
  reporterName: reporterById[row.reporter_user_id]?.name || "Unknown User",
  reporterEmail: reporterById[row.reporter_user_id]?.email || "",
  reasonCode: row.reason_code,
  description: row.description || null,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  reviewedAt: row.reviewed_at || null,
  reviewedByAdminUserId: row.reviewed_by_admin_user_id || null,
  adminNote: row.admin_note || null,
});

const aggregateReasonCounts = (rows = []) => {
  const counter = {};
  for (const row of rows) {
    const reasonCode = String(row.reason_code || "other");
    counter[reasonCode] = (counter[reasonCode] || 0) + 1;
  }

  return Object.entries(counter)
    .map(([reasonCode, count]) => ({ reasonCode, count }))
    .sort((a, b) => b.count - a.count);
};

const buildReportStats = (rows = []) => ({
  totalReports: rows.length,
  uniqueReporterCount: new Set(rows.map((row) => row.reporter_user_id).filter(Boolean)).size,
  openReports: rows.filter((row) => row.status === "open").length,
  investigatingReports: rows.filter((row) => row.status === "investigating").length,
  actionedReports: rows.filter((row) => row.status === "actioned").length,
  dismissedReports: rows.filter((row) => row.status === "dismissed").length,
});

const mapModerationAction = (row, actorProfileById = {}) => ({
  id: row.id,
  actionType: row.action_type,
  actionNote: row.action_note || null,
  actionMeta: row.action_meta || {},
  createdAt: row.created_at,
  createdByAdminUserId: row.created_by_admin_user_id,
  createdByName: actorProfileById[row.created_by_admin_user_id]?.name || "Admin",
});

const hydrateDisputeRow = async (row) => {
  const evidence = await resolveEvidenceSignedUrls(row?.evidence || []);
  const [buyer, seller] = await Promise.all([
    fetchUserProfile(row?.buyer_id),
    fetchUserProfile(row?.seller_id),
  ]);
  return mapDisputeRow({ ...row, evidence, buyer, seller });
};

const hydrateDisputeMessageRow = async (row) => {
  const attachments = await resolveEvidenceSignedUrls(row?.attachments || []);
  return mapDisputeMessageRow({ ...row, attachments });
};

const createDisputeNotifications = async ({ userIds, title, body, data }) => {
  const uniqueUserIds = [...new Set((userIds || []).filter(Boolean))];
  if (uniqueUserIds.length === 0) {
    return;
  }

  await supabaseAdmin.from("notifications").insert(
    uniqueUserIds.map((userId) => ({
      user_id: userId,
      title,
      body,
      type: "info",
      data: data || {},
    }))
  );
};

const sanitizeEmail = (value) => String(value || "").trim().toLowerCase();

const signAdminPreAuthToken = (payload) => {
  return jwt.sign({ ...payload, token_type: "admin_preauth" }, JWT_SECRET, { expiresIn: "10m" });
};

const verifyAdminPreAuthToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

const buildSafeUserMetadata = (authUser) => {
  const metadata = authUser?.user_metadata || {};
  return {
    full_name: metadata.full_name || metadata.name || "",
  };
};

const buildAppTokenFromAdmin = ({ authUser, adminRow }) => {
  return signAppToken({
    sub: authUser.id,
    email: authUser.email || "",
    email_confirmed_at: authUser.email_confirmed_at,
    user_metadata: buildSafeUserMetadata(authUser),
    admin_role: adminRow.role,
    is_admin: true,
  });
};

const getAdminByUserId = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load admin account");
  }

  return data;
};

const updateAdminLastLogin = async (userId) => {
  await supabaseAdmin.from("admin_users").update({ last_login: new Date().toISOString() }).eq("user_id", userId);
};

const toNormalizedConfidence = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.max(0, Math.min(1, number));
};

const callDocumentAuthenticityService = async ({ contentBase64, documentType, side }) => {
  if (!AI_SERVICE_URL) {
    return {
      verdict: "warn",
      score: 0,
      warnings: ["AI service is not configured."],
      failures: [],
      metrics: { modelReady: false, side, documentType },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_SERVICE_URL}/check-document-authenticity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentBase64, documentType, side }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("Document authenticity service failed");
    }

    const payload = await response.json();
    return {
      verdict: ["accept", "warn", "reject"].includes(String(payload?.verdict || "")) ? payload.verdict : "warn",
      score: toNormalizedConfidence(payload?.score),
      warnings: Array.isArray(payload?.warnings) ? payload.warnings : [],
      failures: Array.isArray(payload?.failures) ? payload.failures : [],
      metrics: payload?.metrics || {},
    };
  } finally {
    clearTimeout(timeout);
  }
};

adminRouter.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const safeEmail = sanitizeEmail(email);

  if (!safeEmail || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email: safeEmail, password });
  if (error || !data?.user) {
    return res.status(401).json({ message: error?.message || "Invalid admin credentials" });
  }

  if (!data.user.email_confirmed_at) {
    return res.status(403).json({ message: "Please verify your email before admin login." });
  }

  const adminRow = await getAdminByUserId(data.user.id);
  if (!adminRow || adminRow.status !== "active") {
    return res.status(403).json({ message: "Admin access denied" });
  }

  if (!ADMIN_MFA_REQUIRED) {
    await updateAdminLastLogin(data.user.id);
    const token = buildAppTokenFromAdmin({ authUser: data.user, adminRow });

    return res.json({
      mfaRequired: false,
      token,
      admin: mapAdminUser(adminRow),
    });
  }

  const preAuthToken = signAdminPreAuthToken({
    sub: data.user.id,
    role: adminRow.role,
    mfa_enabled: Boolean(adminRow.mfa_enabled),
  });

  const mfaSetupRequired = !adminRow.mfa_secret;
  let otpauthUrl = null;
  let qrDataUrl = null;

  if (mfaSetupRequired) {
    const secret = authenticator.generateSecret();
    otpauthUrl = authenticator.keyuri(safeEmail, "RentVerse Admin", secret);
    qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    await supabaseAdmin
      .from("admin_users")
      .update({ mfa_secret: secret })
      .eq("user_id", data.user.id);
  }

  return res.json({
    mfaRequired: true,
    mfaSetupRequired,
    preAuthToken,
    admin: mapAdminUser(adminRow),
    mfa: {
      qrDataUrl,
      otpauthUrl,
    },
  });
});

adminRouter.post("/auth/mfa/verify", async (req, res) => {
  const { preAuthToken, otp } = req.body || {};

  if (!preAuthToken || !otp) {
    return res.status(400).json({ message: "MFA token and one-time code are required" });
  }

  let decoded;
  try {
    decoded = verifyAdminPreAuthToken(preAuthToken);
  } catch {
    return res.status(401).json({ message: "Invalid or expired admin verification session" });
  }

  if (decoded.token_type !== "admin_preauth") {
    return res.status(401).json({ message: "Invalid MFA session" });
  }

  const adminRow = await getAdminByUserId(decoded.sub);
  if (!adminRow || adminRow.status !== "active") {
    return res.status(403).json({ message: "Admin account is not active" });
  }

  if (!adminRow.mfa_secret) {
    return res.status(400).json({ message: "MFA setup missing for this admin account" });
  }

  const isValid = authenticator.verify({ token: String(otp).trim(), secret: adminRow.mfa_secret });
  if (!isValid) {
    return res.status(401).json({ message: "Invalid one-time verification code" });
  }

  const { data: authUserData, error: authError } = await supabaseAdmin.auth.admin.getUserById(adminRow.user_id);
  if (authError || !authUserData?.user) {
    return res.status(500).json({ message: authError?.message || "Failed to load admin user" });
  }

  await supabaseAdmin
    .from("admin_users")
    .update({ mfa_enabled: true, mfa_verified_at: new Date().toISOString() })
    .eq("user_id", adminRow.user_id);

  await updateAdminLastLogin(adminRow.user_id);

  const token = buildAppTokenFromAdmin({ authUser: authUserData.user, adminRow });

  return res.json({
    token,
    admin: mapAdminUser({ ...adminRow, mfa_enabled: true }),
  });
});

adminRouter.get("/me", requireAuth, requireAdminRole("support"), async (req, res) => {
  return res.json({ admin: mapAdminUser(req.admin) });
});

adminRouter.get("/dashboard", requireAuth, requireAdminRole("support"), async (req, res) => {
  await applyDisputeSlaEscalation();

  const [
    usersCount,
    listingsCount,
    ordersCount,
    pendingKycCount,
    openDisputesCount,
    recentAudit,
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("listings").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("marketplace_orders").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("profile_kyc_verifications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabaseAdmin
      .from("marketplace_order_disputes")
      .select("id", { count: "exact", head: true })
      .in("status", ACTIVE_DISPUTE_STATUSES),
    supabaseAdmin
      .from("admin_audit_logs")
      .select("id,actor_user_id,actor_role,action,entity_type,entity_id,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const { data: recentKyc } = await supabaseAdmin
    .from("profile_kyc_verifications")
    .select("user_id,status,document_type,analysis_verdict,analysis_score,submitted_at,review_message")
    .order("submitted_at", { ascending: false })
    .limit(10);

  return res.json({
    stats: {
      users: usersCount.count || 0,
      listings: listingsCount.count || 0,
      orders: ordersCount.count || 0,
      pendingKyc: pendingKycCount.count || 0,
      openDisputes: openDisputesCount.count || 0,
    },
    recentKyc: recentKyc || [],
    recentAudit: recentAudit.data || [],
  });
});

adminRouter.get("/users", requireAuth, requireAdminRole("support"), async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id,name,email,phone,city,kyc_status,created_at,last_login")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to fetch users" });
  }

  const userIds = (data || []).map((row) => row.id);
  let adminByUserId = {};
  if (userIds.length > 0) {
    const { data: admins } = await supabaseAdmin
      .from("admin_users")
      .select("user_id,role,status")
      .in("user_id", userIds);

    adminByUserId = (admins || []).reduce((acc, row) => {
      acc[row.user_id] = row;
      return acc;
    }, {});
  }

  return res.json(
    (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      city: row.city,
      kycStatus: row.kyc_status || "unverified",
      createdAt: row.created_at,
      lastLogin: row.last_login,
      admin: adminByUserId[row.id] || null,
    }))
  );
});

adminRouter.get("/users/:userId/history", requireAuth, requireAdminRole("support"), async (req, res) => {
  const { userId } = req.params;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,name,email,phone,city,kyc_status,profile_completed,created_at,updated_at,last_login")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return res.status(400).json({ message: profileError.message || "Failed to load user profile." });
  }

  if (!profile) {
    return res.status(404).json({ message: "User profile not found." });
  }

  const [listingsResult, buyerOrdersResult, sellerOrdersResult] = await Promise.all([
    supabaseAdmin
      .from("listings")
      .select("id,title,status,listing_type,buy_price,rent_daily_price,rent_weekly_price,rent_monthly_price,created_at,updated_at")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabaseAdmin
      .from("marketplace_orders")
      .select("id,listing_id,buyer_id,seller_id,order_mode,status,total_due,created_at,approved_at,rejected_at,completed_at,updated_at,listings(title)")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabaseAdmin
      .from("marketplace_orders")
      .select("id,listing_id,buyer_id,seller_id,order_mode,status,total_due,created_at,approved_at,rejected_at,completed_at,updated_at,listings(title)")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (listingsResult.error) {
    return res.status(400).json({ message: listingsResult.error.message || "Failed to load user listings." });
  }

  if (buyerOrdersResult.error || sellerOrdersResult.error) {
    return res.status(400).json({ message: buyerOrdersResult.error?.message || sellerOrdersResult.error?.message || "Failed to load user orders." });
  }

  const rawOrders = [...(buyerOrdersResult.data || []), ...(sellerOrdersResult.data || [])];
  const counterpartyIds = [...new Set(
    rawOrders
      .map((row) => (row.buyer_id === userId ? row.seller_id : row.buyer_id))
      .filter(Boolean)
  )];

  let counterpartyById = {};
  if (counterpartyIds.length > 0) {
    const { data: counterpartyProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id,name,email")
      .in("id", counterpartyIds);

    counterpartyById = (counterpartyProfiles || []).reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }

  const orders = rawOrders
    .map((row) => mapUserHistoryOrder(row, userId, counterpartyById))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const completedOrders = orders.filter((row) => row.status === "completed");

  return res.json({
    profile: {
      id: profile.id,
      name: profile.name || "Unknown User",
      email: profile.email || "",
      phone: profile.phone || "",
      city: profile.city || "",
      kycStatus: profile.kyc_status || "unverified",
      profileCompleted: Boolean(profile.profile_completed),
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      lastLogin: profile.last_login,
    },
    listings: (listingsResult.data || []).map((listing) => ({
      id: listing.id,
      title: listing.title,
      status: listing.status,
      listingType: listing.listing_type,
      buyPrice: listing.buy_price,
      rentDailyPrice: listing.rent_daily_price,
      rentWeeklyPrice: listing.rent_weekly_price,
      rentMonthlyPrice: listing.rent_monthly_price,
      createdAt: listing.created_at,
      updatedAt: listing.updated_at,
      link: `/listing/${listing.id}`,
    })),
    orders: {
      all: orders,
      completed: completedOrders,
      summary: {
        total: orders.length,
        asBuyer: orders.filter((row) => row.role === "buyer").length,
        asSeller: orders.filter((row) => row.role === "seller").length,
        completed: completedOrders.length,
        rejected: orders.filter((row) => row.status === "rejected").length,
        cancelled: orders.filter((row) => row.status === "cancelled").length,
      },
    },
  });
});

adminRouter.get("/verified-sellers", requireAuth, requireAdminRole("support"), async (req, res) => {
  const status = normalizeVerifiedSellerStatus(req.query.status);
  const sort = normalizeVerifiedSellerSort(req.query.sort);
  const search = String(req.query.search || "").trim().toLowerCase();

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,name,email,phone,city,kyc_status,profile_completed,moderation_status,created_at,updated_at,last_login,verified_seller,verified_seller_at,verified_seller_note")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (profileError) {
    return res.status(400).json({ message: profileError.message || "Failed to load verified seller candidates." });
  }

  const profileRows = (profiles || []).filter((profile) => {
    if (status === "all") {
      return true;
    }
    return status === "verified" ? Boolean(profile.verified_seller) : !Boolean(profile.verified_seller);
  });

  const filteredProfiles = search
    ? profileRows.filter((profile) => {
        const text = [profile.name, profile.email, profile.phone, profile.city, profile.kyc_status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(search);
      })
    : profileRows;

  const userIds = filteredProfiles.map((profile) => profile.id);
  if (userIds.length === 0) {
    return res.json([]);
  }

  const [buyerOrdersResult, sellerOrdersResult, reviewsResult, listingsResult] = await Promise.all([
    supabaseAdmin
      .from("marketplace_orders")
      .select("id,listing_id,buyer_id,seller_id,order_mode,status,total_due,created_at,approved_at,rejected_at,completed_at,updated_at,listings(title)")
      .in("buyer_id", userIds),
    supabaseAdmin
      .from("marketplace_orders")
      .select("id,listing_id,buyer_id,seller_id,order_mode,status,total_due,created_at,approved_at,rejected_at,completed_at,updated_at,listings(title)")
      .in("seller_id", userIds),
    supabaseAdmin
      .from("marketplace_reviews")
      .select("id,order_id,listing_id,reviewer_id,reviewee_id,review_target_role,transaction_type,rating,title,comment,is_public,created_at")
      .eq("is_public", true)
      .in("reviewee_id", userIds),
    supabaseAdmin
      .from("listings")
      .select("id,title,status,listing_type,owner_user_id,created_at,updated_at")
      .in("owner_user_id", userIds),
  ]);

  if (buyerOrdersResult.error || sellerOrdersResult.error || reviewsResult.error || listingsResult.error) {
    return res.status(400).json({
      message:
        buyerOrdersResult.error?.message ||
        sellerOrdersResult.error?.message ||
        reviewsResult.error?.message ||
        listingsResult.error?.message ||
        "Failed to load verified seller metrics.",
    });
  }

  const combinedOrders = [...(buyerOrdersResult.data || []), ...(sellerOrdersResult.data || [])];
  const statsByUserId = aggregateVerifiedSellerStats({
    profiles: filteredProfiles,
    orders: combinedOrders,
    reviews: reviewsResult.data || [],
    listings: listingsResult.data || [],
  });

  const rows = sortVerifiedSellerRows(
    filteredProfiles.map((profile) => buildVerifiedSellerListItem(profile, statsByUserId[profile.id] || createVerifiedSellerStats())),
    sort
  );

  return res.json(rows);
});

adminRouter.get("/verified-sellers/:userId", requireAuth, requireAdminRole("support"), async (req, res) => {
  const { userId } = req.params;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,name,email,phone,city,kyc_status,profile_completed,moderation_status,created_at,updated_at,last_login,verified_seller,verified_seller_at,verified_seller_note")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return res.status(400).json({ message: profileError.message || "Failed to load seller profile." });
  }

  if (!profile) {
    return res.status(404).json({ message: "Profile not found." });
  }

  const [buyerOrdersResult, sellerOrdersResult, reviewsResult, listingsResult] = await Promise.all([
    supabaseAdmin
      .from("marketplace_orders")
      .select("id,listing_id,buyer_id,seller_id,order_mode,status,total_due,created_at,approved_at,rejected_at,completed_at,updated_at,listings(title)")
      .eq("buyer_id", userId),
    supabaseAdmin
      .from("marketplace_orders")
      .select("id,listing_id,buyer_id,seller_id,order_mode,status,total_due,created_at,approved_at,rejected_at,completed_at,updated_at,listings(title)")
      .eq("seller_id", userId),
    supabaseAdmin
      .from("marketplace_reviews")
      .select("id,order_id,listing_id,reviewer_id,reviewee_id,review_target_role,transaction_type,rating,title,comment,is_public,created_at")
      .eq("reviewee_id", userId)
      .eq("is_public", true),
    supabaseAdmin
      .from("listings")
      .select("id,title,status,listing_type,owner_user_id,created_at,updated_at")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (buyerOrdersResult.error || sellerOrdersResult.error || reviewsResult.error || listingsResult.error) {
    return res.status(400).json({
      message:
        buyerOrdersResult.error?.message ||
        sellerOrdersResult.error?.message ||
        reviewsResult.error?.message ||
        listingsResult.error?.message ||
        "Failed to load seller details.",
    });
  }

  const ordersById = new Map();
  for (const row of [...(buyerOrdersResult.data || []), ...(sellerOrdersResult.data || [])]) {
    if (row?.id) {
      ordersById.set(row.id, row);
    }
  }
  const uniqueOrders = [...ordersById.values()].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
  const reviewRows = reviewsResult.data || [];
  const listingRows = listingsResult.data || [];

  const reviewListingIds = [...new Set(reviewRows.map((row) => row.listing_id).filter(Boolean))];
  const reviewerIds = [...new Set(reviewRows.map((row) => row.reviewer_id).filter(Boolean))];
  const counterpartyIds = [...new Set(uniqueOrders.map((row) => (row.buyer_id === userId ? row.seller_id : row.buyer_id)).filter(Boolean))];

  let reviewerById = {};
  let listingTitleById = {};
  let counterpartyById = {};

  if (reviewerIds.length > 0) {
    const { data: reviewerProfiles } = await supabaseAdmin.from("profiles").select("id,name").in("id", reviewerIds);
    reviewerById = (reviewerProfiles || []).reduce((acc, row) => {
      acc[row.id] = row;
      return acc;
    }, {});
  }

  if (reviewListingIds.length > 0) {
    const { data: reviewListings } = await supabaseAdmin.from("listings").select("id,title").in("id", reviewListingIds);
    listingTitleById = (reviewListings || []).reduce((acc, row) => {
      acc[row.id] = row.title || "Listing";
      return acc;
    }, {});
  }

  if (counterpartyIds.length > 0) {
    const { data: counterpartyProfiles } = await supabaseAdmin.from("profiles").select("id,name,email").in("id", counterpartyIds);
    counterpartyById = (counterpartyProfiles || []).reduce((acc, row) => {
      acc[row.id] = row;
      return acc;
    }, {});
  }

  const statsByUserId = aggregateVerifiedSellerStats({
    profiles: [profile],
    orders: uniqueOrders,
    reviews: reviewRows,
    listings: listingRows,
  });

  return res.json({
    profile: mapVerifiedSellerProfile(profile),
    stats: statsByUserId[userId] || createVerifiedSellerStats(),
    listings: listingRows.map((listing) => ({
      id: listing.id,
      title: listing.title,
      status: listing.status,
      listingType: listing.listing_type,
      createdAt: listing.created_at,
      updatedAt: listing.updated_at,
      link: `/listing/${listing.id}`,
    })),
    orders: uniqueOrders.map((row) => mapVerifiedSellerOrder(row, userId, counterpartyById)),
    reviews: reviewRows.map((row) => mapVerifiedSellerReview(row, { reviewerNameById: new Map(Object.entries(reviewerById).map(([id, item]) => [id, item.name || "User"])), listingTitleById: new Map(Object.entries(listingTitleById).map(([id, title]) => [id, title])) })),
  });
});

adminRouter.post("/verified-sellers/:userId/status", requireAuth, requireAdminRole("support"), async (req, res) => {
  const { userId } = req.params;
  const verified = Boolean(req.body?.verified);
  const note = String(req.body?.note || "").trim();
  const nowIso = new Date().toISOString();

  const { data: updatedProfile, error } = await supabaseAdmin
    .from("profiles")
    .update({
      verified_seller: verified,
      verified_seller_at: verified ? nowIso : null,
      verified_seller_by_user_id: verified ? req.admin.user_id : null,
      verified_seller_note: note || null,
      updated_at: nowIso,
    })
    .eq("id", userId)
    .select("id,name,email,phone,city,kyc_status,profile_completed,moderation_status,created_at,updated_at,last_login,verified_seller,verified_seller_at,verified_seller_note")
    .maybeSingle();

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to update verified seller status." });
  }

  if (!updatedProfile) {
    return res.status(404).json({ message: "Profile not found." });
  }

  await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    title: verified ? "Verified seller approved" : "Verified seller removed",
    body: verified
      ? `Your RentVerse verified seller status has been approved.${note ? ` Note: ${note}` : ""}`
      : `Your RentVerse verified seller status has been removed.${note ? ` Note: ${note}` : ""}`,
    type: "info",
    data: {
      kind: "verified_seller_status",
      verified,
      note: note || null,
      adminUserId: req.admin.user_id,
    },
  });

  await logAdminAudit({
    actorUserId: req.admin.user_id,
    actorRole: req.admin.role,
    action: verified ? "verified_seller.approve" : "verified_seller.revoke",
    entityType: "profile",
    entityId: userId,
    metadata: { verified, note: note || null },
    ipAddress: req.ip,
  });

  return res.json({
    ok: true,
    profile: mapVerifiedSellerProfile(updatedProfile),
  });
});

adminRouter.get("/reports/listings", requireAuth, requireAdminRole("moderator"), async (req, res) => {
  const status = String(req.query.status || "").trim();
  if (status && !REPORT_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid report status." });
  }

  let query = supabaseAdmin
    .from("moderation_reports")
    .select("*")
    .eq("target_type", "listing")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return res.status(400).json({ message: error.message || "Failed to load listing reports." });
  }

  const rows = data || [];
  const listingIds = [...new Set(rows.map((row) => row.target_listing_id).filter(Boolean))];

  let listingById = {};
  if (listingIds.length > 0) {
    const { data: listings } = await supabaseAdmin
      .from("listings")
      .select("id,title,status,owner_user_id,owner_name,owner_email,category,listing_type,created_at,updated_at")
      .in("id", listingIds);

    listingById = (listings || []).reduce((acc, row) => {
      acc[row.id] = row;
      return acc;
    }, {});
  }

  const grouped = rows.reduce((acc, row) => {
    const key = row.target_listing_id;
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const payload = Object.entries(grouped)
    .map(([targetId, targetRows]) => {
      const listing = listingById[targetId] || null;
      const sortedRows = [...targetRows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return {
        targetId,
        listing: listing
          ? {
              id: listing.id,
              title: listing.title,
              status: listing.status,
              ownerUserId: listing.owner_user_id,
              ownerName: listing.owner_name || "",
              ownerEmail: listing.owner_email || "",
              category: listing.category || "",
              listingType: listing.listing_type || "",
              createdAt: listing.created_at,
              updatedAt: listing.updated_at,
              link: `/listing/${listing.id}`,
            }
          : null,
        ...buildReportStats(targetRows),
        latestReportAt: sortedRows[0]?.created_at || null,
        reasons: aggregateReasonCounts(targetRows),
        latestComments: sortedRows
          .map((row) => String(row.description || "").trim())
          .filter(Boolean)
          .slice(0, 5),
      };
    })
    .sort((a, b) => new Date(b.latestReportAt || 0).getTime() - new Date(a.latestReportAt || 0).getTime());

  return res.json(payload);
});

adminRouter.get("/reports/listings/:listingId", requireAuth, requireAdminRole("moderator"), async (req, res) => {
  const { listingId } = req.params;

  const [reportsResult, listingResult, actionsResult] = await Promise.all([
    supabaseAdmin
      .from("moderation_reports")
      .select("*")
      .eq("target_type", "listing")
      .eq("target_listing_id", listingId)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabaseAdmin
      .from("listings")
      .select("id,title,status,owner_user_id,owner_name,owner_email,category,listing_type,created_at,updated_at")
      .eq("id", listingId)
      .maybeSingle(),
    supabaseAdmin
      .from("moderation_actions")
      .select("*")
      .eq("target_type", "listing")
      .eq("target_listing_id", listingId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (reportsResult.error) {
    return res.status(400).json({ message: reportsResult.error.message || "Failed to load listing report details." });
  }

  if (listingResult.error) {
    return res.status(400).json({ message: listingResult.error.message || "Failed to load listing." });
  }

  if (actionsResult.error) {
    return res.status(400).json({ message: actionsResult.error.message || "Failed to load moderation actions." });
  }

  const reports = reportsResult.data || [];
  const actions = actionsResult.data || [];

  const reporterIds = [...new Set(reports.map((row) => row.reporter_user_id).filter(Boolean))];
  const actionActorIds = [...new Set(actions.map((row) => row.created_by_admin_user_id).filter(Boolean))];
  const profileIds = [...new Set([...reporterIds, ...actionActorIds])];

  let profileById = {};
  if (profileIds.length > 0) {
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id,name,email").in("id", profileIds);
    profileById = (profiles || []).reduce((acc, row) => {
      acc[row.id] = row;
      return acc;
    }, {});
  }

  const listing = listingResult.data
    ? {
        id: listingResult.data.id,
        title: listingResult.data.title,
        status: listingResult.data.status,
        ownerUserId: listingResult.data.owner_user_id,
        ownerName: listingResult.data.owner_name || "",
        ownerEmail: listingResult.data.owner_email || "",
        category: listingResult.data.category || "",
        listingType: listingResult.data.listing_type || "",
        createdAt: listingResult.data.created_at,
        updatedAt: listingResult.data.updated_at,
        link: `/listing/${listingResult.data.id}`,
      }
    : null;

  return res.json({
    targetId: listingId,
    listing,
    reports: reports.map((row) => mapModerationReport(row, profileById)),
    actions: actions.map((row) => mapModerationAction(row, profileById)),
    stats: buildReportStats(reports),
  });
});

adminRouter.post("/reports/listings/:listingId/actions", requireAuth, requireAdminRole("moderator"), async (req, res) => {
  const { listingId } = req.params;
  const actionType = String(req.body?.actionType || "").trim();
  const note = String(req.body?.note || "").trim();

  if (!LISTING_REPORT_ACTIONS.includes(actionType)) {
    return res.status(400).json({ message: "Invalid listing moderation action." });
  }

  const { data: listing } = await supabaseAdmin
    .from("listings")
    .select("id,status")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing && actionType !== "dismiss_reports") {
    return res.status(404).json({ message: "Listing not found." });
  }

  if (actionType === "pause_listing") {
    await supabaseAdmin.from("listings").update({ status: "paused" }).eq("id", listingId);
  }
  if (actionType === "activate_listing") {
    await supabaseAdmin.from("listings").update({ status: "active" }).eq("id", listingId);
  }
  if (actionType === "delete_listing") {
    await supabaseAdmin.from("listings").delete().eq("id", listingId);
  }

  const nextReportStatus =
    actionType === "dismiss_reports"
      ? "dismissed"
      : actionType === "mark_investigating"
      ? "investigating"
      : "actioned";

  await supabaseAdmin
    .from("moderation_reports")
    .update({
      status: nextReportStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by_admin_user_id: req.admin.user_id,
      admin_note: note || null,
      updated_at: new Date().toISOString(),
    })
    .eq("target_type", "listing")
    .eq("target_listing_id", listingId);

  await supabaseAdmin.from("moderation_actions").insert({
    target_type: "listing",
    target_listing_id: listingId,
    action_type: actionType,
    action_note: note || null,
    action_meta: {
      beforeStatus: listing?.status || null,
      nextReportStatus,
    },
    created_by_admin_user_id: req.admin.user_id,
  });

  await logAdminAudit({
    actorUserId: req.admin.user_id,
    actorRole: req.admin.role,
    action: "report.listing.action",
    entityType: "listing",
    entityId: listingId,
    metadata: { actionType, nextReportStatus, note: note || null },
    ipAddress: req.ip,
  });

  return res.json({ ok: true });
});

adminRouter.get("/reports/users", requireAuth, requireAdminRole("support"), async (req, res) => {
  const status = String(req.query.status || "").trim();
  if (status && !REPORT_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid report status." });
  }

  let query = supabaseAdmin
    .from("moderation_reports")
    .select("*")
    .eq("target_type", "user")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return res.status(400).json({ message: error.message || "Failed to load user reports." });
  }

  const rows = data || [];
  const userIds = [...new Set(rows.map((row) => row.target_user_id).filter(Boolean))];

  let userById = {};
  if (userIds.length > 0) {
    const { data: users } = await supabaseAdmin
      .from("profiles")
      .select("id,name,email,phone,city,kyc_status,moderation_status,moderation_note,moderated_at,created_at,updated_at")
      .in("id", userIds);

    userById = (users || []).reduce((acc, row) => {
      acc[row.id] = row;
      return acc;
    }, {});
  }

  const grouped = rows.reduce((acc, row) => {
    const key = row.target_user_id;
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const payload = Object.entries(grouped)
    .map(([targetId, targetRows]) => {
      const user = userById[targetId] || null;
      const sortedRows = [...targetRows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return {
        targetId,
        user: user
          ? {
              id: user.id,
              name: user.name || "Unknown User",
              email: user.email || "",
              phone: user.phone || "",
              city: user.city || "",
              kycStatus: user.kyc_status || "unverified",
              moderationStatus: user.moderation_status || "active",
              moderationNote: user.moderation_note || null,
              moderatedAt: user.moderated_at || null,
              createdAt: user.created_at,
              updatedAt: user.updated_at,
              profileLink: `/user/${user.id}`,
            }
          : null,
        ...buildReportStats(targetRows),
        latestReportAt: sortedRows[0]?.created_at || null,
        reasons: aggregateReasonCounts(targetRows),
        latestComments: sortedRows
          .map((row) => String(row.description || "").trim())
          .filter(Boolean)
          .slice(0, 5),
      };
    })
    .sort((a, b) => new Date(b.latestReportAt || 0).getTime() - new Date(a.latestReportAt || 0).getTime());

  return res.json(payload);
});

adminRouter.get("/reports/users/:userId", requireAuth, requireAdminRole("support"), async (req, res) => {
  const { userId } = req.params;

  const [reportsResult, userResult, actionsResult] = await Promise.all([
    supabaseAdmin
      .from("moderation_reports")
      .select("*")
      .eq("target_type", "user")
      .eq("target_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabaseAdmin
      .from("profiles")
      .select("id,name,email,phone,city,kyc_status,moderation_status,moderation_note,moderated_at,created_at,updated_at")
      .eq("id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("moderation_actions")
      .select("*")
      .eq("target_type", "user")
      .eq("target_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (reportsResult.error) {
    return res.status(400).json({ message: reportsResult.error.message || "Failed to load user report details." });
  }

  if (userResult.error) {
    return res.status(400).json({ message: userResult.error.message || "Failed to load user." });
  }

  if (actionsResult.error) {
    return res.status(400).json({ message: actionsResult.error.message || "Failed to load moderation actions." });
  }

  const reports = reportsResult.data || [];
  const actions = actionsResult.data || [];

  const reporterIds = [...new Set(reports.map((row) => row.reporter_user_id).filter(Boolean))];
  const actionActorIds = [...new Set(actions.map((row) => row.created_by_admin_user_id).filter(Boolean))];
  const profileIds = [...new Set([...reporterIds, ...actionActorIds])];

  let profileById = {};
  if (profileIds.length > 0) {
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id,name,email").in("id", profileIds);
    profileById = (profiles || []).reduce((acc, row) => {
      acc[row.id] = row;
      return acc;
    }, {});
  }

  const user = userResult.data
    ? {
        id: userResult.data.id,
        name: userResult.data.name || "Unknown User",
        email: userResult.data.email || "",
        phone: userResult.data.phone || "",
        city: userResult.data.city || "",
        kycStatus: userResult.data.kyc_status || "unverified",
        moderationStatus: userResult.data.moderation_status || "active",
        moderationNote: userResult.data.moderation_note || null,
        moderatedAt: userResult.data.moderated_at || null,
        createdAt: userResult.data.created_at,
        updatedAt: userResult.data.updated_at,
        profileLink: `/user/${userResult.data.id}`,
      }
    : null;

  return res.json({
    targetId: userId,
    user,
    reports: reports.map((row) => mapModerationReport(row, profileById)),
    actions: actions.map((row) => mapModerationAction(row, profileById)),
    stats: buildReportStats(reports),
  });
});

adminRouter.post("/reports/users/:userId/actions", requireAuth, requireAdminRole("support"), async (req, res) => {
  const { userId } = req.params;
  const actionType = String(req.body?.actionType || "").trim();
  const note = String(req.body?.note || "").trim();

  if (!USER_REPORT_ACTIONS.includes(actionType)) {
    return res.status(400).json({ message: "Invalid user moderation action." });
  }

  const { data: userProfile } = await supabaseAdmin
    .from("profiles")
    .select("id,moderation_status")
    .eq("id", userId)
    .maybeSingle();

  if (!userProfile && actionType !== "dismiss_reports") {
    return res.status(404).json({ message: "User profile not found." });
  }

  const nowIso = new Date().toISOString();
  if (actionType === "restrict_listing_activity") {
    await supabaseAdmin
      .from("profiles")
      .update({
        moderation_status: "restricted",
        moderation_note: note || "Restricted from listing activity by moderation action",
        moderated_at: nowIso,
        moderated_by_user_id: req.admin.user_id,
      })
      .eq("id", userId);

    await supabaseAdmin.from("listings").update({ status: "paused" }).eq("owner_user_id", userId).eq("status", "active");
  }

  if (actionType === "restrict_messaging") {
    await supabaseAdmin
      .from("profiles")
      .update({
        moderation_status: "restricted",
        moderation_note: note || "Restricted from messaging by moderation action",
        moderated_at: nowIso,
        moderated_by_user_id: req.admin.user_id,
      })
      .eq("id", userId);
  }

  if (actionType === "restrict_order_activity") {
    await supabaseAdmin
      .from("profiles")
      .update({
        moderation_status: "restricted",
        moderation_note: note || "Restricted from order activity by moderation action",
        moderated_at: nowIso,
        moderated_by_user_id: req.admin.user_id,
      })
      .eq("id", userId);
  }

  if (actionType === "restrict_all_activity") {
    await supabaseAdmin
      .from("profiles")
      .update({
        moderation_status: "restricted",
        moderation_note: note || "Restricted from listings, messaging, and orders by moderation action",
        moderated_at: nowIso,
        moderated_by_user_id: req.admin.user_id,
      })
      .eq("id", userId);

    await supabaseAdmin.from("listings").update({ status: "paused" }).eq("owner_user_id", userId).eq("status", "active");
  }

  if (actionType === "suspend_user") {
    await supabaseAdmin
      .from("profiles")
      .update({
        moderation_status: "suspended",
        moderation_note: note || "Suspended by moderation action",
        moderated_at: nowIso,
        moderated_by_user_id: req.admin.user_id,
      })
      .eq("id", userId);

    await supabaseAdmin.from("listings").update({ status: "paused" }).eq("owner_user_id", userId).eq("status", "active");
  }

  if (actionType === "clear_user_restrictions") {
    await supabaseAdmin
      .from("profiles")
      .update({
        moderation_status: "active",
        moderation_note: note || null,
        moderated_at: nowIso,
        moderated_by_user_id: req.admin.user_id,
      })
      .eq("id", userId);
  }

  if (actionType === "warn_user") {
    await supabaseAdmin
      .from("profiles")
      .update({
        moderation_note: note || "User warned by moderation action",
        moderated_at: nowIso,
        moderated_by_user_id: req.admin.user_id,
      })
      .eq("id", userId);
  }

  const nextReportStatus =
    actionType === "dismiss_reports"
      ? "dismissed"
      : actionType === "mark_investigating"
      ? "investigating"
      : "actioned";

  const actionEffects = {
    warn_user: "Your account has received an official warning.",
    restrict_listing_activity: "You are restricted from creating or managing listings. Existing active listings were paused.",
    restrict_messaging: "You are restricted from sending messages to other users.",
    restrict_order_activity: "You are restricted from placing new orders and order interactions.",
    restrict_all_activity: "You are restricted across listings, messaging, and order actions. Existing active listings were paused.",
    suspend_user: "Your account has been suspended (banned). Existing active listings were paused.",
    clear_user_restrictions: "Previous restrictions on your account have been cleared.",
    dismiss_reports: "Reports against your account were reviewed and dismissed with no penalties.",
    mark_investigating: "Reports against your account are now under investigation.",
  };

  const effectText = actionEffects[actionType] || "Your account moderation status was updated.";
  const noteText = note ? ` Admin note: ${note}` : "";

  await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    title: "Account moderation update",
    body: `${effectText}${noteText}`,
    type: actionType === "warn_user" || actionType.includes("restrict") || actionType === "suspend_user" ? "warning" : "info",
    data: {
      kind: "moderation_action",
      actionType,
      effectText,
      adminNote: note || null,
      nextReportStatus,
    },
  });

  await supabaseAdmin
    .from("moderation_reports")
    .update({
      status: nextReportStatus,
      reviewed_at: nowIso,
      reviewed_by_admin_user_id: req.admin.user_id,
      admin_note: note || null,
      updated_at: nowIso,
    })
    .eq("target_type", "user")
    .eq("target_user_id", userId);

  await supabaseAdmin.from("moderation_actions").insert({
    target_type: "user",
    target_user_id: userId,
    action_type: actionType,
    action_note: note || null,
    action_meta: {
      beforeStatus: userProfile?.moderation_status || null,
      nextReportStatus,
      effectText,
    },
    created_by_admin_user_id: req.admin.user_id,
  });

  await logAdminAudit({
    actorUserId: req.admin.user_id,
    actorRole: req.admin.role,
    action: "report.user.action",
    entityType: "user",
    entityId: userId,
    metadata: { actionType, nextReportStatus, note: note || null },
    ipAddress: req.ip,
  });

  return res.json({ ok: true });
});

adminRouter.get("/workers", requireAuth, requireAdminRole("manager"), async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id,user_id,email,full_name,role,status,mfa_enabled,last_login,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to load workers" });
  }

  return res.json((data || []).map(mapAdminUser));
});

adminRouter.post("/workers", requireAuth, requireAdminRole("manager"), async (req, res) => {
  const actor = req.admin;
  const { email, password, fullName, role } = req.body || {};

  const safeEmail = sanitizeEmail(email);
  if (!safeEmail || !password || !fullName || !ADMIN_ROLES.includes(role)) {
    return res.status(400).json({ message: "email, password, fullName and valid role are required" });
  }

  if (!canManageRole(actor.role, role)) {
    return res.status(403).json({ message: "You cannot create this role level" });
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: safeEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created?.user) {
    return res.status(400).json({ message: createError?.message || "Failed to create admin worker account" });
  }

  const userId = created.user.id;

  await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      name: fullName,
      email: safeEmail,
      profile_completed: true,
      last_login: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("admin_users")
    .insert({
      user_id: userId,
      email: safeEmail,
      full_name: fullName,
      role,
      status: "active",
      created_by_user_id: actor.user_id,
      invited_by_user_id: actor.user_id,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    return res.status(400).json({ message: insertError?.message || "Failed to register worker as admin" });
  }

  await logAdminAudit({
    actorUserId: actor.user_id,
    actorRole: actor.role,
    action: "worker.create",
    entityType: "admin_user",
    entityId: inserted.user_id,
    metadata: { role, email: safeEmail },
    ipAddress: req.ip,
  });

  return res.status(201).json(mapAdminUser(inserted));
});

adminRouter.patch("/workers/:userId", requireAuth, requireAdminRole("manager"), async (req, res) => {
  const actor = req.admin;
  const { userId } = req.params;
  const { role, status } = req.body || {};

  const { data: target, error: targetError } = await supabaseAdmin
    .from("admin_users")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (targetError) {
    return res.status(400).json({ message: targetError.message || "Failed to load target worker" });
  }
  if (!target) {
    return res.status(404).json({ message: "Target worker not found" });
  }

  if (target.user_id === actor.user_id && status === "suspended") {
    return res.status(400).json({ message: "You cannot suspend your own account" });
  }

  const nextRole = role || target.role;
  const nextStatus = status || target.status;

  if (role && (!ADMIN_ROLES.includes(role) || !canManageRole(actor.role, role))) {
    return res.status(403).json({ message: "You cannot assign this role level" });
  }

  if (!ADMIN_STATUSES.includes(nextStatus)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  if (!canManageRole(actor.role, target.role) && actor.role !== "superadmin") {
    return res.status(403).json({ message: "You cannot edit this worker account" });
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("admin_users")
    .update({ role: nextRole, status: nextStatus })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (updateError || !updated) {
    return res.status(400).json({ message: updateError?.message || "Failed to update worker" });
  }

  await logAdminAudit({
    actorUserId: actor.user_id,
    actorRole: actor.role,
    action: "worker.update",
    entityType: "admin_user",
    entityId: userId,
    metadata: { role: nextRole, status: nextStatus },
    ipAddress: req.ip,
  });

  return res.json(mapAdminUser(updated));
});

adminRouter.get("/listings", requireAuth, requireAdminRole("moderator"), async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("listings")
    .select("id,title,status,owner_user_id,owner_name,owner_email,category,listing_type,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to load listings" });
  }

  return res.json(data || []);
});

adminRouter.patch("/listings/:listingId", requireAuth, requireAdminRole("moderator"), async (req, res) => {
  const { listingId } = req.params;
  const { status } = req.body || {};

  const allowed = ["draft", "active", "paused", "archived", "pending", "sold", "rented"];
  if (!allowed.includes(String(status || ""))) {
    return res.status(400).json({ message: "Invalid listing status" });
  }

  const { data, error } = await supabaseAdmin
    .from("listings")
    .update({ status })
    .eq("id", listingId)
    .select("id,status,title")
    .single();

  if (error || !data) {
    return res.status(400).json({ message: error?.message || "Failed to update listing" });
  }

  await logAdminAudit({
    actorUserId: req.admin.user_id,
    actorRole: req.admin.role,
    action: "listing.status.update",
    entityType: "listing",
    entityId: listingId,
    metadata: { status },
    ipAddress: req.ip,
  });

  return res.json(data);
});

adminRouter.delete("/listings/:listingId", requireAuth, requireAdminRole("admin"), async (req, res) => {
  const { listingId } = req.params;

  const { error } = await supabaseAdmin.from("listings").delete().eq("id", listingId);
  if (error) {
    return res.status(400).json({ message: error.message || "Failed to delete listing" });
  }

  await logAdminAudit({
    actorUserId: req.admin.user_id,
    actorRole: req.admin.role,
    action: "listing.delete",
    entityType: "listing",
    entityId: listingId,
    metadata: {},
    ipAddress: req.ip,
  });

  return res.json({ ok: true });
});

adminRouter.get("/orders", requireAuth, requireAdminRole("support"), async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("marketplace_orders")
    .select(
      "id,listing_id,buyer_id,seller_id,order_mode,quantity,total_due,payment_method,payment_confirmed,status,status_reason,created_at,updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to load orders" });
  }

  return res.json(data || []);
});

adminRouter.patch("/orders/:orderId", requireAuth, requireAdminRole("support"), async (req, res) => {
  const { orderId } = req.params;
  const { status, statusReason } = req.body || {};
  const allowed = [
    "pending_seller_approval",
    "approved",
    "handover_otp_pending",
    "in_use",
    "return_otp_pending",
    "completed",
    "rejected",
    "cancelled",
  ];

  if (!allowed.includes(String(status || ""))) {
    return res.status(400).json({ message: "Invalid order status" });
  }

  const { data, error } = await supabaseAdmin
    .from("marketplace_orders")
    .update({ status, status_reason: statusReason || null })
    .eq("id", orderId)
    .select("id,status,status_reason")
    .single();

  if (error || !data) {
    return res.status(400).json({ message: error?.message || "Failed to update order" });
  }

  await logAdminAudit({
    actorUserId: req.admin.user_id,
    actorRole: req.admin.role,
    action: "order.status.update",
    entityType: "order",
    entityId: orderId,
    metadata: { status, statusReason: statusReason || null },
    ipAddress: req.ip,
  });

  return res.json(data);
});

adminRouter.get("/disputes", requireAuth, requireAdminRole("support"), async (req, res) => {
  const status = String(req.query.status || "").trim();
  const priority = String(req.query.priority || "").trim();
  const limit = Math.min(200, Math.max(1, Number.parseInt(String(req.query.limit || "100"), 10) || 100));

  let query = supabaseAdmin
    .from("marketplace_order_disputes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    if (!DISPUTE_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid dispute status." });
    }
    query = query.eq("status", status);
  }

  if (priority) {
    if (!DISPUTE_PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: "Invalid dispute priority." });
    }
    query = query.eq("priority", priority);
  }

  await applyDisputeSlaEscalation();

  const { data, error } = await query;

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to load disputes." });
  }

  const hydrated = await Promise.all((data || []).map((row) => hydrateDisputeRow(row)));
  return res.json(hydrated);
});

adminRouter.get("/disputes/:disputeId", requireAuth, requireAdminRole("support"), async (req, res) => {
  const { disputeId } = req.params;

  await applyDisputeSlaEscalation();

  const { data: dispute, error: disputeError } = await supabaseAdmin
    .from("marketplace_order_disputes")
    .select("*")
    .eq("id", disputeId)
    .single();

  if (disputeError || !dispute) {
    return res.status(404).json({ message: disputeError?.message || "Dispute not found." });
  }

  const { data: messages, error: messagesError } = await supabaseAdmin
    .from("marketplace_order_dispute_messages")
    .select("*")
    .eq("dispute_id", disputeId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return res.status(400).json({ message: messagesError.message || "Failed to load dispute messages." });
  }

  const hydratedDispute = await hydrateDisputeRow(dispute);
  const hydratedMessages = await Promise.all((messages || []).map((row) => hydrateDisputeMessageRow(row)));

  return res.json({
    dispute: hydratedDispute,
    messages: hydratedMessages,
  });
});

adminRouter.patch("/disputes/:disputeId/assign", requireAuth, requireAdminRole("support"), async (req, res) => {
  const { disputeId } = req.params;
  const assignToUserId = req.body?.assignToUserId === null ? null : String(req.body?.assignToUserId || req.admin.user_id);

  const { data: existingDispute } = await supabaseAdmin
    .from("marketplace_order_disputes")
    .select("id,order_id,buyer_id,seller_id,title")
    .eq("id", disputeId)
    .single();

  const { data, error } = await supabaseAdmin
    .from("marketplace_order_disputes")
    .update({
      assigned_admin_user_id: assignToUserId,
      status: assignToUserId ? "under_review" : "open",
      updated_at: new Date().toISOString(),
    })
    .eq("id", disputeId)
    .select("*")
    .single();

  if (error || !data) {
    return res.status(400).json({ message: error?.message || "Failed to assign dispute." });
  }

  await logAdminAudit({
    actorUserId: req.admin.user_id,
    actorRole: req.admin.role,
    action: "dispute.assign",
    entityType: "order_dispute",
    entityId: disputeId,
    metadata: { assignToUserId },
    ipAddress: req.ip,
  });

  await createDisputeNotifications({
    userIds: [existingDispute?.buyer_id, existingDispute?.seller_id],
    title: "Dispute review update",
    body: assignToUserId
      ? `Your dispute \"${existingDispute?.title || "Dispute"}\" is now under review.`
      : `Your dispute \"${existingDispute?.title || "Dispute"}\" was moved back to open status.`,
    data: {
      kind: "dispute_assignment",
      disputeId,
      orderId: existingDispute?.order_id || data.order_id,
      assignedAdminUserId: assignToUserId,
    },
  });

  return res.json(await hydrateDisputeRow(data));
});

adminRouter.post("/disputes/:disputeId/messages", requireAuth, requireAdminRole("support"), async (req, res) => {
  const { disputeId } = req.params;
  const body = String(req.body?.body || "").trim();
  const isInternalNote = Boolean(req.body?.isInternalNote);
  const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments : [];

  if (!body || body.length < 3) {
    return res.status(400).json({ message: "Message must be at least 3 characters." });
  }

  const { data: dispute, error: disputeError } = await supabaseAdmin
    .from("marketplace_order_disputes")
    .select("id,order_id,status,buyer_id,seller_id,title")
    .eq("id", disputeId)
    .single();

  if (disputeError || !dispute) {
    return res.status(404).json({ message: disputeError?.message || "Dispute not found." });
  }

  const { data, error } = await supabaseAdmin
    .from("marketplace_order_dispute_messages")
    .insert({
      dispute_id: disputeId,
      order_id: dispute.order_id,
      author_user_id: req.admin.user_id,
      author_type: "admin",
      body,
      attachments,
      is_internal_note: isInternalNote,
    })
    .select("*")
    .single();

  if (error || !data) {
    return res.status(400).json({ message: error?.message || "Failed to add dispute message." });
  }

  if (dispute.status === "open") {
    await supabaseAdmin
      .from("marketplace_order_disputes")
      .update({ status: "under_review", updated_at: new Date().toISOString() })
      .eq("id", disputeId);
  }

  if (!isInternalNote) {
    await createDisputeNotifications({
      userIds: [dispute.buyer_id, dispute.seller_id],
      title: "New dispute message",
      body: `An admin posted a new update on \"${dispute.title || "Dispute"}\".`,
      data: {
        kind: "dispute_message",
        disputeId,
        orderId: dispute.order_id,
        source: "admin",
      },
    });
  }

  return res.status(201).json(await hydrateDisputeMessageRow(data));
});

adminRouter.patch("/disputes/:disputeId/verdict", requireAuth, requireAdminRole("support"), async (req, res) => {
  const { disputeId } = req.params;
  const status = String(req.body?.status || "resolved").trim();
  const verdict = req.body?.verdict ? String(req.body.verdict).trim() : null;
  const summary = String(req.body?.summary || "").trim();
  const orderStatus = req.body?.orderStatus ? String(req.body.orderStatus).trim() : null;
  const resolutionActions =
    req.body?.resolutionActions && typeof req.body.resolutionActions === "object"
      ? req.body.resolutionActions
      : {};

  if (!["resolved", "closed", "awaiting_parties", "under_review"].includes(status)) {
    return res.status(400).json({ message: "Invalid dispute status transition." });
  }

  if (status === "resolved") {
    if (!verdict || !DISPUTE_VERDICTS.includes(verdict)) {
      return res.status(400).json({ message: "A valid verdict is required to resolve a dispute." });
    }
    if (!summary || summary.length < 10) {
      return res.status(400).json({ message: "Resolution summary must be at least 10 characters." });
    }
  }

  if (orderStatus && !ORDER_STATUSES.includes(orderStatus)) {
    return res.status(400).json({ message: "Invalid order status." });
  }

  const { data: current, error: currentError } = await supabaseAdmin
    .from("marketplace_order_disputes")
    .select("id,order_id,buyer_id,seller_id,title")
    .eq("id", disputeId)
    .single();

  if (currentError || !current) {
    return res.status(404).json({ message: currentError?.message || "Dispute not found." });
  }

  const nowIso = new Date().toISOString();
  const updatePayload = {
    status,
    resolution_verdict: verdict,
    resolution_summary: summary || null,
    resolution_actions: resolutionActions,
    assigned_admin_user_id: req.admin.user_id,
    resolved_by_admin_user_id: status === "resolved" ? req.admin.user_id : null,
    resolved_at: status === "resolved" ? nowIso : null,
    closed_at: status === "closed" ? nowIso : null,
    updated_at: nowIso,
  };

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("marketplace_order_disputes")
    .update(updatePayload)
    .eq("id", disputeId)
    .select("*")
    .single();

  if (updateError || !updated) {
    return res.status(400).json({ message: updateError?.message || "Failed to apply dispute verdict." });
  }

  const orderUpdatePayload = {
    dispute_status: status,
    latest_dispute_id: disputeId,
  };

  if (orderStatus) {
    orderUpdatePayload.status = orderStatus;
    orderUpdatePayload.status_reason = summary || null;
  }

  await supabaseAdmin
    .from("marketplace_orders")
    .update(orderUpdatePayload)
    .eq("id", current.order_id);

  const publicNote = summary
    ? {
        dispute_id: disputeId,
        order_id: current.order_id,
        author_user_id: req.admin.user_id,
        author_type: "admin",
        body: summary,
        attachments: [],
        is_internal_note: false,
      }
    : null;

  if (publicNote) {
    await supabaseAdmin.from("marketplace_order_dispute_messages").insert(publicNote);
  }

  await logAdminAudit({
    actorUserId: req.admin.user_id,
    actorRole: req.admin.role,
    action: "dispute.verdict",
    entityType: "order_dispute",
    entityId: disputeId,
    metadata: {
      status,
      verdict,
      orderStatus: orderStatus || null,
    },
    ipAddress: req.ip,
  });

  await createDisputeNotifications({
    userIds: [current.buyer_id, current.seller_id],
    title: "Dispute decision update",
    body:
      status === "resolved"
        ? `A verdict was issued for \"${current.title || "Dispute"}\".`
        : `Your dispute \"${current.title || "Dispute"}\" status is now ${status.replace(/_/g, " ")}.`,
    data: {
      kind: "dispute_verdict",
      disputeId,
      orderId: current.order_id,
      status,
      verdict,
    },
  });

  return res.json(await hydrateDisputeRow(updated));
});

adminRouter.get("/kyc", requireAuth, requireAdminRole("kyc_reviewer"), async (req, res) => {
  const status = String(req.query.status || "").trim();

  let query = supabaseAdmin
    .from("profile_kyc_verifications")
    .select(
      "user_id,status,verification_source,document_type,document_number_last4,front_image_path,back_image_path,analysis_verdict,analysis_score,analysis_payload,submitted_at,verified_at,rejected_at,review_message"
    )
    .order("submitted_at", { ascending: false })
    .limit(500);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return res.status(400).json({ message: error.message || "Failed to load KYC requests" });
  }

  const userIds = (data || []).map((row) => row.user_id);
  let profileById = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id,name,email,phone,city")
      .in("id", userIds);

    profileById = (profiles || []).reduce((acc, row) => {
      acc[row.id] = row;
      return acc;
    }, {});
  }

  const withSignedUrls = await Promise.all(
    (data || []).map(async (row) => {
      const front = row.front_image_path
        ? await supabaseAdmin.storage.from("kyc-documents").createSignedUrl(row.front_image_path, 60 * 60)
        : { data: { signedUrl: null } };

      const back = row.back_image_path
        ? await supabaseAdmin.storage.from("kyc-documents").createSignedUrl(row.back_image_path, 60 * 60)
        : { data: { signedUrl: null } };

      return {
        userId: row.user_id,
        profile: profileById[row.user_id] || null,
        status: row.status,
        verificationSource: row.verification_source,
        documentType: row.document_type,
        documentNumberLast4: row.document_number_last4,
        frontImageUrl: front.data?.signedUrl || null,
        backImageUrl: back.data?.signedUrl || null,
        frontImagePath: row.front_image_path,
        backImagePath: row.back_image_path,
        analysisVerdict: row.analysis_verdict,
        analysisScore: row.analysis_score,
        analysisPayload: row.analysis_payload || {},
        submittedAt: row.submitted_at,
        verifiedAt: row.verified_at,
        rejectedAt: row.rejected_at,
        reviewMessage: row.review_message,
      };
    })
  );

  return res.json(withSignedUrls);
});

adminRouter.post("/kyc/:userId/recheck-ai", requireAuth, requireAdminRole("kyc_reviewer"), async (req, res) => {
  const { userId } = req.params;

  const { data: row, error } = await supabaseAdmin
    .from("profile_kyc_verifications")
    .select("user_id,document_type,front_image_path,back_image_path")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !row) {
    return res.status(404).json({ message: error?.message || "KYC request not found" });
  }

  const frontFile = await supabaseAdmin.storage.from("kyc-documents").download(row.front_image_path);
  const backFile = await supabaseAdmin.storage.from("kyc-documents").download(row.back_image_path);

  if (frontFile.error || backFile.error || !frontFile.data || !backFile.data) {
    return res.status(400).json({ message: "Failed to read stored KYC images" });
  }

  const [frontBuffer, backBuffer] = await Promise.all([
    frontFile.data.arrayBuffer(),
    backFile.data.arrayBuffer(),
  ]);

  const [frontResult, backResult] = await Promise.all([
    callDocumentAuthenticityService({
      contentBase64: Buffer.from(frontBuffer).toString("base64"),
      documentType: row.document_type,
      side: "front",
    }),
    callDocumentAuthenticityService({
      contentBase64: Buffer.from(backBuffer).toString("base64"),
      documentType: row.document_type,
      side: "back",
    }),
  ]);

  const score = Math.min(Number(frontResult.score || 0), Number(backResult.score || 0));
  const verdict = [frontResult.verdict, backResult.verdict].includes("reject")
    ? "reject"
    : [frontResult.verdict, backResult.verdict].includes("warn")
      ? "warn"
      : "accept";

  const analysisPayload = {
    front: frontResult,
    back: backResult,
    rerunBy: req.admin.user_id,
    rerunAt: new Date().toISOString(),
  };

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("profile_kyc_verifications")
    .update({
      analysis_verdict: verdict,
      analysis_score: score,
      analysis_payload: analysisPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("user_id,analysis_verdict,analysis_score,analysis_payload,review_message")
    .single();

  if (updateError || !updated) {
    return res.status(400).json({ message: updateError?.message || "Failed to update AI re-check result" });
  }

  await logAdminAudit({
    actorUserId: req.admin.user_id,
    actorRole: req.admin.role,
    action: "kyc.ai_recheck",
    entityType: "kyc",
    entityId: userId,
    metadata: { verdict, score },
    ipAddress: req.ip,
  });

  return res.json(updated);
});

adminRouter.patch("/kyc/:userId/review", requireAuth, requireAdminRole("kyc_reviewer"), async (req, res) => {
  const { userId } = req.params;
  const { status, reviewMessage, overrideAi, overrideReason } = req.body || {};

  if (!["pending", "verified", "rejected"].includes(String(status || ""))) {
    return res.status(400).json({ message: "Invalid KYC review status" });
  }

  if (status === "rejected" && !String(reviewMessage || "").trim()) {
    return res.status(400).json({ message: "Rejection reason is required" });
  }

  const verifiedAt = status === "verified" ? new Date().toISOString() : null;
  const rejectedAt = status === "rejected" ? new Date().toISOString() : null;

  const { data: updated, error } = await supabaseAdmin
    .from("profile_kyc_verifications")
    .update({
      status,
      verification_source: "manual",
      verified_at: verifiedAt,
      rejected_at: rejectedAt,
      review_message: reviewMessage || null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("status,document_type,document_number_last4,analysis_verdict,analysis_score,review_message")
    .single();

  if (error || !updated) {
    return res.status(400).json({ message: error?.message || "Failed to apply KYC review" });
  }

  await supabaseAdmin
    .from("profiles")
    .update({
      kyc_status: status,
      kyc_verified_at: verifiedAt,
      kyc_review_message: reviewMessage || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
  const existingMetadata = authUserData?.user?.user_metadata || {};

  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existingMetadata,
      kyc_status: status,
      kyc_verification_source: "manual",
      kyc_verified: status === "verified",
      kyc_verified_at: verifiedAt || undefined,
      kyc_document_type: updated.document_type || undefined,
      kyc_document_last4: updated.document_number_last4 || undefined,
      kyc_review_message: reviewMessage || undefined,
      kyc_analysis_verdict: updated.analysis_verdict || undefined,
      kyc_analysis_score: updated.analysis_score || undefined,
    },
  });

  await logAdminAudit({
    actorUserId: req.admin.user_id,
    actorRole: req.admin.role,
    action: "kyc.manual_review",
    entityType: "kyc",
    entityId: userId,
    metadata: {
      status,
      reviewMessage: reviewMessage || null,
      overrideAi: Boolean(overrideAi),
      overrideReason: overrideReason || null,
      aiVerdict: updated.analysis_verdict || null,
      aiScore: updated.analysis_score || null,
    },
    ipAddress: req.ip,
  });

  return res.json({ ok: true });
});

adminRouter.get("/audit", requireAuth, requireAdminRole("support"), async (req, res) => {
  const limit = Math.min(200, Math.max(10, Number.parseInt(String(req.query.limit || "100"), 10) || 100));

  const { data, error } = await supabaseAdmin
    .from("admin_audit_logs")
    .select("id,actor_user_id,actor_role,action,entity_type,entity_id,metadata,ip_address,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to load admin audit logs" });
  }

  return res.json(data || []);
});

adminRouter.get("/contact-messages", requireAuth, requireAdminRole("support"), async (req, res) => {
  const status = String(req.query.status || "").trim();
  const search = String(req.query.search || "").trim();
  const limit = Math.min(500, Math.max(10, Number.parseInt(String(req.query.limit || "200"), 10) || 200));

  let query = supabaseAdmin
    .from("contact_messages")
    .select("id,name,email,phone,subject,message,source_page,status,admin_notes,resolved_by_user_id,resolved_at,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    const safe = search.replace(/[,()]/g, " ").trim();
    if (safe) {
      query = query.or(`name.ilike.%${safe}%,email.ilike.%${safe}%,message.ilike.%${safe}%`);
    }
  }

  const { data, error } = await query;
  if (error) {
    return res.status(400).json({ message: error.message || "Failed to load contact messages" });
  }

  return res.json(data || []);
});

adminRouter.patch("/contact-messages/:messageId", requireAuth, requireAdminRole("support"), async (req, res) => {
  const { messageId } = req.params;
  const { status, adminNotes } = req.body || {};
  const allowed = ["new", "in_progress", "resolved", "closed"];

  if (!allowed.includes(String(status || ""))) {
    return res.status(400).json({ message: "Invalid contact message status" });
  }

  const notes = String(adminNotes || "").trim();
  if (notes.length > 2000) {
    return res.status(400).json({ message: "Admin notes must be <= 2000 characters" });
  }

  const resolvedAt = ["resolved", "closed"].includes(status) ? new Date().toISOString() : null;
  const resolvedByUserId = ["resolved", "closed"].includes(status) ? req.admin.user_id : null;

  const { data, error } = await supabaseAdmin
    .from("contact_messages")
    .update({
      status,
      admin_notes: notes || null,
      resolved_at: resolvedAt,
      resolved_by_user_id: resolvedByUserId,
    })
    .eq("id", messageId)
    .select("id,name,email,phone,subject,message,source_page,status,admin_notes,resolved_by_user_id,resolved_at,created_at,updated_at")
    .single();

  if (error || !data) {
    return res.status(400).json({ message: error?.message || "Failed to update contact message" });
  }

  await logAdminAudit({
    actorUserId: req.admin.user_id,
    actorRole: req.admin.role,
    action: "contact_message.update",
    entityType: "contact_message",
    entityId: messageId,
    metadata: { status, adminNotes: notes || null },
    ipAddress: req.ip,
  });

  return res.json(data);
});

// ============ AI FRAUD DETECTION ENDPOINTS ============

adminRouter.get("/fraud-detections", requireAuth, requireAdminRole("moderator"), async (req, res) => {
  const status = String(req.query.status || "").trim();
  const entityType = String(req.query.entityType || "").trim();
  const riskLevel = String(req.query.riskLevel || "").trim();
  const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
  const pageSize = Math.min(100, Math.max(10, Number.parseInt(String(req.query.pageSize || "20"), 10) || 20));

  let query = supabaseAdmin
    .from("ai_fraud_detections")
    .select("*")
    .order("detected_at", { ascending: false });

  if (status && ["unreviewed", "reviewed", "flagged", "resolved", "dismissed"].includes(status)) {
    query = query.eq("status", status);
  }

  if (entityType && ["listing", "user", "order", "pattern"].includes(entityType)) {
    query = query.eq("entity_type", entityType);
  }

  if (riskLevel && ["none", "low", "medium", "high", "critical"].includes(riskLevel)) {
    const minScore = {
      none: -1,
      low: 0,
      medium: 40,
      high: 60,
      critical: 80,
    }[riskLevel];
    query = query.gte("risk_score", minScore);
  }

  const offset = (page - 1) * pageSize;
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;
  if (error) {
    return res.status(400).json({ message: error.message || "Failed to load fraud detections" });
  }

  const userIds = [...new Set((data || []).map((row) => row.user_id).filter(Boolean))];
  let profilesById = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id,name,email,avatar_url").in("id", userIds);
    profilesById = (profiles || []).reduce((acc, row) => {
      acc[row.id] = row;
      return acc;
    }, {});
  }

  const activities = (data || []).map((row) => ({
    id: row.id,
    detectionId: row.id,
    detectedAt: row.detected_at,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityTitle: row.entity_title,
    userId: row.user_id,
    userName: profilesById[row.user_id]?.name || "Unknown User",
    userEmail: profilesById[row.user_id]?.email || "",
    userAvatar: profilesById[row.user_id]?.avatar_url || null,
    riskScore: row.risk_score,
    mainFlag: row.main_flag,
    flagCount: Array.isArray(row.flags) ? row.flags.length : 0,
    summary: row.summary,
    status: row.status,
    adminNotes: row.admin_notes,
    reviewedBy: row.reviewed_by_user_id,
    reviewedAt: row.reviewed_at,
    resolvedAt: row.resolved_at,
    action: row.action,
  }));

  const stats = {
    total_detections: count || 0,
    critical_risk: (data || []).filter((row) => row.risk_score >= 80).length,
    high_risk: (data || []).filter((row) => row.risk_score >= 60 && row.risk_score < 80).length,
    medium_risk: (data || []).filter((row) => row.risk_score >= 40 && row.risk_score < 60).length,
    low_risk: (data || []).filter((row) => row.risk_score < 40).length,
    unreviewed_count: (data || []).filter((row) => row.status === "unreviewed").length,
    resolved_count: (data || []).filter((row) => row.status === "resolved").length,
    users_flagged: new Set((data || []).filter((row) => row.entity_type === "user").map((row) => row.user_id)).size,
    listings_flagged: new Set((data || []).filter((row) => row.entity_type === "listing").map((row) => row.entity_id)).size,
    orders_flagged: new Set((data || []).filter((row) => row.entity_type === "order").map((row) => row.entity_id)).size,
    top_fraud_types: [],
  };

  return res.json({
    activities,
    stats,
    total: count || 0,
    page,
    pageSize,
  });
});

adminRouter.get("/fraud-detections/:detectionId", requireAuth, requireAdminRole("moderator"), async (req, res) => {
  const { detectionId } = req.params;

  const { data: detection, error } = await supabaseAdmin
    .from("ai_fraud_detections")
    .select("*")
    .eq("id", detectionId)
    .maybeSingle();

  if (error || !detection) {
    return res.status(404).json({ message: error?.message || "Fraud detection not found" });
  }

  const userProfile = await fetchUserProfile(detection.user_id);

  return res.json({
    ...detection,
    userProfile: userProfile,
  });
});

adminRouter.post("/fraud-detections/:detectionId/review", requireAuth, requireAdminRole("moderator"), async (req, res) => {
  const { detectionId } = req.params;
  const { status, adminNotes, action } = req.body || {};
  const validStatuses = ["unreviewed", "reviewed", "flagged", "resolved", "dismissed"];
  const validActions = ["suspend_user", "remove_listing", "cancel_order", "mark_suspicious", "none"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  if (action && !validActions.includes(action)) {
    return res.status(400).json({ message: "Invalid action" });
  }

  const { data: detection } = await supabaseAdmin
    .from("ai_fraud_detections")
    .select("*")
    .eq("id", detectionId)
    .maybeSingle();

  if (!detection) {
    return res.status(404).json({ message: "Fraud detection not found" });
  }

  const nowIso = new Date().toISOString();

  // Apply action if specified
  if (action === "suspend_user" && detection.user_id) {
    await supabaseAdmin
      .from("profiles")
      .update({
        moderation_status: "suspended",
        moderation_note: `Suspended due to fraud detection: ${adminNotes || "No details"}`,
        moderated_at: nowIso,
        moderated_by_user_id: req.admin.user_id,
      })
      .eq("id", detection.user_id);

    await supabaseAdmin.from("listings").update({ status: "paused" }).eq("owner_user_id", detection.user_id).eq("status", "active");
  }

  if (action === "remove_listing" && detection.entity_type === "listing" && detection.entity_id) {
    await supabaseAdmin.from("listings").delete().eq("id", detection.entity_id);
  }

  if (action === "mark_suspicious" && detection.user_id) {
    await supabaseAdmin
      .from("profiles")
      .update({
        is_suspicious: true,
        suspicion_flag_reason: adminNotes || "Marked as suspicious by fraud detection",
        suspicion_flagged_at: nowIso,
        suspicion_flagged_by_user_id: req.admin.user_id,
      })
      .eq("id", detection.user_id);
  }

  const { data: updated, error } = await supabaseAdmin
    .from("ai_fraud_detections")
    .update({
      status,
      admin_notes: adminNotes || null,
      action: action || null,
      reviewed_by_user_id: req.admin.user_id,
      reviewed_at: nowIso,
      resolved_at: status === "resolved" ? nowIso : null,
    })
    .eq("id", detectionId)
    .select("*")
    .single();

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to update fraud detection review" });
  }

  await logAdminAudit({
    actorUserId: req.admin.user_id,
    actorRole: req.admin.role,
    action: "fraud_detection.review",
    entityType: detection.entity_type,
    entityId: detection.entity_id,
    metadata: { status, action: action || null, adminNotes: adminNotes || null, detectionId },
    ipAddress: req.ip,
  });

  return res.json(updated);
});

adminRouter.post("/fraud-detections/analyze/listing/:listingId", requireAuth, requireAdminRole("moderator"), async (req, res) => {
  const { listingId } = req.params;

  const { data: listing, error: listingError } = await supabaseAdmin
    .from("listings")
    .select("id,title,description,buy_price,rent_daily_price,category,listing_images,owner_user_id,owner_name,owner_email,created_at")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError || !listing) {
    return res.status(404).json({ message: listingError?.message || "Listing not found" });
  }

  // Call AI service for fraud analysis
  if (!AI_SERVICE_URL) {
    return res.status(503).json({ message: "AI service is not configured" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_SERVICE_URL}/analyze-fraud-listing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: listing.id,
        title: listing.title,
        description: listing.description || "",
        price: listing.buy_price || listing.rent_daily_price || 0,
        category: listing.category || "",
        imagesCount: Array.isArray(listing.listing_images) ? listing.listing_images.length : 0,
        sellerId: listing.owner_user_id,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("Failed to analyze fraud");
    }

    const fraudResult = await response.json();

    // Store in database
    const mainFlag = fraudResult.flags && fraudResult.flags.length > 0 ? fraudResult.flags[0] : null;
    const nowIso = new Date().toISOString();

    const { data: detection, error: insertError } = await supabaseAdmin
      .from("ai_fraud_detections")
      .insert({
        entity_type: fraudResult.entityType || "listing",
        entity_id: fraudResult.entityId || listing.id,
        entity_title: listing.title,
        user_id: listing.owner_user_id,
        risk_score: fraudResult.riskScore,
        flags: fraudResult.flags || [],
        main_flag: mainFlag,
        summary: fraudResult.summary,
        status: "unreviewed",
        detected_at: nowIso,
        is_suspicious: fraudResult.isSuspicious,
      })
      .select("*")
      .single();

    if (insertError) {
      return res.status(400).json({ message: insertError.message || "Failed to store fraud detection" });
    }

    await logAdminAudit({
      actorUserId: req.admin.user_id,
      actorRole: req.admin.role,
      action: "fraud_detection.analyze",
      entityType: "listing",
      entityId: listingId,
      metadata: { riskScore: fraudResult.riskScore, flagCount: (fraudResult.flags || []).length },
      ipAddress: req.ip,
    });

    return res.json(detection);
  } finally {
    clearTimeout(timeout);
  }
});

adminRouter.post("/fraud-detections/analyze/user/:userId", requireAuth, requireAdminRole("moderator"), async (req, res) => {
  const { userId } = req.params;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,name,email,created_at")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    return res.status(404).json({ message: profileError?.message || "User not found" });
  }

  const { data: listings } = await supabaseAdmin
    .from("listings")
    .select("id")
    .eq("owner_user_id", userId)
    .eq("status", "active");

  const { data: orders } = await supabaseAdmin
    .from("marketplace_orders")
    .select("id")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

  // Call AI service
  if (!AI_SERVICE_URL) {
    return res.status(503).json({ message: "AI service is not configured" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT_MS);

  try {
    const accountAgeDays = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24));

    const response = await fetch(`${AI_SERVICE_URL}/analyze-fraud-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: profile.id,
        email: profile.email,
        accountAgeDays,
        listingsCount: (listings || []).length,
        ordersCount: (orders || []).length,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("Failed to analyze fraud");
    }

    const fraudResult = await response.json();

    const mainFlag = fraudResult.flags && fraudResult.flags.length > 0 ? fraudResult.flags[0] : null;
    const nowIso = new Date().toISOString();

    const { data: detection, error: insertError } = await supabaseAdmin
      .from("ai_fraud_detections")
      .insert({
        entity_type: fraudResult.entityType || "user",
        entity_id: fraudResult.entityId || profile.id,
        entity_title: profile.name,
        user_id: profile.id,
        risk_score: fraudResult.riskScore,
        flags: fraudResult.flags || [],
        main_flag: mainFlag,
        summary: fraudResult.summary,
        status: "unreviewed",
        detected_at: nowIso,
        is_suspicious: fraudResult.isSuspicious,
      })
      .select("*")
      .single();

    if (insertError) {
      return res.status(400).json({ message: insertError.message || "Failed to store fraud detection" });
    }

    await logAdminAudit({
      actorUserId: req.admin.user_id,
      actorRole: req.admin.role,
      action: "fraud_detection.analyze",
      entityType: "user",
      entityId: userId,
      metadata: { riskScore: fraudResult.riskScore, flagCount: (fraudResult.flags || []).length },
      ipAddress: req.ip,
    });

    return res.json(detection);
  } finally {
    clearTimeout(timeout);
  }
});
