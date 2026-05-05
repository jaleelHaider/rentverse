import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { reserveListingInventoryInternal } from "./listings.js";

export const ordersRouter = Router();

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1200&q=80";
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const DISPUTE_STATUSES = ["open", "under_review", "awaiting_parties", "resolved", "closed"];
const DISPUTE_PRIORITIES = ["low", "medium", "high", "urgent"];
const DISPUTE_EVIDENCE_BUCKET = "dispute-evidence";
const MAX_EVIDENCE_FILES_PER_REQUEST = 5;
const MAX_EVIDENCE_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const DISPUTE_REASON_CODES = [
  "item_not_received",
  "item_not_as_described",
  "damaged_item",
  "late_delivery_or_return",
  "payment_or_refund_issue",
  "fraud_or_safety_concern",
  "other",
];

const createNumericOtp = () => {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return String(Math.floor(Math.random() * (max - min + 1) + min));
};

const isOrderParticipant = (orderRow, userId) =>
  orderRow?.buyer_id === userId || orderRow?.seller_id === userId;

const getParticipantRoleForOrder = (orderRow, userId) => {
  if (orderRow?.buyer_id === userId) return "buyer";
  if (orderRow?.seller_id === userId) return "seller";
  return null;
};

const normalizeEvidence = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      type: String(item.type || "link").slice(0, 32),
      url: String(item.url || "").slice(0, 2048),
      note: String(item.note || "").slice(0, 500),
      name: item.name ? String(item.name).slice(0, 255) : null,
      mimeType: item.mimeType ? String(item.mimeType).slice(0, 120) : null,
      storagePath: item.storagePath ? String(item.storagePath).slice(0, 1024) : null,
      sizeBytes: Number.isFinite(Number(item.sizeBytes)) ? Number(item.sizeBytes) : null,
      uploadedAt: item.uploadedAt ? String(item.uploadedAt) : null,
    }))
    .filter((item) => item.url.length > 0 || item.storagePath);
};

const safeFileName = (name) => String(name || "evidence").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);

const decodeAttachment = (attachment) => {
  const raw = String(attachment?.base64 || attachment?.contentBase64 || "").trim();
  if (!raw) {
    throw new Error("Invalid attachment payload.");
  }

  const content = raw.includes(",") ? raw.split(",").pop() || "" : raw;
  if (!content) {
    throw new Error("Invalid attachment payload.");
  }

  const buffer = Buffer.from(content, "base64");
  if (!buffer.length) {
    throw new Error("Invalid attachment payload.");
  }

  return buffer;
};

const resolveEvidenceSignedUrls = async (evidence) => {
  const list = normalizeEvidence(evidence);
  if (!list.length) {
    return [];
  }

  return Promise.all(
    list.map(async (item) => {
      if (!item.storagePath) {
        return item;
      }

      const signed = await supabaseAdmin.storage
        .from(DISPUTE_EVIDENCE_BUCKET)
        .createSignedUrl(item.storagePath, 60 * 60);

      return {
        ...item,
        signedUrl: signed.data?.signedUrl || item.url || null,
        url: signed.data?.signedUrl || item.url || "",
      };
    })
  );
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

const sanitizeOtp = (value) => String(value || "").replace(/\D/g, "").slice(0, OTP_LENGTH);

const mapListingRelation = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] || null;
  return value;
};

const mapPrimaryImage = (images) => {
  if (!images || images.length === 0) {
    return DEFAULT_IMAGE;
  }

  const sorted = [...images].sort((a, b) => {
    if (a.is_primary === b.is_primary) {
      return a.display_order - b.display_order;
    }
    return a.is_primary ? -1 : 1;
  });

  return sorted[0]?.public_url || DEFAULT_IMAGE;
};

const mapDisputeRow = (row) => {
  if (!row) return null;

  return {
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
  };
};

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

const loadActiveAdminUserIds = async () => {
  const { data } = await supabaseAdmin
    .from("admin_users")
    .select("user_id")
    .eq("status", "active")
    .in("role", ["support", "finance", "moderator", "manager", "admin", "superadmin"])
    .limit(200);

  return (data || []).map((row) => row.user_id).filter(Boolean);
};

