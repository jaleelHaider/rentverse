import { Router } from "express";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";

export const listingsRouter = Router();

const LISTING_IMAGES_BUCKET = "listing-images";
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8008";
const AI_SERVICE_TIMEOUT_MS = Number(process.env.AI_SERVICE_TIMEOUT_MS || 12000);
const PREDICT_RATE_LIMIT_WINDOW_MS = Number(process.env.PREDICT_RATE_LIMIT_WINDOW_MS || 60_000);
const PREDICT_RATE_LIMIT_MAX = Number(process.env.PREDICT_RATE_LIMIT_MAX || 40);
const IMAGE_CHECK_RATE_LIMIT_WINDOW_MS = Number(process.env.IMAGE_CHECK_RATE_LIMIT_WINDOW_MS || 60_000);
const IMAGE_CHECK_RATE_LIMIT_MAX = Number(process.env.IMAGE_CHECK_RATE_LIMIT_MAX || 60);
const predictRateLimitStore = new Map();
const imageCheckRateLimitStore = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientFetchError = (error) => {
  if (!(error instanceof TypeError)) {
    return false;
  }
  return /failed to fetch|fetch/i.test(error.message);
};

const withTransientRetry = async (operation) => {
  try {
    return await operation();
  } catch (error) {
    if (!isTransientFetchError(error)) {
      throw error;
    }

    await sleep(400);
    return await operation();
  }
};

const mapListingTypeForClient = (type) => {
  if (type === "sell") {
    return "buy";
  }
  return type;
};

const mapConditionForCard = (value) => {
  const normalized = value.trim().toLowerCase();

  if (normalized === "excellent" || normalized === "like_new" || normalized === "like new") {
    return "Like New";
  }
  if (normalized === "new") {
    return "Brand New";
  }
  if (normalized === "fair") {
    return "Fair";
  }
  if (normalized === "poor") {
    return "Needs Work";
  }

  return "Good";
};

const formatRelativeCreatedAt = (isoDate) => {
  const created = new Date(isoDate).getTime();
  if (!Number.isFinite(created)) {
    return "Recently";
  }

  const diffMs = Date.now() - created;
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor(diffMs / dayMs);

  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;

  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
};

const mapStatusForClient = (status) => {
  if (status === "draft") return "pending";
  if (status === "archived") return "paused";
  if (status === "sold" || status === "rented" || status === "pending" || status === "paused") {
    return status;
  }
  return "active";
};

const normalizeSearchText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenizeSearchQuery = (query) => {
  const compact = normalizeSearchText(query);
  if (!compact) {
    return [];
  }

  return [...new Set(compact.split(" ").map((token) => token.trim()).filter((token) => token.length >= 2))];
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SEARCH_SYNONYM_GROUPS = [
  ["phone", "mobile", "cell", "smartphone"],
  ["tv", "television", "led", "smart tv"],
  ["fridge", "refrigerator", "freezer"],
  ["sofa", "couch", "settee"],
  ["bike", "bicycle", "cycle"],
  ["laptop", "notebook", "macbook"],
  ["camera", "dslr", "mirrorless", "photography"],
  ["speaker", "audio", "sound system"],
  ["table", "desk"],
  ["car", "vehicle", "auto"],
  ["tools", "equipment", "gear"],
  ["party", "event", "events"],
  ["home", "household", "house"],
];

const SEARCH_SYNONYM_MAP = new Map();

for (const group of SEARCH_SYNONYM_GROUPS) {
  for (const term of group) {
    const key = normalizeSearchText(term);
    const variants = group
      .map((item) => normalizeSearchText(item))
      .filter((item) => item.length > 0 && item !== key);
    SEARCH_SYNONYM_MAP.set(key, [...new Set([...(SEARCH_SYNONYM_MAP.get(key) || []), ...variants])]);
  }
}

const levenshteinDistance = (left, right) => {
  const a = String(left || "");
  const b = String(right || "");

  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previousRow = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    let previousDiagonal = previousRow[0];
    previousRow[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const temp = previousRow[j];
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      previousRow[j] = Math.min(
        previousRow[j] + 1,
        previousRow[j - 1] + 1,
        previousDiagonal + substitutionCost,
      );
      previousDiagonal = temp;
    }
  }

  return previousRow[b.length];
};

const expandQueryToken = (token) => {
  const normalized = normalizeSearchText(token);
  const variants = new Set([normalized]);

  const synonymVariants = SEARCH_SYNONYM_MAP.get(normalized) || [];
  for (const variant of synonymVariants) {
    variants.add(variant);
  }

  if (normalized.endsWith("s") && normalized.length > 3) {
    variants.add(normalized.slice(0, -1));
  } else if (normalized.length > 3) {
    variants.add(`${normalized}s`);
  }

  return [...variants].filter(Boolean);
};

const tokenMatchesText = (token, text) => {
  const normalizedToken = normalizeSearchText(token);
  const normalizedText = normalizeSearchText(text);
  if (!normalizedToken || !normalizedText) {
    return false;
  }

  if (normalizedText === normalizedToken || normalizedText.includes(normalizedToken) || normalizedToken.includes(normalizedText)) {
    return true;
  }

  const textTokens = normalizedText.split(" ").filter(Boolean);
  const searchVariants = expandQueryToken(normalizedToken);

  for (const variant of searchVariants) {
    if (normalizedText.includes(variant)) {
      return true;
    }

    for (const textToken of textTokens) {
      if (textToken === variant || textToken.includes(variant) || variant.includes(textToken)) {
        return true;
      }

      const maxDistance = Math.max(textToken.length, variant.length) <= 4 ? 1 : 2;
      if (levenshteinDistance(textToken, variant) <= maxDistance) {
        return true;
      }
    }
  }

  return false;
};

const parseCsvSet = (value) => {
  const raw = String(value || "");
  const items = raw
    .split(",")
    .map((item) => normalizeSearchText(item))
    .filter((item) => item.length > 0);
  return new Set(items);
};

const parseBooleanQuery = (value) => {
  const normalized = normalizeSearchText(value);
  if (["1", "true", "yes", "y"].includes(normalized)) return true;
  if (["0", "false", "no", "n"].includes(normalized)) return false;
  return null;
};

