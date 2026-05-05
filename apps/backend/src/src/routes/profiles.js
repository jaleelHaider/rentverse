import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";

export const profilesRouter = Router();

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const parsePagination = (query) => {
  const page = clamp(Number.parseInt(String(query.page || "1"), 10) || 1, 1, 10_000);
  const limit = clamp(Number.parseInt(String(query.limit || String(DEFAULT_PAGE_SIZE)), 10) || DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  return { page, limit, offset: (page - 1) * limit };
};

const normalizeReviewSort = (value) => {
  const key = String(value || "newest").trim().toLowerCase();
  if (["newest", "oldest", "highest", "lowest"].includes(key)) {
    return key;
  }
  return "newest";
};

const normalizeTransactionType = (value) => {
  const key = String(value || "all").trim().toLowerCase();
  if (key === "sold" || key === "rented") {
    return key;
  }
  return "all";
};

const normalizeTargetRole = (value) => {
  const key = String(value || "all").trim().toLowerCase();
  if (key === "seller" || key === "renter") {
    return key;
  }
  return "all";
};

const buildRatingBreakdown = (rows) => {
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of rows) {
    const rating = clamp(Number.parseInt(String(row.rating || 0), 10) || 0, 1, 5);
    if (rating >= 1 && rating <= 5) {
      breakdown[rating] += 1;
    }
  }
  return breakdown;
};

const computeAverageRating = (rows) => {
  if (!rows.length) {
    return 0;
  }
  const total = rows.reduce((sum, row) => sum + (Number(row.rating) || 0), 0);
  return Number((total / rows.length).toFixed(2));
};

const computePositivePercentage = (rows) => {
  if (!rows.length) {
    return 0;
  }
  const positive = rows.filter((row) => Number(row.rating) >= 4).length;
  return Number(((positive / rows.length) * 100).toFixed(1));
};

const mapListingCard = (row) => ({
  id: row.id,
  title: row.title,
  listingType: row.listing_type,
  status: row.status,
  price: {
    buy: row.buy_price,
    rentDaily: row.rent_daily_price,
    rentWeekly: row.rent_weekly_price,
    rentMonthly: row.rent_monthly_price,
  },
  imageUrl: row.listing_images?.[0]?.public_url || "",
  location: {
    city: row.location_city || "",
    area: row.location_state || row.location_address || "",
  },
  createdAt: row.created_at,
});

const mapReview = (row, helpers = {}) => ({
  id: row.id,
  orderId: row.order_id,
  listingId: row.listing_id,
  reviewerId: row.reviewer_id,
  revieweeId: row.reviewee_id,
  reviewTargetRole: row.review_target_role,
  transactionType: row.transaction_type,
  rating: row.rating,
  title: row.title || "",
  comment: row.comment || "",
  isPublic: row.is_public,
  createdAt: row.created_at,
  reviewerName: helpers.reviewerNameById?.get(row.reviewer_id) || "User",
  listingTitle: helpers.listingTitleById?.get(row.listing_id) || "Listing",
});

const fetchProfileIdentity = async (userId) => {
  let profileData = null;

  const withDescription = await supabaseAdmin
    .from("profiles")
    .select("id,name,city,description,created_at,kyc_status,verified_seller")
    .eq("id", userId)
    .maybeSingle();

  if (!withDescription.error && withDescription.data) {
    profileData = withDescription.data;
  } else {
    const withoutDescription = await supabaseAdmin
      .from("profiles")
      .select("id,name,city,created_at,kyc_status,verified_seller")
      .eq("id", userId)
      .maybeSingle();

    if (withoutDescription.error || !withoutDescription.data) {
      return null;
    }

    profileData = withoutDescription.data;
  }

  const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
  const metadataDescription = authUserData?.user?.user_metadata?.description;
  const safeDescription = typeof metadataDescription === "string" ? metadataDescription : "";

  return {
    ...profileData,
    description: profileData?.description || safeDescription,
  };
};