const mapRowToOrder = (row) => {
  const listing = mapListingRelation(row.listings);

  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: listing?.title || "Listing",
    listingImageUrl: mapPrimaryImage(listing?.listing_images || null),
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    mode: row.order_mode,
    quantity: row.quantity,
    durationUnit: row.duration_unit,
    durationCount: row.duration_count,
    unitPrice: row.unit_price,
    itemAmount: row.item_amount,
    securityDeposit: row.security_deposit,
    platformFee: row.platform_fee,
    totalDue: row.total_due,
    paymentMethod: row.payment_method,
    paymentConfirmed: row.payment_confirmed,
    status: row.status,
    statusReason: row.status_reason,
    handoverOtpRequestedAt: row.handover_otp_requested_at,
    handoverOtpExpiresAt: row.handover_otp_expires_at,
    handoverVerifiedAt: row.handover_verified_at,
    returnOtpRequestedAt: row.return_otp_requested_at,
    returnOtpExpiresAt: row.return_otp_expires_at,
    returnVerifiedAt: row.return_verified_at,
    completedAt: row.completed_at,
    fullName: row.full_name,
    phone: row.phone,
    city: row.city,
    deliveryAddress: row.delivery_address,
    specialInstructions: row.special_instructions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    disputeStatus: row.dispute_status || "none",
    latestDisputeId: row.latest_dispute_id || null,
  };
};

const orderSelect =
  "id,listing_id,buyer_id,seller_id,order_mode,quantity,duration_unit,duration_count,unit_price,item_amount,security_deposit,platform_fee,total_due,payment_method,payment_confirmed,status,status_reason,handover_otp_requested_at,handover_otp_expires_at,handover_verified_at,return_otp_requested_at,return_otp_expires_at,return_verified_at,completed_at,full_name,phone,city,delivery_address,special_instructions,created_at,updated_at,approved_at,rejected_at,dispute_status,latest_dispute_id,listings(id,title,listing_images(public_url,is_primary,display_order))";

ordersRouter.post("/", requireAuth, async (req, res) => {
  const input = req.body || {};
  const buyerId = req.auth.sub;

  const { data: listingRow, error: listingError } = await supabaseAdmin
    .from("listings")
    .select("id,owner_user_id,owner_name,title")
    .eq("id", input.listingId)
    .single();

  if (listingError || !listingRow) {
    return res.status(404).json({ message: listingError?.message || "Listing not found." });
  }

  const sellerId = listingRow.owner_user_id;

  if (sellerId === buyerId) {
    return res.status(400).json({ message: "You cannot create an order for your own listing." });
  }

  const { data, error } = await supabaseAdmin
    .from("marketplace_orders")
    .insert({
      listing_id: input.listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
      order_mode: input.mode,
      quantity: input.quantity,
      duration_unit: input.durationUnit,
      duration_count: input.durationCount,
      unit_price: input.unitPrice,
      item_amount: input.itemAmount,
      security_deposit: input.securityDeposit,
      platform_fee: input.platformFee,
      total_due: input.totalDue,
      payment_method: input.paymentMethod,
      payment_confirmed: input.paymentConfirmed,
      payment_confirmed_at: input.paymentConfirmed ? new Date().toISOString() : null,
      status: "pending_seller_approval",
      full_name: input.fullName,
      phone: input.phone,
      city: input.city,
      delivery_address: input.deliveryAddress,
      special_instructions: input.specialInstructions,
    })
    .select(orderSelect)
    .single();

  if (error || !data) {
    return res.status(400).json({ message: error?.message || "Failed to create order request." });
  }

  await supabaseAdmin.from("notifications").insert({
    user_id: sellerId,
    actor_id: buyerId,
    type: "order_request",
    title: "New order request",
    body: `You received a ${input.mode} request on ${listingRow.title}.`,
    data: {
      listingId: input.listingId,
      orderId: data.id,
    },
  });

  return res.json(mapRowToOrder(data));
});

ordersRouter.get("/me", requireAuth, async (req, res) => {
  const userId = req.auth.sub;

  const { data, error } = await supabaseAdmin
    .from("marketplace_orders")
    .select(orderSelect)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to load orders." });
  }

  return res.json((data || []).map(mapRowToOrder));
});