const parseNumberQuery = (value) => {
  const parsed = Number.parseFloat(String(value || ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const getListingSearchBasePrice = (row) => {
  const candidates = [row.rent_daily_price, row.buy_price]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!candidates.length) {
    return 0;
  }

  return Math.min(...candidates);
};

const matchesSearchFilters = (row, filters) => {
  const rowCategory = normalizeSearchText(row.category);
  const rowCondition = normalizeSearchText(row.condition).replace(/\s+/g, "_");
  const rowListingType = mapListingTypeForClient(row.listing_type);
  const listingPrice = getListingSearchBasePrice(row);

  if (filters.categories.size > 0 && !filters.categories.has(rowCategory)) {
    return false;
  }

  if (filters.conditions.size > 0 && !filters.conditions.has(rowCondition)) {
    return false;
  }

  if (filters.listingTypes.size > 0 && !filters.listingTypes.has(rowListingType)) {
    return false;
  }

  void filters.sellerVerified;

  if (filters.ratingMin > 0 && (Number(row.seller_rating) || 0) < filters.ratingMin) {
    return false;
  }

  if (filters.minPrice !== null && listingPrice > 0 && listingPrice < filters.minPrice) {
    return false;
  }

  if (filters.maxPrice !== null && listingPrice > filters.maxPrice) {
    return false;
  }

  return true;
};

const parseSearchFilters = (reqQuery) => ({
  categories: parseCsvSet(reqQuery.category),
  conditions: parseCsvSet(reqQuery.condition),
  listingTypes: parseCsvSet(reqQuery.type || reqQuery.listingType),
  sellerVerified: parseBooleanQuery(reqQuery.sellerVerified),
  ratingMin: Math.max(0, parseNumberQuery(reqQuery.ratingMin) || 0),
  minPrice: parseNumberQuery(reqQuery.minPrice),
  maxPrice: parseNumberQuery(reqQuery.maxPrice),
});

const getListingSearchCorpus = (row) => {
  const featuresText = Array.isArray(row.features) ? row.features.join(" ") : "";
  const specificationsText = row.specifications ? Object.values(row.specifications).join(" ") : "";

  return {
    title: normalizeSearchText(row.title),
    description: normalizeSearchText(row.description),
    category: normalizeSearchText(row.category),
    subCategory: normalizeSearchText(row.sub_category),
    condition: normalizeSearchText(row.condition),
    location: normalizeSearchText(
      [row.location_city, row.location_state, row.location_address].filter(Boolean).join(" ")
    ),
    features: normalizeSearchText(featuresText),
    specifications: normalizeSearchText(specificationsText),
  };
};

const computeFreshnessBoost = (createdAt) => {
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) {
    return 0;
  }

  const ageDays = Math.max(0, (Date.now() - createdMs) / (1000 * 60 * 60 * 24));
  if (ageDays <= 2) return 12;
  if (ageDays <= 7) return 8;
  if (ageDays <= 30) return 4;
  return 0;
};

const computeMarketplaceSearchScore = (row, normalizedQuery, queryTokens) => {
  if (!normalizedQuery || queryTokens.length === 0) {
    return { score: 0, matchedTokens: 0, hasPhraseMatch: false, isMatch: true };
  }

  const corpus = getListingSearchCorpus(row);
  const searchableCombined = [
    corpus.title,
    corpus.category,
    corpus.subCategory,
    corpus.description,
    corpus.features,
    corpus.specifications,
    corpus.location,
    corpus.condition,
  ]
    .filter(Boolean)
    .join(" ");

  let score = 0;
  let matchedTokens = 0;

  const hasPhraseMatch = corpus.title.includes(normalizedQuery) || corpus.description.includes(normalizedQuery);
  if (hasPhraseMatch) {
    score += corpus.title.includes(normalizedQuery) ? 110 : 55;
  }

  if (corpus.title.startsWith(normalizedQuery)) {
    score += 60;
  }

  for (const token of queryTokens) {
    let matched = false;
    const wholeWordPattern = new RegExp(`\\b${escapeRegExp(token)}\\b`, "i");

    const tokenVariants = expandQueryToken(token);
    const tokenMatches = (text) => tokenVariants.some((variant) => tokenMatchesText(variant, text));

    if (wholeWordPattern.test(corpus.title) || tokenMatches(corpus.title)) {
      score += 36;
      matched = true;
    } else if (corpus.title.includes(token)) {
      score += 24;
      matched = true;
    }

    if (wholeWordPattern.test(corpus.category) || wholeWordPattern.test(corpus.subCategory) || tokenMatches(corpus.category) || tokenMatches(corpus.subCategory)) {
      score += 22;
      matched = true;
    }

    if (wholeWordPattern.test(corpus.description) || tokenMatches(corpus.description)) {
      score += 12;
      matched = true;
    } else if (corpus.description.includes(token)) {
      score += 8;
      matched = true;
    }

    if (tokenMatches(corpus.features) || tokenMatches(corpus.specifications)) {
      score += 7;
      matched = true;
    }

    if (tokenMatches(corpus.location) || tokenMatches(corpus.condition)) {
      score += 5;
      matched = true;
    }

    if (matched) {
      matchedTokens += 1;
    }
  }

  const tokenCoverage = matchedTokens / queryTokens.length;
  score += tokenCoverage * 45;

  const sellerRating = Number(row.seller_rating) || 0;
  const sellerReviews = Number(row.seller_total_reviews) || 0;
  score += Math.min(16, sellerRating * 2);
  score += Math.min(10, sellerReviews / 20);

  const hasAvailableInventory =
    (Number(row.available_for_rent) || 0) > 0 || (Number(row.available_for_sale) || 0) > 0;
  if (hasAvailableInventory) {
    score += 6;
  }

  score += computeFreshnessBoost(row.created_at);

  const isMatch = hasPhraseMatch || matchedTokens > 0 || searchableCombined.includes(normalizedQuery);
  return { score, matchedTokens, hasPhraseMatch, isMatch };
};

const compareSearchRowsBySort = (left, right, sortBy) => {
  const leftPrice = getListingSearchBasePrice(left.row);
  const rightPrice = getListingSearchBasePrice(right.row);
  const leftRating = Number(left.row.seller_rating) || 0;
  const rightRating = Number(right.row.seller_rating) || 0;
  const leftTrust = Number(left.row.seller_total_reviews) || 0;
  const rightTrust = Number(right.row.seller_total_reviews) || 0;
  const leftCreated = new Date(left.row.created_at).getTime();
  const rightCreated = new Date(right.row.created_at).getTime();

  if (sortBy === "newest") {
    return rightCreated - leftCreated;
  }
  if (sortBy === "price_low") {
    return leftPrice - rightPrice || right.relevanceScore - left.relevanceScore;
  }
  if (sortBy === "price_high") {
    return rightPrice - leftPrice || right.relevanceScore - left.relevanceScore;
  }
  if (sortBy === "rating") {
    return rightRating - leftRating || right.relevanceScore - left.relevanceScore;
  }
  if (sortBy === "trust") {
    return rightTrust - leftTrust || right.relevanceScore - left.relevanceScore;
  }

  return right.relevanceScore - left.relevanceScore || rightCreated - leftCreated;
};

const recordMarketplaceSearchEvent = async (payload) => {
  const insertPayload = {
    event_type: payload.eventType,
    search_session_id: payload.searchSessionId,
    query: payload.query,
    normalized_query: normalizeSearchText(payload.query),
    result_count: payload.resultCount,
    page: payload.page,
    page_size: payload.pageSize,
    sort_by: payload.sortBy,
    filters: payload.filters || {},
    listing_id: payload.listingId || null,
    rank_position: payload.rankPosition || null,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin.from("marketplace_search_events").insert(insertPayload);
  if (error) {
    throw new Error(error.message || "Failed to record search analytics");
  }
};

const buildSearchAnalyticsSummary = async () => {
  const { data, error } = await supabaseAdmin
    .from("marketplace_search_events")
    .select("event_type,query,normalized_query,result_count,rank_position,page,page_size,sort_by,listing_id,search_session_id,created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    throw new Error(error.message || "Failed to load search analytics");
  }

  const events = data || [];
  const searchEvents = events.filter((item) => item.event_type === "search");
  const clickEvents = events.filter((item) => item.event_type === "click");

  const queryStats = new Map();
  for (const event of searchEvents) {
    const key = event.normalized_query || normalizeSearchText(event.query);
    const current = queryStats.get(key) || {
      query: event.query,
      normalizedQuery: key,
      searches: 0,
      zeroResults: 0,
      totalResults: 0,
    };

    current.searches += 1;
    current.totalResults += Number(event.result_count) || 0;
    if ((Number(event.result_count) || 0) === 0) {
      current.zeroResults += 1;
    }

    queryStats.set(key, current);
  }

  const topQueries = [...queryStats.values()]
    .sort((left, right) => right.searches - left.searches || right.totalResults - left.totalResults)
    .slice(0, 20)
    .map((item) => ({
      query: item.query,
      searches: item.searches,
      zeroResults: item.zeroResults,
      averageResults: item.searches > 0 ? Number((item.totalResults / item.searches).toFixed(2)) : 0,
    }));

  const zeroResults = [...queryStats.values()]
    .filter((item) => item.zeroResults > 0)
    .sort((left, right) => right.zeroResults - left.zeroResults || right.searches - left.searches)
    .slice(0, 20)
    .map((item) => ({
      query: item.query,
      zeroResults: item.zeroResults,
      searches: item.searches,
    }));

  const clicksByRank = new Map();
  for (const event of clickEvents) {
    const rank = Number(event.rank_position) || 0;
    if (!rank) continue;
    clicksByRank.set(rank, (clicksByRank.get(rank) || 0) + 1);
  }

  const impressionsByRank = new Map();
  for (const event of searchEvents) {
    const resultCount = Number(event.result_count) || 0;
    const maxRank = Math.min(resultCount, 10);
    for (let rank = 1; rank <= maxRank; rank += 1) {
      impressionsByRank.set(rank, (impressionsByRank.get(rank) || 0) + 1);
    }
  }

  const ctrByRank = [...impressionsByRank.keys()]
    .sort((left, right) => left - right)
    .slice(0, 10)
    .map((rank) => {
      const impressions = impressionsByRank.get(rank) || 0;
      const clicks = clicksByRank.get(rank) || 0;
      return {
        rank,
        impressions,
        clicks,
        ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
      };
    });

  const recentSearches = searchEvents.slice(0, 25).map((event) => ({
    searchSessionId: event.search_session_id,
    query: event.query,
    resultCount: Number(event.result_count) || 0,
    page: Number(event.page) || 1,
    pageSize: Number(event.page_size) || 0,
    sortBy: event.sort_by || "relevant",
    createdAt: event.created_at,
  }));

  return {
    totalSearches: searchEvents.length,
    totalClicks: clickEvents.length,
    topQueries,
    zeroResults,
    ctrByRank,
    recentSearches,
  };
};

const mapRowToMarketplaceListing = (row) => {
  const sortedImages = [...(row.listing_images || [])].sort((a, b) => {
    if (a.is_primary === b.is_primary) {
      return a.display_order - b.display_order;
    }
    return a.is_primary ? -1 : 1;
  });

  const images = sortedImages.map((image) => image.public_url);
  const listingType = mapListingTypeForClient(row.listing_type);
  const normalizedStatus = mapStatusForClient(row.status);
  const rawSpecifications = row.specifications || {};
  const sellerTermsRaw = rawSpecifications.__seller_terms || "";
  const sellerTerms = sellerTermsRaw
    .split("\n")
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
  const specifications = { ...rawSpecifications };
  delete specifications.__seller_terms;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: listingType,
    category: row.category,
    subCategory: row.sub_category || "",
    categoryNodeKey: row.category_node_key || "",
    categoryPath: row.category_path_snapshot || "",
    condition: mapConditionForCard(row.condition),
    price: {
      buy: row.buy_price ?? undefined,
      rent: row.rent_daily_price
        ? {
            daily: row.rent_daily_price,
            weekly: row.rent_weekly_price || row.rent_daily_price * 5,
            monthly: row.rent_monthly_price || row.rent_daily_price * 20,
          }
        : undefined,
      securityDeposit: row.security_deposit ?? undefined,
    },
    images,
    location: {
      city: row.location_city || "Unknown City",
      area: row.location_state || row.location_address || "Area not provided",
      coordinates:
        row.location_lat !== null && row.location_lng !== null
          ? [row.location_lat, row.location_lng]
          : undefined,
      address: row.location_address || undefined,
    },
    specifications,
    features: row.features || [],
    sellerTerms,
    seller: {
      id: row.owner_user_id,
      name: row.owner_name || "Owner",
      avatar: "",
      rating: row.seller_rating || 0,
      verified: Boolean(row.owner_verified_seller),
      trustScore: Math.min(100, Math.round((row.seller_rating || 0) * 20)),
      responseRate: 0,
      totalReviews: row.seller_total_reviews || 0,
    },
    availability: {
      forRent: listingType === "rent" || listingType === "both",
      forSale: listingType === "buy" || listingType === "both",
      totalForRent: row.total_for_rent ?? 0,
      availableForRent: row.available_for_rent ?? 0,
      totalForSale: row.total_for_sale ?? 0,
      availableForSale: row.available_for_sale ?? 0,
    },
    aiMetadata: {
      qualityScore: 0,
      priceFairness: 0,
      fraudRisk: 0,
      categoryConfidence: row.category_confidence || 0,
    },
    views: 0,
    saves: Number(row.saves_count) || 0,
    createdAt: formatRelativeCreatedAt(row.created_at),
    updatedAt: row.updated_at,
    status: normalizedStatus,
  };
};

const enrichRowsWithSavedStats = async (rows) => {
  const listingIds = [...new Set((rows || []).map((row) => row.id).filter(Boolean))];

  if (!listingIds.length) {
    return rows.map((row) => ({ ...row, saves_count: 0 }));
  }

  const { data, error } = await supabaseAdmin
    .from("saved_listings")
    .select("listing_id")
    .in("listing_id", listingIds);

  if (error) {
    return rows.map((row) => ({ ...row, saves_count: 0 }));
  }

  const saveCountByListingId = new Map();
  for (const saveRow of data || []) {
    const listingId = saveRow.listing_id;
    saveCountByListingId.set(listingId, (saveCountByListingId.get(listingId) || 0) + 1);
  }

  return rows.map((row) => ({
    ...row,
    saves_count: saveCountByListingId.get(row.id) || 0,
  }));
};

const enrichListingsWithSellerStats = async (rows) => {
  const ownerIds = [...new Set((rows || []).map((row) => row.owner_user_id).filter(Boolean))];

  if (!ownerIds.length) {
    return rows.map((row) => ({ ...row, seller_rating: 0, seller_total_reviews: 0, owner_verified_seller: false }));
  }

  const [reviewsResult, profilesResult] = await Promise.all([
    supabaseAdmin
      .from("marketplace_reviews")
      .select("reviewee_id,rating,review_target_role")
      .in("reviewee_id", ownerIds)
      .eq("is_public", true)
      .eq("review_target_role", "seller"),
    supabaseAdmin
      .from("profiles")
      .select("id,verified_seller")
      .in("id", ownerIds),
  ]);

  if (reviewsResult.error) {
    return rows.map((row) => ({ ...row, seller_rating: 0, seller_total_reviews: 0, owner_verified_seller: false }));
  }

  const statsByOwner = new Map();
  for (const review of reviewsResult.data || []) {
    const ownerId = review.reviewee_id;
    const current = statsByOwner.get(ownerId) || { sum: 0, count: 0 };
    current.sum += Number(review.rating) || 0;
    current.count += 1;
    statsByOwner.set(ownerId, current);
  }

  const verifiedSellerByOwnerId = new Map(
    profilesResult.error ? [] : (profilesResult.data || []).map((profile) => [profile.id, Boolean(profile.verified_seller)])
  );

  return rows.map((row) => {
    const stats = statsByOwner.get(row.owner_user_id) || { sum: 0, count: 0 };
    const sellerRating = stats.count > 0 ? Number((stats.sum / stats.count).toFixed(2)) : 0;

    return {
      ...row,
      seller_rating: sellerRating,
      seller_total_reviews: stats.count,
      owner_verified_seller: verifiedSellerByOwnerId.get(row.owner_user_id) || false,
    };
  });
};

const getActiveMarketplaceRows = async () => {
  const { data, error } = await supabaseAdmin
    .from("listings")
    .select(baseSelect)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    const wrapped = new Error(error.message || "Failed to fetch listings");
    wrapped.statusCode = 400;
    throw wrapped;
  }

  const rowsWithSellerStats = await enrichListingsWithSellerStats(data || []);
  return await enrichRowsWithSavedStats(rowsWithSellerStats);
};