const fetchOrderStats = async (userId) => {
  const { data: asSeller, error: asSellerError } = await supabaseAdmin
    .from("marketplace_orders")
    .select("order_mode")
    .eq("seller_id", userId)
    .eq("status", "approved");

  if (asSellerError) {
    throw new Error(asSellerError.message || "Failed to load seller transaction stats.");
  }

  const { data: asBuyer, error: asBuyerError } = await supabaseAdmin
    .from("marketplace_orders")
    .select("order_mode")
    .eq("buyer_id", userId)
    .eq("status", "approved");

  if (asBuyerError) {
    throw new Error(asBuyerError.message || "Failed to load renter transaction stats.");
  }

  const sellerSoldCount = (asSeller || []).filter((row) => row.order_mode === "buy").length;
  const sellerRentedCount = (asSeller || []).filter((row) => row.order_mode === "rent").length;
  const buyerPurchasedCount = (asBuyer || []).filter((row) => row.order_mode === "buy").length;
  const buyerRentedCount = (asBuyer || []).filter((row) => row.order_mode === "rent").length;

  return {
    sellerSoldCount,
    sellerRentedCount,
    buyerPurchasedCount,
    buyerRentedCount,
    totalTransactions: (asSeller || []).length + (asBuyer || []).length,
  };
};

const fetchActiveListingsCount = async (userId) => {
  const { count, error } = await supabaseAdmin
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", userId)
    .eq("status", "active");

  if (error) {
    throw new Error(error.message || "Failed to load active listing count.");
  }

  return count || 0;
};