ordersRouter.post("/:orderId/approve", requireAuth, async (req, res) => {
  const { orderId } = req.params;
  const sellerId = req.auth.sub;

  const { data: current, error: currentError } = await supabaseAdmin
    .from("marketplace_orders")
    .select("id,listing_id,buyer_id,seller_id,order_mode,quantity,status")
    .eq("id", orderId)
    .single();

  if (currentError || !current) {
    return res.status(404).json({ message: currentError?.message || "Order not found." });
  }

  if (current.seller_id !== sellerId) {
    return res.status(403).json({ message: "Only listing owner can approve this request." });
  }

  if (current.status !== "pending_seller_approval") {
    return res.status(400).json({ message: "Only pending requests can be approved." });
  }

  try {
    await reserveListingInventoryInternal(
      current.listing_id,
      current.order_mode === "buy" ? "buy" : "rent",
      current.quantity
    );
  } catch (error) {
    return res.status(400).json({ message: error.message || "Inventory reservation failed." });
  }

  const approvedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("marketplace_orders")
    .update({
      status: "approved",
      approved_at: approvedAt,
      status_reason: null,
    })
    .eq("id", orderId)
    .select(orderSelect)
    .single();

  if (updateError || !updated) {
    return res.status(400).json({ message: updateError?.message || "Failed to approve order." });
  }

  await supabaseAdmin.from("notifications").insert({
    user_id: current.buyer_id,
    actor_id: sellerId,
    type: "order_approved",
    title: "Order approved",
    body: "Your order request has been approved by the seller.",
    data: {
      orderId,
      listingId: current.listing_id,
    },
  });

  return res.json(mapRowToOrder(updated));
});

ordersRouter.post("/:orderId/reject", requireAuth, async (req, res) => {
  const { orderId } = req.params;
  const sellerId = req.auth.sub;
  const reason = req.body?.reason;

  const { data: current, error: currentError } = await supabaseAdmin
    .from("marketplace_orders")
    .select("id,listing_id,buyer_id,seller_id,status")
    .eq("id", orderId)
    .single();

  if (currentError || !current) {
    return res.status(404).json({ message: currentError?.message || "Order not found." });
  }

  if (current.seller_id !== sellerId) {
    return res.status(403).json({ message: "Only listing owner can reject this request." });
  }

  if (current.status !== "pending_seller_approval") {
    return res.status(400).json({ message: "Only pending requests can be rejected." });
  }

  const rejectedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("marketplace_orders")
    .update({
      status: "rejected",
      rejected_at: rejectedAt,
      status_reason: reason || null,
    })
    .eq("id", orderId)
    .select(orderSelect)
    .single();

  if (updateError || !updated) {
    return res.status(400).json({ message: updateError?.message || "Failed to reject order." });
  }

  await supabaseAdmin.from("notifications").insert({
    user_id: current.buyer_id,
    actor_id: sellerId,
    type: "order_rejected",
    title: "Order rejected",
    body: "Your order request was rejected by the seller.",
    data: {
      orderId,
      listingId: current.listing_id,
    },
  });

  return res.json(mapRowToOrder(updated));
});