const rankMarketplaceRowsByQuery = (rows, rawQuery) => {
  const normalizedQuery = normalizeSearchText(rawQuery);
  const queryTokens = tokenizeSearchQuery(rawQuery);

  if (!normalizedQuery || queryTokens.length === 0) {
    return rows.map((row) => ({ row, relevanceScore: 0, matchedTokens: 0 }));
  }

  return rows
    .map((row) => {
      const result = computeMarketplaceSearchScore(row, normalizedQuery, queryTokens);
      return {
        row,
        relevanceScore: Number(result.score.toFixed(2)),
        matchedTokens: result.matchedTokens,
        isMatch: result.isMatch,
      };
    })
    .filter((entry) => entry.isMatch)
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }

      return new Date(b.row.created_at).getTime() - new Date(a.row.created_at).getTime();
    });
};

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const sanitizeFileName = (fileName) => fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

const buildImagePath = (userId, listingId, fileName) => {
  const extension = fileName.split(".").pop() || "jpg";
  const safeName = sanitizeFileName(fileName.replace(`.${extension}`, ""));
  const unique = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

  return `${userId}/${listingId}/${unique}-${safeName}.${extension}`;
};

const parseListingStatus = (listingType) => {
  if (listingType === "buy") {
    return "sell";
  }
  return listingType;
};

const parsePathSegments = (fullPath) =>
  String(fullPath || "")
    .split(">")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

const toNormalizedConfidence = (value) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  if (parsed > 1) {
    return Math.max(0, Math.min(1, parsed / 100));
  }
  return Math.max(0, Math.min(1, parsed));
};

const getPredictRateLimitKey = (userId) => `predict:${userId}`;

const assertPredictRateLimit = (userId) => {
  const key = getPredictRateLimitKey(userId);
  const now = Date.now();
  const current = predictRateLimitStore.get(key);

  if (!current || now > current.resetAt) {
    predictRateLimitStore.set(key, { count: 1, resetAt: now + PREDICT_RATE_LIMIT_WINDOW_MS });
    return;
  }

  if (current.count >= PREDICT_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil((current.resetAt - now) / 1000);
    const error = new Error(`Rate limit exceeded. Retry in ${retryAfterSec}s.`);
    error.statusCode = 429;
    throw error;
  }

  current.count += 1;
  predictRateLimitStore.set(key, current);
};

