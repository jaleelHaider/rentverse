import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";

export const listingsRouter = Router();

const LISTING_IMAGES_BUCKET = "listing-images";

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
    return "Excellent";
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
      rating: 0,
      verified: true,
      trustScore: 0,
      responseRate: 0,
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
      categoryConfidence: 0,
    },
    views: 0,
    saves: 0,
    createdAt: formatRelativeCreatedAt(row.created_at),
    updatedAt: row.updated_at,
    status: normalizedStatus,
  };
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

const baseSelect =
  "id,title,description,category,sub_category,condition,listing_type,buy_price,rent_daily_price,rent_weekly_price,rent_monthly_price,security_deposit,location_address,location_city,location_state,location_lat,location_lng,features,specifications,owner_user_id,owner_name,total_for_rent,available_for_rent,total_for_sale,available_for_sale,created_at,updated_at,status,listing_images(public_url,is_primary,display_order)";

listingsRouter.get("/marketplace", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("listings")
    .select(baseSelect)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(400).json({ message: error.message || "Failed to fetch listings" });
  }

  return res.json((data || []).map(mapRowToMarketplaceListing));
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

  return res.json((data || []).map(mapRowToMarketplaceListing));
});

listingsRouter.get("/me/editable/:listingId", requireAuth, async (req, res) => {
  const { listingId } = req.params;
  const ownerUserId = req.auth.sub;

  const { data, error } = await supabaseAdmin
    .from("listings")
    .select(
      "id,owner_user_id,title,description,category,sub_category,condition,listing_type,buy_price,rent_daily_price,rent_weekly_price,rent_monthly_price,security_deposit,location_address,location_city,location_state,location_country,location_lat,location_lng,service_radius_km,min_rental_days,max_rental_days,instant_booking,max_renters,total_for_rent,available_for_rent,total_for_sale,available_for_sale,features,specifications,listing_images(public_url,is_primary,display_order)"
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
      instantBooking: row.instant_booking,
      maxRenters: row.max_renters,
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

  const { data: listingRow, error: listingError } = await supabaseAdmin
    .from("listings")
    .insert({
      owner_user_id: owner.userId,
      owner_email: owner.email,
      owner_name: owner.name,
      title: payload.title,
      description: payload.description,
      category: payload.category,
      sub_category: payload.subCategory || null,
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
      instant_booking: payload.availability.instantBooking,
      max_renters: payload.availability.maxRenters,
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
  const images = Array.isArray(payload.images) ? payload.images : [];

  if (!images.length) {
    return res.json({ listingId, imageCount: 0 });
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

  return res.json({ listingId, imageCount: uploadedImages.length });
});

listingsRouter.patch("/me/:listingId", requireAuth, async (req, res) => {
  const ownerUserId = req.auth.sub;
  const payload = { ...(req.body || {}), listingId: req.params.listingId };

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
        category: payload.category,
        sub_category: payload.subCategory || null,
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
        instant_booking: payload.availability.instantBooking,
        max_renters: payload.availability.maxRenters,
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
  if (!images.length) {
    return res.json({ ok: true });
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

  return res.json({ ok: true });
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

  return res.json(mapRowToMarketplaceListing(data));
});

export const reserveListingInventoryInternal = async (listingId, mode, quantity) => {
  const safeQuantity = Math.max(1, Math.floor(quantity));
  const modeForDb = mode === "buy" ? "sell" : "rent";

  const { data, error } = await supabaseAdmin.rpc("reserve_listing_inventory", {
    p_listing_id: listingId,
    p_mode: modeForDb,
    p_quantity: safeQuantity,
  });

  if (error) {
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