ordersRouter.post("/:orderId/cancel", requireAuth, async (req, res) => {
  const { orderId } = req.params;
  const actorId = req.auth.sub;
  const reason = String(req.body?.reason || "").trim();

  const { data: current, error: currentError } = await supabaseAdmin
    .from("marketplace_orders")
    .select("id,buyer_id,seller_id,status")
    .eq("id", orderId)
    .single();

  if (currentError || !current) {
    return res.status(404).json({ message: currentError?.message || "Order not found." });
  }

  if (!isOrderParticipant(current, actorId)) {
    return res.status(403).json({ message: "Only buyer or seller can cancel this order." });
  }

  if (current.status !== "pending_seller_approval") {
    return res
      .status(400)
      .json({ message: "Only pending approval orders can be cancelled." });
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("marketplace_orders")
    .update({
      status: "cancelled",
      status_reason: reason || "Cancelled by user",
    })
    .eq("id", orderId)
    .select(orderSelect)
    .single();

  if (updateError || !updated) {
    return res.status(400).json({ message: updateError?.message || "Failed to cancel order." });
  }

  const counterpartId = actorId === current.buyer_id ? current.seller_id : current.buyer_id;
  await supabaseAdmin.from("notifications").insert({
    user_id: counterpartId,
    actor_id: actorId,
    type: "order_cancelled",
    title: "Order cancelled",
    body: "An order has been cancelled.",
    data: {
      orderId,
    },
  });

  return res.json(mapRowToOrder(updated));
});

ordersRouter.post("/:orderId/handover-otp/request", requireAuth, async (req, res) => {
  const { orderId } = req.params;
  const actorId = req.auth.sub;

  const { data: current, error: currentError } = await supabaseAdmin
    .from("marketplace_orders")
    .select("id,listing_id,buyer_id,seller_id,order_mode,status")
    .eq("id", orderId)
    .single();

  if (currentError || !current) {
    return res.status(404).json({ message: currentError?.message || "Order not found." });
  }

  if (!isOrderParticipant(current, actorId)) {
    return res.status(403).json({ message: "Only buyer or seller can request OTP." });
  }

  if (!["approved", "handover_otp_pending"].includes(current.status)) {
    return res.status(400).json({ message: "Handover OTP can only be requested after approval." });
  }

  const otp = createNumericOtp();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60_000).toISOString();

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("marketplace_orders")
    .update({
      status: "handover_otp_pending",
      handover_otp_code: otp,
      handover_otp_requested_at: now.toISOString(),
      handover_otp_expires_at: expiresAt,
      handover_otp_requested_by: actorId,
      handover_otp_attempts: 0,
      status_reason: null,
    })
    .eq("id", orderId)
    .select(orderSelect)
    .single();

  if (updateError || !updated) {
    return res
      .status(400)
      .json({ message: updateError?.message || "Failed to generate handover OTP." });
  }

  const counterpartId = actorId === current.buyer_id ? current.seller_id : current.buyer_id;
  await supabaseAdmin.from("notifications").insert({
    user_id: counterpartId,
    actor_id: actorId,
    type: "handover_otp_requested",
    title: "Handover OTP generated",
    body: "A handover OTP was generated for your order.",
    data: {
      orderId,
      listingId: current.listing_id,
      expiresAt,
    },
  });

  return res.json({
    order: mapRowToOrder(updated),
    otp,
    expiresAt,
  });
});

ordersRouter.post("/:orderId/handover-otp/verify", requireAuth, async (req, res) => {
  const { orderId } = req.params;
  const actorId = req.auth.sub;
  const otp = sanitizeOtp(req.body?.otp);

  if (otp.length !== OTP_LENGTH) {
    return res.status(400).json({ message: "A valid 6-digit OTP is required." });
  }

  const { data: current, error: currentError } = await supabaseAdmin
    .from("marketplace_orders")
    .select(
      "id,listing_id,buyer_id,seller_id,order_mode,status,handover_otp_code,handover_otp_expires_at,handover_otp_attempts"
    )
    .eq("id", orderId)
    .single();

  if (currentError || !current) {
    return res.status(404).json({ message: currentError?.message || "Order not found." });
  }

  if (!isOrderParticipant(current, actorId)) {
    return res.status(403).json({ message: "Only buyer or seller can verify OTP." });
  }

  if (current.status !== "handover_otp_pending") {
    return res.status(400).json({ message: "No active handover OTP for this order." });
  }

  const expiresAtMs = new Date(current.handover_otp_expires_at || "").getTime();
  if (!Number.isFinite(expiresAtMs) || Date.now() > expiresAtMs) {
    return res.status(400).json({ message: "Handover OTP expired. Generate a new one." });
  }

  if (current.handover_otp_code !== otp) {
    await supabaseAdmin
      .from("marketplace_orders")
      .update({ handover_otp_attempts: Number(current.handover_otp_attempts || 0) + 1 })
      .eq("id", orderId);
    return res.status(400).json({ message: "Invalid OTP." });
  }

  const nextStatus = current.order_mode === "rent" ? "in_use" : "completed";
  const nowIso = new Date().toISOString();

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("marketplace_orders")
    .update({
      status: nextStatus,
      handover_verified_at: nowIso,
      handover_otp_code: null,
      handover_otp_expires_at: null,
      handover_otp_requested_at: null,
      handover_otp_requested_by: null,
      handover_otp_attempts: 0,
      completed_at: nextStatus === "completed" ? nowIso : null,
      status_reason: null,
    })
    .eq("id", orderId)
    .select(orderSelect)
    .single();

  if (updateError || !updated) {
    return res.status(400).json({ message: updateError?.message || "Failed to verify handover OTP." });
  }

  const counterpartId = actorId === current.buyer_id ? current.seller_id : current.buyer_id;
  await supabaseAdmin.from("notifications").insert({
    user_id: counterpartId,
    actor_id: actorId,
    type: "handover_otp_verified",
    title: "Handover confirmed",
    body:
      current.order_mode === "rent"
        ? "Handover confirmed. Rental is now active."
        : "Handover confirmed. Order marked as completed.",
    data: {
      orderId,
      listingId: current.listing_id,
    },
  });

  return res.json(mapRowToOrder(updated));
});