const getImageCheckRateLimitKey = (userId) => `image-check:${userId}`;

const assertImageCheckRateLimit = (userId, units = 1) => {
  const safeUnits = Math.max(1, units);
  const key = getImageCheckRateLimitKey(userId);
  const now = Date.now();
  const current = imageCheckRateLimitStore.get(key);

  if (!current || now > current.resetAt) {
    imageCheckRateLimitStore.set(key, {
      count: safeUnits,
      resetAt: now + IMAGE_CHECK_RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  if (current.count + safeUnits > IMAGE_CHECK_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil((current.resetAt - now) / 1000);
    const error = new Error(`Image check rate limit exceeded. Retry in ${retryAfterSec}s.`);
    error.statusCode = 429;
    throw error;
  }

  current.count += safeUnits;
  imageCheckRateLimitStore.set(key, current);
};

const getLeafNodeByKey = async (nodeKey) => {
  const trimmed = String(nodeKey || "").trim();
  if (!trimmed) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("taxonomy_nodes")
    .select("node_key,full_path,is_leaf,is_active")
    .eq("node_key", trimmed)
    .single();

  if (error || !data) {
    return null;
  }

  if (!data.is_active || !data.is_leaf) {
    return null;
  }

  return data;
};

const resolveCategoryWriteData = async (payload) => {
  const leafNodeKey = String(payload.categoryNodeKey || "").trim();
  if (!leafNodeKey) {
    const error = new Error("categoryNodeKey is required.");
    error.statusCode = 400;
    throw error;
  }

  const leafNode = await getLeafNodeByKey(leafNodeKey);
  if (!leafNode) {
    const error = new Error("Invalid categoryNodeKey. Must be an active leaf taxonomy node.");
    error.statusCode = 400;
    throw error;
  }

  const pathSegments = parsePathSegments(leafNode.full_path);
  const legacyCategory = pathSegments[0] || "other";
  const legacySubCategory = pathSegments[1] || null;

  return {
    categoryNodeKey: leafNode.node_key,
    categoryPathSnapshot: leafNode.full_path,
    legacyCategory,
    legacySubCategory,
    categorySource: payload.categorySource === "manual" ? "manual" : "ai",
    categoryConfidence: toNormalizedConfidence(payload.categoryConfidence),
  };
};

const callPredictionService = async ({ title, description, maxSuggestions }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_SERVICE_URL}/predict-category`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, description, maxSuggestions }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const message = await response.text();
      const error = new Error(message || "Prediction service failed");
      error.statusCode = 503;
      throw error;
    }

    const payload = await response.json();
    if (!Array.isArray(payload?.suggestions)) {
      const error = new Error("Invalid prediction payload from AI service.");
      error.statusCode = 503;
      throw error;
    }

    return payload.suggestions;
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("Prediction service timed out.");
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const callImageQualityService = async ({ contentBase64 }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_SERVICE_URL}/check-image-quality`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contentBase64 }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const message = await response.text();
      const error = new Error(message || "Image quality service failed");
      error.statusCode = 503;
      throw error;
    }

    const payload = await response.json();
    if (!["accept", "warn", "reject"].includes(String(payload?.verdict || ""))) {
      const error = new Error("Invalid image quality payload from AI service.");
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
      const timeoutError = new Error("Image quality service timed out.");
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const validateListingImagesQuality = async ({ images }) => {
  const checks = [];

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const contentBase64 = String(image?.contentBase64 || "").trim();

    if (!contentBase64) {
      const error = new Error(`Invalid image payload for image ${index + 1}.`);
      error.statusCode = 400;
      throw error;
    }

    const result = await callImageQualityService({ contentBase64 });
    checks.push({
      index,
      name: image?.name || `image-${index + 1}`,
      ...result,
    });
  }

  const warnings = checks.filter((item) => item.verdict === "warn");

  return { warnings, checks };
};

const baseSelect =
  "id,title,description,category,sub_category,category_node_key,category_path_snapshot,category_source,category_confidence,condition,listing_type,buy_price,rent_daily_price,rent_weekly_price,rent_monthly_price,security_deposit,location_address,location_city,location_state,location_lat,location_lng,instant_booking,features,specifications,owner_user_id,owner_name,total_for_rent,available_for_rent,total_for_sale,available_for_sale,created_at,updated_at,status,listing_images(public_url,is_primary,display_order)";

listingsRouter.get("/taxonomy/roots", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("taxonomy_nodes")
    .select("node_key,name,full_path,depth,is_leaf,child_count")
    .eq("depth", 1)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to fetch taxonomy roots" });
  }

  return res.json(data || []);
});

listingsRouter.get("/taxonomy/children/:nodeKey", async (req, res) => {
  const { nodeKey } = req.params;

  const { data, error } = await supabaseAdmin
    .from("taxonomy_nodes")
    .select("node_key,parent_key,name,full_path,depth,is_leaf,child_count")
    .eq("parent_key", nodeKey)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to fetch taxonomy children" });
  }

  return res.json(data || []);
});

listingsRouter.get("/taxonomy/search", async (req, res) => {
  const query = String(req.query.q || "").trim();
  const limit = Math.min(25, Math.max(1, Number.parseInt(String(req.query.limit || "15"), 10) || 15));

  if (!query) {
    return res.json([]);
  }

  const { data, error } = await supabaseAdmin
    .from("taxonomy_nodes")
    .select("node_key,name,full_path,depth,is_leaf,child_count")
    .eq("is_active", true)
    .ilike("full_path", `%${query}%`)
    .order("depth", { ascending: false })
    .limit(limit);

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to search taxonomy" });
  }

  return res.json(data || []);
});

listingsRouter.post("/predict-category", requireAuth, async (req, res) => {
  const userId = req.auth.sub;
  const title = String(req.body?.title || "").trim();
  const description = String(req.body?.description || "").trim();
  const maxSuggestions = Math.min(4, Math.max(1, Number.parseInt(String(req.body?.maxSuggestions || "4"), 10) || 4));

  if (title.length < 3 || description.length < 3) {
    return res.status(400).json({ message: "title and description must be at least 3 characters." });
  }

  try {
    assertPredictRateLimit(userId);
    const rawSuggestions = await callPredictionService({ title, description, maxSuggestions });

    const requestedNodeKeys = rawSuggestions
      .map((item) => String(item.nodeKey || "").trim())
      .filter((key) => key.length > 0);

    if (!requestedNodeKeys.length) {
      return res.json({ suggestions: [] });
    }

    const { data: validLeafNodes, error } = await supabaseAdmin
      .from("taxonomy_nodes")
      .select("node_key,full_path")
      .eq("is_active", true)
      .eq("is_leaf", true)
      .in("node_key", requestedNodeKeys);

    if (error) {
      return res.status(503).json({ message: error.message || "Failed to validate predictions" });
    }

    const validByKey = new Map((validLeafNodes || []).map((node) => [node.node_key, node]));

    const suggestions = rawSuggestions
      .map((item) => {
        const nodeKey = String(item.nodeKey || "").trim();
        const valid = validByKey.get(nodeKey);
        if (!valid) {
          return null;
        }

        return {
          nodeKey,
          fullPath: valid.full_path,
          confidence: toNormalizedConfidence(item.confidence) ?? 0,
          reason: Array.isArray(item.reason) ? item.reason : [],
        };
      })
      .filter(Boolean)
      .slice(0, maxSuggestions);

    return res.json({ suggestions });
  } catch (error) {
    const statusCode = error.statusCode || 503;
    return res.status(statusCode).json({ message: error.message || "Prediction unavailable" });
  }
});

listingsRouter.post("/check-image-quality", requireAuth, async (req, res) => {
  const userId = req.auth.sub;
  const image = req.body?.image || {};
  const contentBase64 = String(image.contentBase64 || "").trim();
  const imageName = String(image.name || "image").trim() || "image";

  if (!contentBase64) {
    return res.status(400).json({ message: "image.contentBase64 is required." });
  }

  try {
    assertImageCheckRateLimit(userId, 1);
    const result = await callImageQualityService({ contentBase64 });
    return res.json({
      imageName,
      verdict: result.verdict,
      score: result.score,
      warnings: result.warnings,
      failures: result.failures,
      metrics: result.metrics,
    });
  } catch (error) {
    const statusCode = error.statusCode || 503;
    return res.status(statusCode).json({ message: error.message || "Image quality check unavailable" });
  }
});

