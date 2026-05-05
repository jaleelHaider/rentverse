import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";

export const reportsRouter = Router();

const LISTING_REASON_CODES = [
  "fake_listing",
  "misleading_description",
  "prohibited_item",
  "spam_or_scam",
  "copyright_or_stolen_content",
  "wrong_category",
  "offensive_content",
  "other",
];

const USER_REASON_CODES = [
  "fraud_or_scam",
  "abusive_behavior",
  "harassment",
  "fake_identity",
  "payment_issue",
  "spam_behavior",
  "other",
];

const normalizeText = (value, maxLength = 2000) => String(value || "").trim().slice(0, maxLength);

reportsRouter.post("/listing", requireAuth, async (req, res) => {
  const reporterUserId = req.auth?.sub;
  const listingId = normalizeText(req.body?.listingId, 128);
  const reasonCode = normalizeText(req.body?.reasonCode, 120);
  const description = normalizeText(req.body?.description, 2000);

  if (!reporterUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!listingId || !reasonCode) {
    return res.status(400).json({ message: "listingId and reasonCode are required." });
  }

  if (!LISTING_REASON_CODES.includes(reasonCode)) {
    return res.status(400).json({ message: "Invalid listing report reason." });
  }

  const { data: listing, error: listingError } = await supabaseAdmin
    .from("listings")
    .select("id,owner_user_id,title")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError) {
    return res.status(400).json({ message: listingError.message || "Failed to validate listing." });
  }

  if (!listing) {
    return res.status(404).json({ message: "Listing not found." });
  }

  if (listing.owner_user_id === reporterUserId) {
    return res.status(400).json({ message: "You cannot report your own listing." });
  }

  const { data: existingListingReport, error: existingListingReportError } = await supabaseAdmin
    .from("moderation_reports")
    .select("id")
    .eq("reporter_user_id", reporterUserId)
    .eq("target_type", "listing")
    .eq("target_listing_id", listingId)
    .maybeSingle();

  if (existingListingReportError) {
    return res.status(400).json({ message: existingListingReportError.message || "Failed to check existing listing report." });
  }

  const basePayload = {
    reason_code: reasonCode,
    description: description || null,
    status: "open",
    reviewed_at: null,
    reviewed_by_admin_user_id: null,
    admin_note: null,
    updated_at: new Date().toISOString(),
  };

  let data = null;
  let error = null;
  if (existingListingReport?.id) {
    const result = await supabaseAdmin
      .from("moderation_reports")
      .update(basePayload)
      .eq("id", existingListingReport.id)
      .select("id,target_listing_id,reason_code,description,status,created_at,updated_at")
      .single();
    data = result.data;
    error = result.error;
  } else {
    const result = await supabaseAdmin
      .from("moderation_reports")
      .insert({
        reporter_user_id: reporterUserId,
        target_type: "listing",
        target_listing_id: listingId,
        ...basePayload,
      })
      .select("id,target_listing_id,reason_code,description,status,created_at,updated_at")
      .single();
    data = result.data;
    error = result.error;
  }

  if (error || !data) {
    return res.status(400).json({ message: error?.message || "Failed to submit listing report." });
  }

  return res.status(201).json({
    id: data.id,
    listingId: data.target_listing_id,
    reasonCode: data.reason_code,
    description: data.description,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
});

reportsRouter.post("/user", requireAuth, async (req, res) => {
  const reporterUserId = req.auth?.sub;
  const targetUserId = normalizeText(req.body?.userId, 128);
  const reasonCode = normalizeText(req.body?.reasonCode, 120);
  const description = normalizeText(req.body?.description, 2000);

  if (!reporterUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!targetUserId || !reasonCode) {
    return res.status(400).json({ message: "userId and reasonCode are required." });
  }

  if (!USER_REASON_CODES.includes(reasonCode)) {
    return res.status(400).json({ message: "Invalid user report reason." });
  }

  if (targetUserId === reporterUserId) {
    return res.status(400).json({ message: "You cannot report your own account." });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", targetUserId)
    .maybeSingle();

  if (profileError) {
    return res.status(400).json({ message: profileError.message || "Failed to validate user." });
  }

  if (!profile) {
    return res.status(404).json({ message: "User not found." });
  }

  const { data: existingUserReport, error: existingUserReportError } = await supabaseAdmin
    .from("moderation_reports")
    .select("id")
    .eq("reporter_user_id", reporterUserId)
    .eq("target_type", "user")
    .eq("target_user_id", targetUserId)
    .maybeSingle();

  if (existingUserReportError) {
    return res.status(400).json({ message: existingUserReportError.message || "Failed to check existing user report." });
  }

  const basePayload = {
    reason_code: reasonCode,
    description: description || null,
    status: "open",
    reviewed_at: null,
    reviewed_by_admin_user_id: null,
    admin_note: null,
    updated_at: new Date().toISOString(),
  };

  let data = null;
  let error = null;
  if (existingUserReport?.id) {
    const result = await supabaseAdmin
      .from("moderation_reports")
      .update(basePayload)
      .eq("id", existingUserReport.id)
      .select("id,target_user_id,reason_code,description,status,created_at,updated_at")
      .single();
    data = result.data;
    error = result.error;
  } else {
    const result = await supabaseAdmin
      .from("moderation_reports")
      .insert({
        reporter_user_id: reporterUserId,
        target_type: "user",
        target_user_id: targetUserId,
        ...basePayload,
      })
      .select("id,target_user_id,reason_code,description,status,created_at,updated_at")
      .single();
    data = result.data;
    error = result.error;
  }

  if (error || !data) {
    return res.status(400).json({ message: error?.message || "Failed to submit user report." });
  }

  return res.status(201).json({
    id: data.id,
    userId: data.target_user_id,
    reasonCode: data.reason_code,
    description: data.description,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
});