ordersRouter.post("/:orderId/return-otp/request", requireAuth, async (req, res) => {
  const { orderId } = req.params;
  const actorId = req.auth.sub;

  const { data: current, error: currentError } = await supabaseAdmin
    .from("marketplace_orders")
    .select("id,listing_id,buyer_id,seller_id,order_mode,status")
    .eq("id", orderId)
    .single();

  if (currentError || !current) {
    return res.status(404).json({ message: currentError?.message || "Order not found." });
  }

  if (!isOrderParticipant(current, actorId)) {
    return res.status(403).json({ message: "Only buyer or seller can request OTP." });
  }

  if (current.order_mode !== "rent") {
    return res.status(400).json({ message: "Return OTP is only available for rental orders." });
  }

  if (!["in_use", "return_otp_pending"].includes(current.status)) {
    return res.status(400).json({ message: "Return OTP can only be requested after handover confirmation." });
  }

  const otp = createNumericOtp();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60_000).toISOString();

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("marketplace_orders")
    .update({
      status: "return_otp_pending",
      return_otp_code: otp,
      return_otp_requested_at: now.toISOString(),
      return_otp_expires_at: expiresAt,
      return_otp_requested_by: actorId,
      return_otp_attempts: 0,
      status_reason: null,
    })
    .eq("id", orderId)
    .select(orderSelect)
    .single();

  if (updateError || !updated) {
    return res
      .status(400)
      .json({ message: updateError?.message || "Failed to generate return OTP." });
  }

  const counterpartId = actorId === current.buyer_id ? current.seller_id : current.buyer_id;
  await supabaseAdmin.from("notifications").insert({
    user_id: counterpartId,
    actor_id: actorId,
    type: "return_otp_requested",
    title: "Return OTP generated",
    body: "A return OTP was generated for your rental order.",
    data: {
      orderId,
      listingId: current.listing_id,
      expiresAt,
    },
  });

  return res.json({
    order: mapRowToOrder(updated),
    otp,
    expiresAt,
  });
});

ordersRouter.post("/:orderId/return-otp/verify", requireAuth, async (req, res) => {
  const { orderId } = req.params;
  const actorId = req.auth.sub;
  const otp = sanitizeOtp(req.body?.otp);

  if (otp.length !== OTP_LENGTH) {
    return res.status(400).json({ message: "A valid 6-digit OTP is required." });
  }

  const { data: current, error: currentError } = await supabaseAdmin
    .from("marketplace_orders")
    .select(
      "id,listing_id,buyer_id,seller_id,order_mode,status,return_otp_code,return_otp_expires_at,return_otp_attempts"
    )
    .eq("id", orderId)
    .single();

  if (currentError || !current) {
    return res.status(404).json({ message: currentError?.message || "Order not found." });
  }

  if (!isOrderParticipant(current, actorId)) {
    return res.status(403).json({ message: "Only buyer or seller can verify OTP." });
  }

  if (current.order_mode !== "rent") {
    return res.status(400).json({ message: "Return OTP verification is only for rental orders." });
  }

  if (current.status !== "return_otp_pending") {
    return res.status(400).json({ message: "No active return OTP for this order." });
  }

  const expiresAtMs = new Date(current.return_otp_expires_at || "").getTime();
  if (!Number.isFinite(expiresAtMs) || Date.now() > expiresAtMs) {
    return res.status(400).json({ message: "Return OTP expired. Generate a new one." });
  }

  if (current.return_otp_code !== otp) {
    await supabaseAdmin
      .from("marketplace_orders")
      .update({ return_otp_attempts: Number(current.return_otp_attempts || 0) + 1 })
      .eq("id", orderId);
    return res.status(400).json({ message: "Invalid OTP." });
  }

  const nowIso = new Date().toISOString();

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("marketplace_orders")
    .update({
      status: "completed",
      return_verified_at: nowIso,
      return_otp_code: null,
      return_otp_expires_at: null,
      return_otp_requested_at: null,
      return_otp_requested_by: null,
      return_otp_attempts: 0,
      completed_at: nowIso,
      status_reason: null,
    })
    .eq("id", orderId)
    .select(orderSelect)
    .single();

  if (updateError || !updated) {
    return res.status(400).json({ message: updateError?.message || "Failed to verify return OTP." });
  }

  const counterpartId = actorId === current.buyer_id ? current.seller_id : current.buyer_id;
  await supabaseAdmin.from("notifications").insert({
    user_id: counterpartId,
    actor_id: actorId,
    type: "return_otp_verified",
    title: "Return confirmed",
    body: "Return verified. Rental order is now completed.",
    data: {
      orderId,
      listingId: current.listing_id,
    },
  });

  return res.json(mapRowToOrder(updated));
});