listingsRouter.get("/marketplace", async (_req, res) => {
  try {
    const rowsWithSellerStats = await getActiveMarketplaceRows();
    return res.json(rowsWithSellerStats.map(mapRowToMarketplaceListing));
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message || "Failed to fetch listings" });
  }
});

listingsRouter.get("/marketplace/search", async (req, res) => {
  const query = String(req.query.q || "").trim();
  const pageSize = Math.min(60, Math.max(1, Number.parseInt(String(req.query.limit || "24"), 10) || 24));
  const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
  const offset = Math.max(0, Number.parseInt(String(req.query.offset || String((page - 1) * pageSize)), 10) || 0);
  const sortBy = ["relevant", "newest", "price_low", "price_high", "rating", "trust"].includes(
    String(req.query.sort || "relevant")
  )
    ? String(req.query.sort || "relevant")
    : "relevant";
  const filters = parseSearchFilters(req.query);

  if (query.length < 2) {
    return res.status(400).json({ message: "Search query must be at least 2 characters." });
  }

  try {
    const rowsWithSellerStats = await getActiveMarketplaceRows();
    const filtered = rowsWithSellerStats.filter((row) => matchesSearchFilters(row, filters));
    const ranked = rankMarketplaceRowsByQuery(filtered, query);
    const sorted = [...ranked].sort((left, right) => compareSearchRowsBySort(left, right, sortBy));
    const total = sorted.length;
    const sliced = sorted.slice(offset, offset + pageSize);
    const searchSessionId = randomUUID();

    void recordMarketplaceSearchEvent({
      eventType: "search",
      searchSessionId,
      query,
      resultCount: total,
      page,
      pageSize,
      sortBy,
      filters: {
        categories: [...filters.categories],
        conditions: [...filters.conditions],
        listingTypes: [...filters.listingTypes],
        sellerVerified: filters.sellerVerified,
        ratingMin: filters.ratingMin,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
      },
    }).catch(() => {});

    return res.json({
      query,
      searchSessionId,
      total,
      page,
      pageSize,
      offset,
      hasMore: offset + pageSize < total,
      sortBy,
      results: sliced.map((entry, index) => ({
        ...mapRowToMarketplaceListing(entry.row),
        relevanceScore: entry.relevanceScore,
        rankPosition: offset + index + 1,
      })),
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message || "Failed to search listings" });
  }
});

listingsRouter.post("/marketplace/search-events", async (req, res) => {
  const eventType = String(req.body?.eventType || "").trim();
  const searchSessionId = String(req.body?.searchSessionId || "").trim();
  const query = String(req.body?.query || "").trim();
  const listingId = String(req.body?.listingId || "").trim();
  const rankPosition = Math.max(0, Number.parseInt(String(req.body?.rankPosition || "0"), 10) || 0);
  const resultCount = Math.max(0, Number.parseInt(String(req.body?.resultCount || "0"), 10) || 0);
  const page = Math.max(1, Number.parseInt(String(req.body?.page || "1"), 10) || 1);
  const pageSize = Math.max(1, Number.parseInt(String(req.body?.pageSize || "24"), 10) || 24);
  const sortBy = ["relevant", "newest", "price_low", "price_high", "rating", "trust"].includes(
    String(req.body?.sortBy || "relevant")
  )
    ? String(req.body?.sortBy || "relevant")
    : "relevant";

  if (!["search", "click"].includes(eventType)) {
    return res.status(400).json({ message: "eventType must be search or click." });
  }

  if (!searchSessionId || !query) {
    return res.status(400).json({ message: "searchSessionId and query are required." });
  }

  try {
    await recordMarketplaceSearchEvent({
      eventType,
      searchSessionId,
      query,
      listingId: listingId || null,
      rankPosition: rankPosition || null,
      resultCount,
      page,
      pageSize,
      sortBy,
      filters: req.body?.filters || {},
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message || "Failed to record search event" });
  }
});

listingsRouter.get("/marketplace/search/analytics", async (_req, res) => {
  try {
    const summary = await buildSearchAnalyticsSummary();
    return res.json(summary);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message || "Failed to load search analytics" });
  }
});

listingsRouter.get("/marketplace/suggestions", async (req, res) => {
  const query = String(req.query.q || "").trim();
  const limit = Math.min(10, Math.max(1, Number.parseInt(String(req.query.limit || "6"), 10) || 6));

  if (query.length < 2) {
    return res.json({ query, keywords: [], listings: [] });
  }

  try {
    const rowsWithSellerStats = await getActiveMarketplaceRows();
    const ranked = rankMarketplaceRowsByQuery(rowsWithSellerStats, query);

    const listings = ranked.slice(0, limit).map((entry) => {
      const mapped = mapRowToMarketplaceListing(entry.row);
      return {
        id: mapped.id,
        title: mapped.title,
        category: mapped.category,
        subCategory: mapped.subCategory,
        image: mapped.images[0] || "",
        price: mapped.price,
        location: mapped.location.city || "",
      };
    });

    const normalizedQuery = normalizeSearchText(query);
    const keywords = [];
    const seen = new Set();

    for (const entry of ranked) {
      const title = String(entry.row.title || "").trim();
      const category = String(entry.row.category || "").trim();
      const subCategory = String(entry.row.sub_category || "").trim();

      const candidates = [title, category, subCategory].filter(Boolean);
      for (const candidate of candidates) {
        const normalizedCandidate = normalizeSearchText(candidate);
        if (!normalizedCandidate.includes(normalizedQuery)) {
          continue;
        }
        if (seen.has(normalizedCandidate)) {
          continue;
        }

        seen.add(normalizedCandidate);
        keywords.push(candidate);

        if (keywords.length >= limit) {
          break;
        }
      }

      if (keywords.length >= limit) {
        break;
      }
    }

    return res.json({ query, keywords, listings });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message || "Failed to fetch suggestions" });
  }
});

listingsRouter.get("/saved/ids", requireAuth, async (req, res) => {
  const userId = req.auth.sub;

  const { data, error } = await supabaseAdmin
    .from("saved_listings")
    .select("listing_id")
    .eq("saved_by_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to fetch saved listing ids" });
  }

  const listingIds = [...new Set((data || []).map((row) => row.listing_id).filter(Boolean))];
  return res.json({ listingIds });
});

listingsRouter.get("/saved", requireAuth, async (req, res) => {
  const userId = req.auth.sub;
  const pageSize = Math.min(60, Math.max(1, Number.parseInt(String(req.query.limit || "24"), 10) || 24));
  const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
  const offset = (page - 1) * pageSize;

  const { count: totalCount, error: countError } = await supabaseAdmin
    .from("saved_listings")
    .select("listing_id", { count: "exact", head: true })
    .eq("saved_by_user_id", userId);

  if (countError) {
    return res.status(400).json({ message: countError.message || "Failed to count saved listings" });
  }

  const { data: savedRows, error: savedError } = await supabaseAdmin
    .from("saved_listings")
    .select("listing_id,created_at")
    .eq("saved_by_user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (savedError) {
    return res.status(400).json({ message: savedError.message || "Failed to fetch saved listings" });
  }

  const listingIds = [...new Set((savedRows || []).map((row) => row.listing_id).filter(Boolean))];
  if (!listingIds.length) {
    return res.json({
      total: totalCount || 0,
      page,
      pageSize,
      hasMore: false,
      results: [],
    });
  }

  const { data: listingRows, error: listingError } = await supabaseAdmin
    .from("listings")
    .select(baseSelect)
    .in("id", listingIds)
    .eq("status", "active");

  if (listingError) {
    return res.status(400).json({ message: listingError.message || "Failed to fetch saved listing details" });
  }

  const rowsWithSellerStats = await enrichListingsWithSellerStats(listingRows || []);
  const rowsWithSavedStats = await enrichRowsWithSavedStats(rowsWithSellerStats);

  const mappedById = new Map(rowsWithSavedStats.map((row) => [row.id, mapRowToMarketplaceListing(row)]));
  const ordered = listingIds.map((listingId) => mappedById.get(listingId)).filter(Boolean);

  return res.json({
    total: totalCount || 0,
    page,
    pageSize,
    hasMore: offset + pageSize < (totalCount || 0),
    results: ordered,
  });
});