profilesRouter.get("/:userId/summary", async (req, res) => {
  const { userId } = req.params;

  const profile = await fetchProfileIdentity(userId);
  if (!profile) {
    return res.status(404).json({ message: "Profile not found." });
  }

  try {
    const [orderStats, activeListings, reviewsResult] = await Promise.all([
      fetchOrderStats(userId),
      fetchActiveListingsCount(userId),
      supabaseAdmin
        .from("marketplace_reviews")
        .select("id,rating,transaction_type,review_target_role")
        .eq("reviewee_id", userId)
        .eq("is_public", true),
    ]);

    if (reviewsResult.error) {
      return res.status(400).json({ message: reviewsResult.error.message || "Failed to load reviews." });
    }

    const reviews = reviewsResult.data || [];
    const ratingBreakdown = buildRatingBreakdown(reviews);
    const avgRating = computeAverageRating(reviews);
    const positivePercentage = computePositivePercentage(reviews);

    return res.json({
      profile: {
        id: profile.id,
        name: profile.name || "RentVerse User",
        city: profile.city || "",
        description: profile.description || "",
        memberSince: profile.created_at,
        kycVerified: String(profile.kyc_status || "").toLowerCase() === "verified",
        verifiedSeller: Boolean(profile.verified_seller),
      },
      stats: {
        ...orderStats,
        activeListings,
        totalReviews: reviews.length,
        avgRating,
        positivePercentage,
        ratingBreakdown,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profile summary.";
    return res.status(400).json({ message });
  }
});

profilesRouter.get("/:userId/reviews", async (req, res) => {
  const { userId } = req.params;
  const { page, limit, offset } = parsePagination(req.query);

  const search = String(req.query.search || "").trim().toLowerCase();
  const sort = normalizeReviewSort(req.query.sort);
  const transactionType = normalizeTransactionType(req.query.transactionType);
  const targetRole = normalizeTargetRole(req.query.targetRole);
  const ratingFilterRaw = Number.parseInt(String(req.query.rating || "0"), 10) || 0;
  const ratingFilter = ratingFilterRaw >= 1 && ratingFilterRaw <= 5 ? ratingFilterRaw : 0;

  const profile = await fetchProfileIdentity(userId);
  if (!profile) {
    return res.status(404).json({ message: "Profile not found." });
  }

  const { data, error } = await supabaseAdmin
    .from("marketplace_reviews")
    .select("id,order_id,listing_id,reviewer_id,reviewee_id,review_target_role,transaction_type,rating,title,comment,is_public,created_at")
    .eq("reviewee_id", userId)
    .eq("is_public", true)
    .limit(1000);

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to fetch reviews." });
  }

  let rows = data || [];

  if (transactionType !== "all") {
    rows = rows.filter((row) => row.transaction_type === transactionType);
  }

  if (targetRole !== "all") {
    rows = rows.filter((row) => row.review_target_role === targetRole);
  }

  if (ratingFilter > 0) {
    rows = rows.filter((row) => Number(row.rating) === ratingFilter);
  }

  const listingIds = [...new Set(rows.map((row) => row.listing_id).filter(Boolean))];
  const reviewerIds = [...new Set(rows.map((row) => row.reviewer_id).filter(Boolean))];

  const [{ data: listingRows }, { data: reviewerRows }] = await Promise.all([
    listingIds.length
      ? supabaseAdmin.from("listings").select("id,title").in("id", listingIds)
      : Promise.resolve({ data: [] }),
    reviewerIds.length
      ? supabaseAdmin.from("profiles").select("id,name").in("id", reviewerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const listingTitleById = new Map((listingRows || []).map((row) => [row.id, row.title || "Listing"]));
  const reviewerNameById = new Map((reviewerRows || []).map((row) => [row.id, row.name || "User"]));

  if (search) {
    rows = rows.filter((row) => {
      const title = String(row.title || "").toLowerCase();
      const comment = String(row.comment || "").toLowerCase();
      const listingTitle = String(listingTitleById.get(row.listing_id) || "").toLowerCase();
      const reviewerName = String(reviewerNameById.get(row.reviewer_id) || "").toLowerCase();
      return (
        title.includes(search) ||
        comment.includes(search) ||
        listingTitle.includes(search) ||
        reviewerName.includes(search)
      );
    });
  }

  if (sort === "newest") {
    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sort === "oldest") {
    rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else if (sort === "highest") {
    rows.sort((a, b) => Number(b.rating) - Number(a.rating));
  } else if (sort === "lowest") {
    rows.sort((a, b) => Number(a.rating) - Number(b.rating));
  }

  const total = rows.length;
  const pagedRows = rows.slice(offset, offset + limit);

  return res.json({
    reviews: pagedRows.map((row) => mapReview(row, { listingTitleById, reviewerNameById })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

profilesRouter.get("/:userId/listings", async (req, res) => {
  const { userId } = req.params;
  const status = String(req.query.status || "active").trim().toLowerCase();

  const profile = await fetchProfileIdentity(userId);
  if (!profile) {
    return res.status(404).json({ message: "Profile not found." });
  }

  let query = supabaseAdmin
    .from("listings")
    .select("id,title,listing_type,status,buy_price,rent_daily_price,rent_weekly_price,rent_monthly_price,location_city,location_state,location_address,created_at,listing_images(public_url,is_primary,display_order)")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to fetch listings." });
  }

  const rows = (data || []).map((row) => {
    const sortedImages = [...(row.listing_images || [])].sort((a, b) => {
      if (a.is_primary === b.is_primary) {
        return a.display_order - b.display_order;
      }
      return a.is_primary ? -1 : 1;
    });

    return {
      ...row,
      listing_images: sortedImages,
    };
  });

  return res.json({ listings: rows.map(mapListingCard) });
});

profilesRouter.get("/reviews/eligible", requireAuth, async (req, res) => {
  const reviewerId = req.auth.sub;
  const revieweeId = String(req.query.revieweeId || "").trim();
  const listingId = String(req.query.listingId || "").trim();

  if (!revieweeId) {
    return res.status(400).json({ message: "revieweeId is required." });
  }

  let query = supabaseAdmin
    .from("marketplace_orders")
    .select("id,listing_id,buyer_id,seller_id,order_mode,status")
    .or(`buyer_id.eq.${reviewerId},seller_id.eq.${reviewerId}`)
    .eq("status", "approved");

  if (listingId) {
    query = query.eq("listing_id", listingId);
  }

  const { data: orders, error: ordersError } = await query;
  if (ordersError) {
    return res.status(400).json({ message: ordersError.message || "Failed to load eligible orders." });
  }

  const participantOrders = (orders || []).filter((order) => {
    if (reviewerId === order.buyer_id) {
      return order.seller_id === revieweeId;
    }
    if (reviewerId === order.seller_id) {
      return order.buyer_id === revieweeId;
    }
    return false;
  });

  if (!participantOrders.length) {
    return res.json({ eligibleOrderIds: [] });
  }

  const orderIds = participantOrders.map((order) => order.id);
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("marketplace_reviews")
    .select("order_id")
    .eq("reviewer_id", reviewerId)
    .eq("reviewee_id", revieweeId)
    .in("order_id", orderIds);

  if (existingError) {
    return res.status(400).json({ message: existingError.message || "Failed to check existing reviews." });
  }

  const alreadyReviewed = new Set((existing || []).map((row) => row.order_id));
  const eligibleOrderIds = orderIds.filter((id) => !alreadyReviewed.has(id));

  return res.json({ eligibleOrderIds });
});

profilesRouter.post("/reviews", requireAuth, async (req, res) => {
  const reviewerId = req.auth.sub;
  const { orderId, revieweeId, rating, title, comment, isPublic = true } = req.body || {};

  const normalizedRevieweeId = String(revieweeId || "").trim();
  const normalizedOrderId = String(orderId || "").trim();
  const normalizedRating = Number.parseInt(String(rating || "0"), 10);

  if (!normalizedOrderId || !normalizedRevieweeId) {
    return res.status(400).json({ message: "orderId and revieweeId are required." });
  }

  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    return res.status(400).json({ message: "rating must be an integer between 1 and 5." });
  }

  if (reviewerId === normalizedRevieweeId) {
    return res.status(400).json({ message: "You cannot review yourself." });
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("marketplace_orders")
    .select("id,listing_id,buyer_id,seller_id,order_mode,status")
    .eq("id", normalizedOrderId)
    .single();

  if (orderError || !order) {
    return res.status(404).json({ message: orderError?.message || "Order not found." });
  }

  if (order.status !== "approved") {
    return res.status(400).json({ message: "Reviews can only be submitted for approved transactions." });
  }

  let reviewTargetRole = "seller";
  if (reviewerId === order.buyer_id) {
    if (normalizedRevieweeId !== order.seller_id) {
      return res.status(400).json({ message: "Buyers can only review the seller for this order." });
    }
    reviewTargetRole = "seller";
  } else if (reviewerId === order.seller_id) {
    if (normalizedRevieweeId !== order.buyer_id) {
      return res.status(400).json({ message: "Sellers can only review the renter/buyer for this order." });
    }
    reviewTargetRole = "renter";
  } else {
    return res.status(403).json({ message: "You are not a participant in this order." });
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("marketplace_reviews")
    .select("id")
    .eq("order_id", normalizedOrderId)
    .eq("reviewer_id", reviewerId)
    .eq("reviewee_id", normalizedRevieweeId)
    .maybeSingle();

  if (existingError) {
    return res.status(400).json({ message: existingError.message || "Failed to validate existing review." });
  }

  if (existing) {
    return res.status(400).json({ message: "You already reviewed this user for this transaction." });
  }

  const transactionType = order.order_mode === "buy" ? "sold" : "rented";

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("marketplace_reviews")
    .insert({
      order_id: normalizedOrderId,
      listing_id: order.listing_id,
      reviewer_id: reviewerId,
      reviewee_id: normalizedRevieweeId,
      review_target_role: reviewTargetRole,
      transaction_type: transactionType,
      rating: normalizedRating,
      title: String(title || "").trim() || null,
      comment: String(comment || "").trim() || null,
      is_public: Boolean(isPublic),
    })
    .select("id,order_id,listing_id,reviewer_id,reviewee_id,review_target_role,transaction_type,rating,title,comment,is_public,created_at")
    .single();

  if (insertError || !inserted) {
    return res.status(400).json({ message: insertError?.message || "Failed to submit review." });
  }

  return res.json({ review: mapReview(inserted) });
});