ordersRouter.post("/:orderId/disputes/evidence/upload", requireAuth, async (req, res) => {
  const { orderId } = req.params;
  const actorId = req.auth.sub;
  const files = Array.isArray(req.body?.files) ? req.body.files : [];

  if (!files.length) {
    return res.status(400).json({ message: "At least one file is required." });
  }

  if (files.length > MAX_EVIDENCE_FILES_PER_REQUEST) {
    return res.status(400).json({ message: `Maximum ${MAX_EVIDENCE_FILES_PER_REQUEST} files allowed per upload.` });
  }

  const { data: orderRow, error: orderError } = await supabaseAdmin
    .from("marketplace_orders")
    .select("id,buyer_id,seller_id")
    .eq("id", orderId)
    .single();

  if (orderError || !orderRow) {
    return res.status(404).json({ message: orderError?.message || "Order not found." });
  }

  if (!isOrderParticipant(orderRow, actorId)) {
    return res.status(403).json({ message: "Only buyer or seller can upload dispute evidence." });
  }

  const uploadedEvidence = [];

  for (const file of files) {
    const originalName = safeFileName(file?.name || "evidence");
    const fileBuffer = decodeAttachment(file);
    if (fileBuffer.length > MAX_EVIDENCE_FILE_SIZE_BYTES) {
      return res.status(400).json({ message: `${originalName} exceeds 8MB size limit.` });
    }

    const storagePath = `${orderId}/${actorId}/${Date.now()}-${originalName}`;
    const contentType = String(file?.type || "application/octet-stream");

    const { error: uploadError } = await supabaseAdmin.storage
      .from(DISPUTE_EVIDENCE_BUCKET)
      .upload(storagePath, fileBuffer, {
        upsert: false,
        contentType,
      });

    if (uploadError) {
      return res.status(400).json({ message: uploadError.message || `Failed to upload ${originalName}.` });
    }

    const signed = await supabaseAdmin.storage
      .from(DISPUTE_EVIDENCE_BUCKET)
      .createSignedUrl(storagePath, 60 * 60);

    uploadedEvidence.push({
      type: contentType.startsWith("image/") ? "image" : "file",
      name: originalName,
      mimeType: contentType,
      sizeBytes: fileBuffer.length,
      storagePath,
      signedUrl: signed.data?.signedUrl || null,
      url: signed.data?.signedUrl || "",
      uploadedAt: new Date().toISOString(),
      note: "",
    });
  }

  return res.status(201).json({ evidence: uploadedEvidence });
});