listingsRouter.get("/:listingId/saved-status", requireAuth, async (req, res) => {
  const { listingId } = req.params;
  const userId = req.auth.sub;

  const { data: existingSaveRow, error: existingSaveError } = await supabaseAdmin
    .from("saved_listings")
    .select("id")
    .eq("listing_id", listingId)
    .eq("saved_by_user_id", userId)
    .maybeSingle();

  if (existingSaveError) {
    return res.status(400).json({ message: existingSaveError.message || "Failed to fetch saved status" });
  }

  const { count: savesCount, error: countError } = await supabaseAdmin
    .from("saved_listings")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);

  if (countError) {
    return res.status(400).json({ message: countError.message || "Failed to fetch saves count" });
  }

  return res.json({
    listingId,
    isSaved: Boolean(existingSaveRow?.id),
    saves: savesCount || 0,
  });
});

listingsRouter.post("/:listingId/save", requireAuth, async (req, res) => {
  const { listingId } = req.params;
  const userId = req.auth.sub;

  const { data: listingRow, error: listingError } = await supabaseAdmin
    .from("listings")
    .select("id,status,owner_user_id")
    .eq("id", listingId)
    .single();

  if (listingError || !listingRow) {
    return res.status(404).json({ message: listingError?.message || "Listing not found" });
  }

  if (listingRow.status !== "active") {
    return res.status(400).json({ message: "Only active listings can be saved" });
  }

  if (listingRow.owner_user_id === userId) {
    return res.status(400).json({ message: "You cannot save your own listing" });
  }

  const { error: saveError } = await supabaseAdmin.from("saved_listings").upsert(
    {
      saved_by_user_id: userId,
      listing_id: listingId,
    },
    {
      onConflict: "saved_by_user_id,listing_id",
      ignoreDuplicates: true,
    }
  );

  if (saveError) {
    return res.status(400).json({ message: saveError.message || "Failed to save listing" });
  }

  const { count: savesCount, error: countError } = await supabaseAdmin
    .from("saved_listings")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);

  if (countError) {
    return res.status(400).json({ message: countError.message || "Saved listing updated but count failed" });
  }

  return res.json({ ok: true, listingId, isSaved: true, saves: savesCount || 0 });
});

listingsRouter.delete("/:listingId/save", requireAuth, async (req, res) => {
  const { listingId } = req.params;
  const userId = req.auth.sub;

  const { error: deleteError } = await supabaseAdmin
    .from("saved_listings")
    .delete()
    .eq("saved_by_user_id", userId)
    .eq("listing_id", listingId);

  if (deleteError) {
    return res.status(400).json({ message: deleteError.message || "Failed to unsave listing" });
  }

  const { count: savesCount, error: countError } = await supabaseAdmin
    .from("saved_listings")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);

  if (countError) {
    return res.status(400).json({ message: countError.message || "Saved listing removed but count failed" });
  }

  return res.json({ ok: true, listingId, isSaved: false, saves: savesCount || 0 });
});

listingsRouter.get("/me/listings", requireAuth, async (req, res) => {
  const userId = req.auth.sub;

  const { data, error } = await supabaseAdmin
    .from("listings")
    .select(baseSelect)
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to fetch your listings" });
  }

  const rowsWithSellerStats = await enrichListingsWithSellerStats(data || []);
  const rowsWithSavedStats = await enrichRowsWithSavedStats(rowsWithSellerStats);
  return res.json(rowsWithSavedStats.map(mapRowToMarketplaceListing));
});

listingsRouter.get("/me/editable/:listingId", requireAuth, async (req, res) => {
  const { listingId } = req.params;
  const ownerUserId = req.auth.sub;

  const { data, error } = await supabaseAdmin
    .from("listings")
    .select(
      "id,owner_user_id,title,description,category,sub_category,category_node_key,category_path_snapshot,category_source,category_confidence,condition,listing_type,buy_price,rent_daily_price,rent_weekly_price,rent_monthly_price,security_deposit,location_address,location_city,location_state,location_country,location_lat,location_lng,service_radius_km,min_rental_days,max_rental_days,instant_booking,max_renters,total_for_rent,available_for_rent,total_for_sale,available_for_sale,features,specifications,listing_images(public_url,is_primary,display_order)"
    )
    .eq("id", listingId)
    .eq("owner_user_id", ownerUserId)
    .single();

  if (error || !data) {
    return res.status(404).json({ message: error?.message || "Listing not found for editing." });
  }

  const row = data;
  const listingType = mapListingTypeForClient(row.listing_type);
  const rawSpecifications = row.specifications || {};
  const sellerTerms = (rawSpecifications.__seller_terms || "")
    .split("\n")
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
  const specifications = { ...rawSpecifications };
  delete specifications.__seller_terms;

  const sortedImages = [...(row.listing_images || [])].sort((a, b) => {
    if (a.is_primary === b.is_primary) {
      return a.display_order - b.display_order;
    }
    return a.is_primary ? -1 : 1;
  });

  return res.json({
    id: row.id,
    ownerUserId: row.owner_user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    subCategory: row.sub_category || "",
    categoryNodeKey: row.category_node_key || "",
    categoryPath: row.category_path_snapshot || "",
    categorySource: row.category_source || "",
    categoryConfidence: row.category_confidence || null,
    condition: row.condition,
    listingType,
    location: {
      address: row.location_address || "",
      city: row.location_city || "",
      state: row.location_state || "",
      country: row.location_country || "",
      lat: row.location_lat || 0,
      lng: row.location_lng || 0,
      radius: row.service_radius_km || 5,
    },
    price: {
      buy: String(row.buy_price || ""),
      rent: {
        daily: String(row.rent_daily_price || ""),
        weekly: String(row.rent_weekly_price || ""),
        monthly: String(row.rent_monthly_price || ""),
      },
      securityDeposit: String(row.security_deposit || ""),
    },
    availability: {
      minRentalDays: row.min_rental_days,
      maxRentalDays: row.max_rental_days,
      totalForRent: row.total_for_rent,
      availableForRent: row.available_for_rent,
      totalForSale: row.total_for_sale,
      availableForSale: row.available_for_sale,
    },
    specifications,
    sellerTerms,
    features: row.features || [],
    images: sortedImages.map((image) => image.public_url),
  });
});

const decodeImage = (image) => {
  const content = image?.contentBase64 || "";
  if (!content) {
    throw new Error("Invalid image payload.");
  }

  return Buffer.from(content, "base64");
};