ordersRouter.post("/:orderId/disputes", requireAuth, async (req, res) => {
  const { orderId } = req.params;
  const actorId = req.auth.sub;
  const title = String(req.body?.title || "").trim();
  const description = String(req.body?.description || "").trim();
  const reasonCode = String(req.body?.reasonCode || "").trim();
  const requestedResolution = String(req.body?.requestedResolution || "").trim();
  const priorityRaw = String(req.body?.priority || "medium").trim().toLowerCase();
  const priority = DISPUTE_PRIORITIES.includes(priorityRaw) ? priorityRaw : "medium";
  const evidence = normalizeEvidence(req.body?.evidence);

  if (!title || title.length < 5) {
    return res.status(400).json({ message: "Dispute title must be at least 5 characters." });
  }

  if (!description || description.length < 20) {
    return res.status(400).json({ message: "Dispute description must be at least 20 characters." });
  }

  if (!DISPUTE_REASON_CODES.includes(reasonCode)) {
    return res.status(400).json({ message: "Invalid dispute reason code." });
  }

  const { data: orderRow, error: orderError } = await supabaseAdmin
    .from("marketplace_orders")
    .select("id,listing_id,buyer_id,seller_id")
    .eq("id", orderId)
    .single();

  if (orderError || !orderRow) {
    return res.status(404).json({ message: orderError?.message || "Order not found." });
  }

  const actorRole = getParticipantRoleForOrder(orderRow, actorId);
  if (!actorRole) {
    return res.status(403).json({ message: "Only buyer or seller can file a dispute." });
  }

  const counterpartyUserId = actorRole === "buyer" ? orderRow.seller_id : orderRow.buyer_id;

  const { data: existing } = await supabaseAdmin
    .from("marketplace_order_disputes")
    .select("id,status")
    .eq("order_id", orderId)
    .in("status", ["open", "under_review", "awaiting_parties"])
    .limit(1)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ message: "An active dispute already exists for this order." });
  }

  const disputeInsertPayload = {
    order_id: orderId,
    listing_id: orderRow.listing_id,
    buyer_id: orderRow.buyer_id,
    seller_id: orderRow.seller_id,
    opened_by_user_id: actorId,
    opened_by_role: actorRole,
    counterparty_user_id: counterpartyUserId,
    reason_code: reasonCode,
    title,
    description,
    requested_resolution: requestedResolution || null,
    priority,
    evidence,
    status: "open",
  };

  const { data: disputeRow, error: disputeError } = await supabaseAdmin
    .from("marketplace_order_disputes")
    .insert(disputeInsertPayload)
    .select("*")
    .single();

  if (disputeError || !disputeRow) {
    return res.status(400).json({ message: disputeError?.message || "Failed to create dispute." });
  }

  const { data: messageRow, error: messageError } = await supabaseAdmin
    .from("marketplace_order_dispute_messages")
    .insert({
      dispute_id: disputeRow.id,
      order_id: orderId,
      author_user_id: actorId,
      author_type: actorRole,
      body: description,
      attachments: evidence,
      is_internal_note: false,
    })
    .select("*")
    .single();

  if (messageError || !messageRow) {
    return res.status(400).json({ message: messageError?.message || "Failed to add dispute message." });
  }

  await supabaseAdmin
    .from("marketplace_orders")
    .update({
      dispute_status: "open",
      latest_dispute_id: disputeRow.id,
    })
    .eq("id", orderId);

  const notifyRows = [
    {
      user_id: counterpartyUserId,
      actor_id: actorId,
      type: "order_dispute_created",
      title: "A dispute was opened on your order",
      body: title,
      data: {
        orderId,
        disputeId: disputeRow.id,
      },
    },
  ];

  const adminUserIds = await loadActiveAdminUserIds();
  for (const adminUserId of adminUserIds) {
    notifyRows.push({
      user_id: adminUserId,
      actor_id: actorId,
      type: "admin_dispute_alert",
      title: "New order dispute requires review",
      body: title,
      data: {
        orderId,
        disputeId: disputeRow.id,
      },
    });
  }

  await supabaseAdmin.from("notifications").insert(notifyRows);

  const disputeWithSignedEvidence = {
    ...disputeRow,
    evidence: await resolveEvidenceSignedUrls(disputeRow.evidence),
  };

  return res.status(201).json({
    dispute: mapDisputeRow(disputeWithSignedEvidence),
    initialMessage: mapDisputeMessageRow(messageRow),
  });
});

ordersRouter.get("/:orderId/disputes", requireAuth, async (req, res) => {
  const { orderId } = req.params;
  const actorId = req.auth.sub;

  const { data: orderRow, error: orderError } = await supabaseAdmin
    .from("marketplace_orders")
    .select("id,buyer_id,seller_id")
    .eq("id", orderId)
    .single();

  if (orderError || !orderRow) {
    return res.status(404).json({ message: orderError?.message || "Order not found." });
  }

  if (!isOrderParticipant(orderRow, actorId)) {
    return res.status(403).json({ message: "Only buyer or seller can view disputes." });
  }

  const { data, error } = await supabaseAdmin
    .from("marketplace_order_disputes")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to load disputes." });
  }

  const disputesWithSignedEvidence = await Promise.all(
    (data || []).map(async (row) => ({
      ...row,
      evidence: await resolveEvidenceSignedUrls(row.evidence),
    }))
  );

  return res.json(disputesWithSignedEvidence.map(mapDisputeRow));
});

ordersRouter.get("/:orderId/disputes/:disputeId", requireAuth, async (req, res) => {
  const { orderId, disputeId } = req.params;
  const actorId = req.auth.sub;

  const { data: orderRow, error: orderError } = await supabaseAdmin
    .from("marketplace_orders")
    .select("id,buyer_id,seller_id")
    .eq("id", orderId)
    .single();

  if (orderError || !orderRow) {
    return res.status(404).json({ message: orderError?.message || "Order not found." });
  }

  if (!isOrderParticipant(orderRow, actorId)) {
    return res.status(403).json({ message: "Only buyer or seller can view this dispute." });
  }

  const { data: disputeRow, error: disputeError } = await supabaseAdmin
    .from("marketplace_order_disputes")
    .select("*")
    .eq("id", disputeId)
    .eq("order_id", orderId)
    .single();

  if (disputeError || !disputeRow) {
    return res.status(404).json({ message: disputeError?.message || "Dispute not found." });
  }

  const { data: messages, error: messagesError } = await supabaseAdmin
    .from("marketplace_order_dispute_messages")
    .select("*")
    .eq("dispute_id", disputeId)
    .eq("is_internal_note", false)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return res.status(400).json({ message: messagesError.message || "Failed to load dispute messages." });
  }

  const disputeWithSignedEvidence = {
    ...disputeRow,
    evidence: await resolveEvidenceSignedUrls(disputeRow.evidence),
  };

  const messagesWithSignedAttachments = await Promise.all(
    (messages || []).map(async (row) => ({
      ...row,
      attachments: await resolveEvidenceSignedUrls(row.attachments),
    }))
  );

  return res.json({
    dispute: mapDisputeRow(disputeWithSignedEvidence),
    messages: messagesWithSignedAttachments.map(mapDisputeMessageRow),
  });
});

ordersRouter.post("/:orderId/disputes/:disputeId/messages", requireAuth, async (req, res) => {
  const { orderId, disputeId } = req.params;
  const actorId = req.auth.sub;
  const body = String(req.body?.body || "").trim();
  const attachments = normalizeEvidence(req.body?.attachments);

  if (!body || body.length < 3) {
    return res.status(400).json({ message: "Message must be at least 3 characters." });
  }

  const { data: orderRow, error: orderError } = await supabaseAdmin
    .from("marketplace_orders")
    .select("id,buyer_id,seller_id")
    .eq("id", orderId)
    .single();

  if (orderError || !orderRow) {
    return res.status(404).json({ message: orderError?.message || "Order not found." });
  }

  const authorType = getParticipantRoleForOrder(orderRow, actorId);
  if (!authorType) {
    return res.status(403).json({ message: "Only buyer or seller can reply on disputes." });
  }

  const { data: disputeRow, error: disputeError } = await supabaseAdmin
    .from("marketplace_order_disputes")
    .select("id,status,buyer_id,seller_id,title")
    .eq("id", disputeId)
    .eq("order_id", orderId)
    .single();

  if (disputeError || !disputeRow) {
    return res.status(404).json({ message: disputeError?.message || "Dispute not found." });
  }

  if (!DISPUTE_STATUSES.includes(disputeRow.status) || disputeRow.status === "closed") {
    return res.status(400).json({ message: "Cannot add messages to a closed dispute." });
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("marketplace_order_dispute_messages")
    .insert({
      dispute_id: disputeId,
      order_id: orderId,
      author_user_id: actorId,
      author_type: authorType,
      body,
      attachments,
      is_internal_note: false,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    return res.status(400).json({ message: insertError?.message || "Failed to add dispute message." });
  }

  await supabaseAdmin
    .from("marketplace_order_disputes")
    .update({
      status: disputeRow.status === "open" ? "awaiting_parties" : disputeRow.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", disputeId);

  const notifyRows = [];
  const counterpartyId = actorId === disputeRow.buyer_id ? disputeRow.seller_id : disputeRow.buyer_id;

  notifyRows.push({
    user_id: counterpartyId,
    actor_id: actorId,
    type: "order_dispute_message",
    title: "New dispute message",
    body: disputeRow.title || "A new message was posted in your order dispute.",
    data: {
      orderId,
      disputeId,
    },
  });

  const adminUserIds = await loadActiveAdminUserIds();
  for (const adminUserId of adminUserIds) {
    notifyRows.push({
      user_id: adminUserId,
      actor_id: actorId,
      type: "admin_dispute_message",
      title: "Dispute activity update",
      body: disputeRow.title || "A participant posted a new dispute message.",
      data: {
        orderId,
        disputeId,
      },
    });
  }

  await supabaseAdmin.from("notifications").insert(notifyRows);

  return res.status(201).json(mapDisputeMessageRow(inserted));
});