listingsRouter.post("/me", requireAuth, async (req, res) => {
  const owner = {
    userId: req.auth.sub,
    email: req.auth.email,
    name: req.auth.user_metadata?.full_name || "",
  };

  const payload = req.body || {};
  const images = Array.isArray(payload.images) ? payload.images : [];
  let categoryWriteData;

  try {
    categoryWriteData = await resolveCategoryWriteData(payload);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message || "Invalid category payload" });
  }

  let imageQualityWarnings = [];
  if (images.length > 0) {
    try {
      assertImageCheckRateLimit(owner.userId, images.length);
      const quality = await validateListingImagesQuality({ images });
      imageQualityWarnings = quality.warnings;
    } catch (error) {
      return res.status(error.statusCode || 400).json({ message: error.message || "Image quality validation failed" });
    }
  }

  const { data: listingRow, error: listingError } = await supabaseAdmin
    .from("listings")
    .insert({
      owner_user_id: owner.userId,
      owner_email: owner.email,
      owner_name: owner.name,
      title: payload.title,
      description: payload.description,
      category: categoryWriteData.legacyCategory,
      sub_category: categoryWriteData.legacySubCategory,
      category_node_key: categoryWriteData.categoryNodeKey,
      category_path_snapshot: categoryWriteData.categoryPathSnapshot,
      category_source: categoryWriteData.categorySource,
      ai_suggested_category_node_key:
        categoryWriteData.categorySource === "ai" ? categoryWriteData.categoryNodeKey : null,
      category_confidence: categoryWriteData.categoryConfidence,
      category_predicted_at: categoryWriteData.categorySource === "ai" ? new Date().toISOString() : null,
      condition: payload.condition,
      listing_type: parseListingStatus(payload.listingType),
      buy_price: toNumber(payload.price.buy),
      rent_daily_price: toNumber(payload.price.rent.daily),
      rent_weekly_price: toNumber(payload.price.rent.weekly),
      rent_monthly_price: toNumber(payload.price.rent.monthly),
      security_deposit: toNumber(payload.price.securityDeposit) ?? payload.availability.securityDeposit,
      location_address: payload.location.address,
      location_city: payload.location.city,
      location_state: payload.location.state,
      location_country: payload.location.country,
      location_lat: payload.location.lat,
      location_lng: payload.location.lng,
      service_radius_km: payload.location.radius,
      min_rental_days: payload.availability.minRentalDays,
      max_rental_days: payload.availability.maxRentalDays,
      total_for_rent: payload.availability.totalForRent,
      available_for_rent: payload.availability.availableForRent,
      total_for_sale: payload.availability.totalForSale,
      available_for_sale: payload.availability.availableForSale,
      specifications: payload.specifications,
      features: (payload.features || []).filter((feature) => feature.trim().length > 0),
      status: "active",
    })
    .select("id")
    .single();

  if (listingError || !listingRow) {
    return res.status(400).json({ message: listingError?.message || "Failed to create listing" });
  }

  const listingId = listingRow.id;

  if (!images.length) {
    return res.json({ listingId, imageCount: 0, imageQualityWarnings });
  }

  const uploadedImages = [];

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const path = buildImagePath(owner.userId, listingId, image.name || `image-${index}.jpg`);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(path, decodeImage(image), {
        cacheControl: "3600",
        upsert: false,
        contentType: image.type || "image/jpeg",
      });

    if (uploadError) {
      return res.status(400).json({ message: `Image upload failed for ${image.name}: ${uploadError.message}` });
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(path);

    uploadedImages.push({
      path,
      publicUrl: publicUrlData.publicUrl,
      displayOrder: index,
    });
  }

  const { error: imageInsertError } = await supabaseAdmin.from("listing_images").insert(
    uploadedImages.map((uploadedImage, index) => ({
      listing_id: listingId,
      storage_path: uploadedImage.path,
      public_url: uploadedImage.publicUrl,
      is_primary: index === 0,
      display_order: uploadedImage.displayOrder,
    }))
  );

  if (imageInsertError) {
    return res.status(400).json({ message: imageInsertError.message || "Failed to save listing images" });
  }

  return res.json({ listingId, imageCount: uploadedImages.length, imageQualityWarnings });
});

listingsRouter.patch("/me/:listingId", requireAuth, async (req, res) => {
  const ownerUserId = req.auth.sub;
  const payload = { ...(req.body || {}), listingId: req.params.listingId };
  let categoryWriteData;

  try {
    categoryWriteData = await resolveCategoryWriteData(payload);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message || "Invalid category payload" });
  }

  const { data: inventoryRow, error: inventoryError } = await withTransientRetry(() =>
    supabaseAdmin
      .from("listings")
      .select("owner_user_id,total_for_rent,available_for_rent,total_for_sale,available_for_sale")
      .eq("id", payload.listingId)
      .single()
  );

  if (inventoryError || !inventoryRow) {
    return res.status(404).json({ message: inventoryError?.message || "Listing not found." });
  }

  if (inventoryRow.owner_user_id !== ownerUserId) {
    return res.status(403).json({ message: "You are not allowed to update this listing." });
  }

  const reservedForRent = Math.max(0, inventoryRow.total_for_rent - inventoryRow.available_for_rent);
  const reservedForSale = Math.max(0, inventoryRow.total_for_sale - inventoryRow.available_for_sale);

  const nextAvailableForRent = Math.max(0, payload.availability.totalForRent - reservedForRent);
  const nextAvailableForSale = Math.max(0, payload.availability.totalForSale - reservedForSale);

  const { error: updateError } = await withTransientRetry(() =>
    supabaseAdmin
      .from("listings")
      .update({
        title: payload.title,
        description: payload.description,
        category: categoryWriteData.legacyCategory,
        sub_category: categoryWriteData.legacySubCategory,
        category_node_key: categoryWriteData.categoryNodeKey,
        category_path_snapshot: categoryWriteData.categoryPathSnapshot,
        category_source: categoryWriteData.categorySource,
        ai_suggested_category_node_key:
          categoryWriteData.categorySource === "ai" ? categoryWriteData.categoryNodeKey : null,
        category_confidence: categoryWriteData.categoryConfidence,
        category_predicted_at: categoryWriteData.categorySource === "ai" ? new Date().toISOString() : null,
        condition: payload.condition,
        listing_type: parseListingStatus(payload.listingType),
        buy_price: toNumber(payload.price.buy),
        rent_daily_price: toNumber(payload.price.rent.daily),
        rent_weekly_price: toNumber(payload.price.rent.weekly),
        rent_monthly_price: toNumber(payload.price.rent.monthly),
        security_deposit: toNumber(payload.price.securityDeposit) ?? payload.availability.securityDeposit,
        location_address: payload.location.address,
        location_city: payload.location.city,
        location_state: payload.location.state,
        location_country: payload.location.country,
        location_lat: payload.location.lat,
        location_lng: payload.location.lng,
        service_radius_km: payload.location.radius,
        min_rental_days: payload.availability.minRentalDays,
        max_rental_days: payload.availability.maxRentalDays,
        total_for_rent: payload.availability.totalForRent,
        available_for_rent: nextAvailableForRent,
        total_for_sale: payload.availability.totalForSale,
        available_for_sale: nextAvailableForSale,
        specifications: payload.specifications,
        features: (payload.features || []).filter((feature) => feature.trim().length > 0),
      })
      .eq("id", payload.listingId)
      .eq("owner_user_id", ownerUserId)
  );

  if (updateError) {
    return res.status(400).json({ message: updateError.message || "Failed to update listing." });
  }

  const images = Array.isArray(payload.images) ? payload.images : [];
  let imageQualityWarnings = [];

  if (images.length > 0) {
    try {
      assertImageCheckRateLimit(ownerUserId, images.length);
      const quality = await validateListingImagesQuality({ images });
      imageQualityWarnings = quality.warnings;
    } catch (error) {
      return res.status(error.statusCode || 400).json({ message: error.message || "Image quality validation failed" });
    }
  }

  if (!images.length) {
    return res.json({ ok: true, imageQualityWarnings });
  }

  const { data: oldImageRows, error: oldImagesError } = await withTransientRetry(() =>
    supabaseAdmin.from("listing_images").select("id,storage_path").eq("listing_id", payload.listingId)
  );

  if (oldImagesError) {
    return res.status(400).json({ message: oldImagesError.message || "Failed to load existing listing images." });
  }

  const oldStoragePaths = (oldImageRows || []).map((row) => row.storage_path).filter((path) => path.length > 0);

  if (oldStoragePaths.length > 0) {
    const { error: removeStorageError } = await withTransientRetry(() =>
      supabaseAdmin.storage.from(LISTING_IMAGES_BUCKET).remove(oldStoragePaths)
    );

    if (removeStorageError) {
      return res.status(400).json({ message: removeStorageError.message || "Failed to replace listing images." });
    }

    const { error: deleteOldImagesError } = await withTransientRetry(() =>
      supabaseAdmin.from("listing_images").delete().eq("listing_id", payload.listingId)
    );

    if (deleteOldImagesError) {
      return res.status(400).json({ message: deleteOldImagesError.message || "Failed to clear old listing images." });
    }
  }

  const uploadedImages = [];

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const path = buildImagePath(ownerUserId, payload.listingId, image.name || `image-${index}.jpg`);

    const { error: uploadError } = await withTransientRetry(() =>
      supabaseAdmin.storage.from(LISTING_IMAGES_BUCKET).upload(path, decodeImage(image), {
        cacheControl: "3600",
        upsert: false,
        contentType: image.type || "image/jpeg",
      })
    );

    if (uploadError) {
      return res.status(400).json({ message: `Image upload failed for ${image.name}: ${uploadError.message}` });
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(path);

    uploadedImages.push({ path, publicUrl: publicUrlData.publicUrl, displayOrder: index });
  }

  const { error: imageInsertError } = await withTransientRetry(() =>
    supabaseAdmin.from("listing_images").insert(
      uploadedImages.map((uploadedImage, index) => ({
        listing_id: payload.listingId,
        storage_path: uploadedImage.path,
        public_url: uploadedImage.publicUrl,
        is_primary: index === 0,
        display_order: uploadedImage.displayOrder,
      }))
    )
  );

  if (imageInsertError) {
    return res.status(400).json({ message: imageInsertError.message || "Failed to save listing images." });
  }

  return res.json({ ok: true, imageQualityWarnings });
});

listingsRouter.delete("/me/:listingId", requireAuth, async (req, res) => {
  const { listingId } = req.params;
  const ownerUserId = req.auth.sub;

  const { data: listingRow, error: listingError } = await withTransientRetry(() =>
    supabaseAdmin.from("listings").select("id,owner_user_id").eq("id", listingId).single()
  );

  if (listingError || !listingRow) {
    return res.status(404).json({ message: listingError?.message || "Listing not found." });
  }

  if (listingRow.owner_user_id !== ownerUserId) {
    return res.status(403).json({ message: "You are not allowed to delete this listing." });
  }

  const { data: imageRows, error: imageRowsError } = await withTransientRetry(() =>
    supabaseAdmin.from("listing_images").select("storage_path").eq("listing_id", listingId)
  );

  if (imageRowsError) {
    return res.status(400).json({ message: imageRowsError.message || "Failed to prepare listing deletion." });
  }

  const storagePaths = (imageRows || []).map((row) => row.storage_path).filter((path) => path.length > 0);

  if (storagePaths.length > 0) {
    const { error: removeStorageError } = await withTransientRetry(() =>
      supabaseAdmin.storage.from(LISTING_IMAGES_BUCKET).remove(storagePaths)
    );

    if (removeStorageError) {
      return res.status(400).json({ message: removeStorageError.message || "Failed to remove listing images from storage." });
    }
  }

  const { error: deleteError } = await withTransientRetry(() =>
    supabaseAdmin.from("listings").delete().eq("id", listingId).eq("owner_user_id", ownerUserId)
  );

  if (deleteError) {
    return res.status(400).json({ message: deleteError.message || "Failed to delete listing." });
  }

  return res.json({ ok: true });
});

listingsRouter.get("/seller/:ownerUserId/stats", async (req, res) => {
  const { ownerUserId } = req.params;
  const { data, error } = await supabaseAdmin.from("listings").select("status,created_at").eq("owner_user_id", ownerUserId);

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to fetch seller stats" });
  }

  const rows = data || [];
  const activeListings = rows.filter((row) => row.status === "active").length;

  let earliestTime = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    const time = new Date(row.created_at).getTime();
    if (Number.isFinite(time) && time < earliestTime) {
      earliestTime = time;
    }
  }

  const memberSince = Number.isFinite(earliestTime) ? String(new Date(earliestTime).getFullYear()) : "0";
  return res.json({ activeListings, memberSince });
});

listingsRouter.get("/meta/category-counts", async (_req, res) => {
  const { data, error } = await supabaseAdmin.from("listings").select("category").eq("status", "active");

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to fetch category counts" });
  }

  const counts = {};
  for (const row of data || []) {
    const key = (row.category || "").trim().toLowerCase();
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }

  return res.json(counts);
});

listingsRouter.get("/:listingId", async (req, res) => {
  const { listingId } = req.params;

  const { data, error } = await supabaseAdmin
    .from("listings")
    .select(baseSelect)
    .eq("id", listingId)
    .single();

  if (error || !data) {
    return res.status(404).json({ message: error?.message || "Listing not found" });
  }

  const [rowWithSellerStats] = await enrichListingsWithSellerStats([data]);
  const [rowWithSavedStats] = await enrichRowsWithSavedStats([rowWithSellerStats]);
  return res.json(mapRowToMarketplaceListing(rowWithSavedStats));
});

export const reserveListingInventoryInternal = async (listingId, mode, quantity) => {
  const safeQuantity = Math.max(1, Math.floor(quantity));
  const modeForDb = mode === "buy" ? "sell" : "rent";

  const reserveWithDirectUpdateFallback = async () => {
    const { data: listing, error: listingError } = await supabaseAdmin
      .from("listings")
      .select("id,status,listing_type,available_for_sale,available_for_rent")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      throw new Error(listingError?.message || "Listing not found");
    }

    if (listing.status !== "active") {
      throw new Error("This listing is not active");
    }

    if (modeForDb === "sell" && !["sell", "both"].includes(listing.listing_type)) {
      throw new Error("This listing cannot be purchased");
    }

    if (modeForDb === "rent" && !["rent", "both"].includes(listing.listing_type)) {
      throw new Error("This listing cannot be rented");
    }

    if (modeForDb === "sell") {
      const availableForSale = Number(listing.available_for_sale || 0);
      if (availableForSale < safeQuantity) {
        throw new Error(`Only ${availableForSale} items available for sale`);
      }

      const remaining = availableForSale - safeQuantity;
      let nextStatus = listing.status;

      if (listing.listing_type === "sell" && remaining === 0) {
        nextStatus = "sold";
      } else if (
        listing.listing_type === "both" &&
        remaining === 0 &&
        Number(listing.available_for_rent || 0) === 0
      ) {
        nextStatus = "sold";
      }

      const { error: updateError } = await supabaseAdmin
        .from("listings")
        .update({
          available_for_sale: remaining,
          status: nextStatus,
        })
        .eq("id", listingId)
        .eq("status", "active");

      if (updateError) {
        throw new Error(updateError.message || "Failed to reserve listing inventory");
      }

      return {
        remainingQuantity: remaining,
        updatedStatus: nextStatus,
      };
    }

    const availableForRent = Number(listing.available_for_rent || 0);
    if (availableForRent < safeQuantity) {
      throw new Error(`Only ${availableForRent} items available for rent`);
    }

    const remaining = availableForRent - safeQuantity;
    let nextStatus = listing.status;

    if (listing.listing_type === "rent" && remaining === 0) {
      nextStatus = "rented";
    } else if (
      listing.listing_type === "both" &&
      remaining === 0 &&
      Number(listing.available_for_sale || 0) === 0
    ) {
      nextStatus = "rented";
    }

    const { error: updateError } = await supabaseAdmin
      .from("listings")
      .update({
        available_for_rent: remaining,
        status: nextStatus,
      })
      .eq("id", listingId)
      .eq("status", "active");

    if (updateError) {
      throw new Error(updateError.message || "Failed to reserve listing inventory");
    }

    return {
      remainingQuantity: remaining,
      updatedStatus: nextStatus,
    };
  };

  const { data, error } = await supabaseAdmin.rpc("reserve_listing_inventory", {
    p_listing_id: listingId,
    p_mode: modeForDb,
    p_quantity: safeQuantity,
  });

  if (error) {
    if (/authentication required/i.test(String(error.message || ""))) {
      return reserveWithDirectUpdateFallback();
    }
    throw new Error(error.message || "Failed to reserve listing inventory");
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) {
    throw new Error("Inventory reservation failed. Please try again.");
  }

  return {
    remainingQuantity: result.remaining_quantity ?? 0,
    updatedStatus: result.updated_status || "active",
  };
};

listingsRouter.post("/reserve", requireAuth, async (req, res) => {
  const { listingId, mode, quantity } = req.body || {};

  try {
    const result = await reserveListingInventoryInternal(listingId, mode, quantity);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to reserve listing inventory" });
  }
});

/**
 * POST /api/listings/chat-query
 * Forward a user message to the AI chatbot service for sentiment analysis and response generation.
 * No auth required so guests can use the chatbot.
 */
listingsRouter.post("/chat-query", async (req, res) => {
  const { message } = req.body || {};

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ message: "Message is required and must be a non-empty string" });
  }

  try {
    const response = await fetch(`${AI_SERVICE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() }),
      signal: AbortSignal.timeout(AI_SERVICE_TIMEOUT_MS),
    });

    if (!response.ok) {
      if (response.status === 503) {
        return res.status(503).json({
          message: "AI service temporarily unavailable. Please try again in a moment.",
          sentiment: "unknown",
          sentiment_score: 0,
          requires_escalation: false,
          suggested_actions: ["Try again", "Contact support"],
        });
      }

      return res.status(400).json({
        message: "Failed to generate response from AI service.",
        sentiment: "unknown",
        sentiment_score: 0,
        requires_escalation: false,
        suggested_actions: ["Try again"],
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error("Chat query error:", error);

    return res.status(503).json({
      message: "I'm temporarily unavailable. Please try again or contact support@rentverse.pk",
      sentiment: "unknown",
      sentiment_score: 0,
      requires_escalation: false,
      suggested_actions: ["Contact support"],
    });
  }
});
