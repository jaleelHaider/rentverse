import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "../lib/supabase.js";

const LISTING_IMAGES_BUCKET = "listing-images";

const parseArgs = (argv) => {
  const args = {
    dryRun: false,
    limit: null,
    status: "active",
    defaultCategory: "Electronics",
    defaultCondition: "Good",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (token === "--json" && next) {
      args.jsonPath = next;
      index += 1;
      continue;
    }

    if (token === "--images" && next) {
      args.imagesDir = next;
      index += 1;
      continue;
    }

    if (token === "--owner-user-id" && next) {
      args.ownerUserId = next;
      index += 1;
      continue;
    }

    if (token === "--owner-email" && next) {
      args.ownerEmail = next;
      index += 1;
      continue;
    }

    if (token === "--owner-name" && next) {
      args.ownerName = next;
      index += 1;
      continue;
    }

    if (token === "--status" && next) {
      args.status = String(next).trim().toLowerCase();
      index += 1;
      continue;
    }

    if (token === "--default-category" && next) {
      args.defaultCategory = String(next).trim();
      index += 1;
      continue;
    }

    if (token === "--default-condition" && next) {
      args.defaultCondition = String(next).trim();
      index += 1;
      continue;
    }

    if (token === "--limit" && next) {
      const parsed = Number.parseInt(next, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        args.limit = parsed;
      }
      index += 1;
      continue;
    }
  }

  return args;
};

const usage = () => {
  console.log("Bulk listing upload");
  console.log("Required:");
  console.log("  --json <path>            JSON file with an array of listing objects");
  console.log("  --images <path>          Folder where image files are stored");
  console.log("  --owner-user-id <uuid>   Owner user id from auth.users");
  console.log("Optional:");
  console.log("  --owner-email <email>    If owner user id is missing, resolve auth user by email");
  console.log("  --owner-name <name>      Override owner_name value in listings rows");
  console.log("  --status <status>        Listing status: active|draft|paused|archived|pending|sold|rented");
  console.log("  --default-category <x>   Fallback when record.category is missing (default: Electronics)");
  console.log("  --default-condition <x>  Fallback when record.condition is missing (default: Good)");
  console.log("  --limit <n>              Only process first n records");
  console.log("  --dry-run                Validate and preview without DB/storage writes");
  console.log("");
  console.log("Example:");
  console.log(
    "  npm run listings:bulk-upload -- --json ./data/products.json --images ./data/product-images --owner-user-id <uuid>"
  );
};

const toNumber = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const normalized = raw
    .replace(/\r?\n/g, "")
    .replace(/,/g, "")
    .replace(/\.\.+/g, ".")
    .replace(/[^0-9.-]/g, "");

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const sanitizeFileName = (fileName) => String(fileName || "").replace(/[^a-zA-Z0-9._-]/g, "_");

const buildImagePath = (userId, listingId, fileName) => {
  const ext = path.extname(fileName || "") || ".jpg";
  const base = path.basename(fileName || "image", ext);
  const safeBase = sanitizeFileName(base) || "image";
  const safeExt = sanitizeFileName(ext.replace(".", "")) || "jpg";
  const unique = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  return `${userId}/${listingId}/${unique}-${safeBase}.${safeExt}`;
};

const parseListingType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "buy") return "sell";
  if (normalized === "sell" || normalized === "rent" || normalized === "both") return normalized;
  return "rent";
};

const inferListingType = (record) => {
  const explicit = record.listingType || record.listing_type;
  if (explicit) {
    return parseListingType(explicit);
  }

  if (typeof record.price === "string" || typeof record.price === "number") {
    return "sell";
  }

  return "rent";
};

const parseStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  const allowed = new Set(["draft", "active", "paused", "archived", "pending", "sold", "rented"]);
  return allowed.has(normalized) ? normalized : "active";
};

const normalizeImages = (record) => {
  if (Array.isArray(record.images)) {
    return record.images.filter((item) => String(item || "").trim().length > 0).map((item) => String(item).trim());
  }

  if (typeof record.image === "string" && record.image.trim()) {
    return [record.image.trim()];
  }

  return [];
};

const buildListingPayload = ({ record, ownerUserId, ownerEmail, ownerName, defaultStatus, defaultCategory, defaultCondition }) => {
  const title = String(record.title || "").trim();
  const description = String(record.description || "").trim();
  const category = String(record.category || defaultCategory || "Electronics").trim();
  const condition = String(record.condition || defaultCondition || "Good").trim();

  if (!title || !description || !category) {
    throw new Error("Each record must include title, description, and category.");
  }

  const listingType = inferListingType(record);
  const status = parseStatus(record.status || defaultStatus);

  const hasScalarPrice = typeof record.price === "string" || typeof record.price === "number";
  const scalarPrice = hasScalarPrice ? record.price : null;
  const price = record.price && typeof record.price === "object" && !Array.isArray(record.price) ? record.price : {};
  const rentPrice = price.rent || {};
  const location = record.location || {};
  const availability = record.availability || {};
  const features = Array.isArray(record.features)
    ? record.features.map((item) => String(item || "").trim()).filter((item) => item.length > 0)
    : [];

  const specifications =
    record.specifications && typeof record.specifications === "object" && !Array.isArray(record.specifications)
      ? record.specifications
      : {};

  const totalForRentDefault = listingType === "rent" || listingType === "both" ? 1 : 0;
  const totalForSaleDefault = listingType === "sell" || listingType === "both" ? 1 : 0;

  const totalForRent = Math.max(
    0,
    Number.parseInt(String(availability.totalForRent ?? totalForRentDefault), 10) || totalForRentDefault,
  );
  const totalForSale = Math.max(
    0,
    Number.parseInt(String(availability.totalForSale ?? totalForSaleDefault), 10) || totalForSaleDefault,
  );

  const availableForRent = Math.max(
    0,
    Number.parseInt(String(availability.availableForRent ?? totalForRent), 10) || totalForRent,
  );
  const availableForSale = Math.max(
    0,
    Number.parseInt(String(availability.availableForSale ?? totalForSale), 10) || totalForSale,
  );

  return {
    owner_user_id: ownerUserId,
    owner_email: ownerEmail || null,
    owner_name: ownerName || "",
    title,
    description,
    category,
    sub_category: String(record.subCategory || record.sub_category || "").trim() || null,
    category_node_key: String(record.categoryNodeKey || record.category_node_key || "").trim() || null,
    category_path_snapshot: String(record.categoryPath || record.category_path_snapshot || "").trim() || null,
    category_source: String(record.categorySource || record.category_source || "manual").trim() || "manual",
    category_confidence: toNumber(record.categoryConfidence ?? record.category_confidence),
    condition,
    listing_type: listingType,
    buy_price: toNumber(price.buy ?? record.buy_price ?? scalarPrice),
    rent_daily_price: toNumber(rentPrice.daily ?? record.rent_daily_price),
    rent_weekly_price: toNumber(rentPrice.weekly ?? record.rent_weekly_price),
    rent_monthly_price: toNumber(rentPrice.monthly ?? record.rent_monthly_price),
    security_deposit: toNumber(price.securityDeposit ?? record.security_deposit ?? availability.securityDeposit),
    location_address: String(location.address || record.location_address || "").trim() || null,
    location_city: String(location.city || record.location_city || "").trim() || null,
    location_state: String(location.state || record.location_state || "").trim() || null,
    location_country: String(location.country || record.location_country || "").trim() || null,
    location_lat: toNumber(location.lat ?? record.location_lat),
    location_lng: toNumber(location.lng ?? record.location_lng),
    service_radius_km: toNumber(location.radius ?? record.service_radius_km),
    min_rental_days: Math.max(1, Number.parseInt(String(availability.minRentalDays ?? 1), 10) || 1),
    max_rental_days: Math.max(1, Number.parseInt(String(availability.maxRentalDays ?? 30), 10) || 30),
    total_for_rent: totalForRent,
    available_for_rent: Math.min(availableForRent, totalForRent),
    total_for_sale: totalForSale,
    available_for_sale: Math.min(availableForSale, totalForSale),
    features,
    specifications,
    status,
  };
};

const ensureOwner = async ({ ownerUserId, ownerEmail }) => {
  if (ownerUserId) {
    const response = await supabaseAdmin.auth.admin.getUserById(ownerUserId);
    if (response.error || !response.data?.user) {
      throw new Error(response.error?.message || "owner-user-id was not found in auth.users");
    }

    return {
      ownerUserId: response.data.user.id,
      ownerEmail: response.data.user.email || ownerEmail || null,
      ownerName: response.data.user.user_metadata?.full_name || "",
    };
  }

  if (!ownerEmail) {
    throw new Error("Provide --owner-user-id or --owner-email.");
  }

  let page = 1;

  while (page < 25) {
    const response = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (response.error) {
      throw new Error(response.error.message || "Failed to query auth users.");
    }

    const users = response.data?.users || [];
    const found = users.find((user) => String(user.email || "").toLowerCase() === String(ownerEmail).toLowerCase());
    if (found) {
      return {
        ownerUserId: found.id,
        ownerEmail: found.email || ownerEmail,
        ownerName: found.user_metadata?.full_name || "",
      };
    }

    if (!users.length) {
      break;
    }

    page += 1;
  }

  throw new Error(`Could not find auth user for owner email: ${ownerEmail}`);
};

const resolveImageFilePath = async (imagesDir, imageRef) => {
  const asGiven = path.resolve(imagesDir, imageRef);
  try {
    const stat = await fs.stat(asGiven);
    if (stat.isFile()) {
      return asGiven;
    }
  } catch {
    // Try basename fallback for flexible JSON references.
  }

  const basenameCandidate = path.resolve(imagesDir, path.basename(imageRef));
  const stat = await fs.stat(basenameCandidate);
  if (!stat.isFile()) {
    throw new Error(`Image not found: ${imageRef}`);
  }

  return basenameCandidate;
};

async function run() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.jsonPath || !args.imagesDir || (!args.ownerUserId && !args.ownerEmail)) {
    usage();
    process.exit(1);
  }

  const jsonPath = path.resolve(process.cwd(), args.jsonPath);
  const imagesDir = path.resolve(process.cwd(), args.imagesDir);

  const [jsonStat, imagesStat] = await Promise.all([fs.stat(jsonPath), fs.stat(imagesDir)]);
  if (!jsonStat.isFile()) {
    throw new Error(`JSON path is not a file: ${jsonPath}`);
  }
  if (!imagesStat.isDirectory()) {
    throw new Error(`Images path is not a folder: ${imagesDir}`);
  }

  const owner = await ensureOwner({ ownerUserId: args.ownerUserId, ownerEmail: args.ownerEmail });
  const ownerEmail = args.ownerEmail || owner.ownerEmail;
  const ownerName = args.ownerName || owner.ownerName;

  const raw = await fs.readFile(jsonPath, "utf8");
  const parsed = JSON.parse(raw);
  const records = Array.isArray(parsed) ? parsed : parsed?.products;

  if (!Array.isArray(records)) {
    throw new Error("JSON file must be an array or an object with a products array.");
  }

  const sourceRecords = args.limit ? records.slice(0, args.limit) : records;
  console.log(`Preparing to process ${sourceRecords.length} listing records.`);
  console.log(`Owner: ${owner.ownerUserId} (${ownerEmail || "no-email"})`);
  console.log(`Mode: ${args.dryRun ? "DRY RUN (no writes)" : "WRITE"}`);

  let success = 0;
  let failed = 0;

  for (let index = 0; index < sourceRecords.length; index += 1) {
    const record = sourceRecords[index];

    try {
      const listingPayload = buildListingPayload({
        record,
        ownerUserId: owner.ownerUserId,
        ownerEmail,
        ownerName,
        defaultStatus: args.status,
        defaultCategory: args.defaultCategory,
        defaultCondition: args.defaultCondition,
      });
      const imageRefs = normalizeImages(record);

      if (args.dryRun) {
        for (const imageRef of imageRefs) {
          await resolveImageFilePath(imagesDir, imageRef);
        }

        console.log(
          `[dry-run] #${index + 1} ${listingPayload.title} | images=${imageRefs.length} | type=${listingPayload.listing_type}`
        );
        success += 1;
        continue;
      }

      const { data: listingRow, error: listingError } = await supabaseAdmin
        .from("listings")
        .insert(listingPayload)
        .select("id")
        .single();

      if (listingError || !listingRow) {
        throw new Error(listingError?.message || "Failed to insert listing row.");
      }

      const listingId = listingRow.id;
      const uploadedImages = [];

      for (let imageIndex = 0; imageIndex < imageRefs.length; imageIndex += 1) {
        const imageRef = imageRefs[imageIndex];
        const imageFilePath = await resolveImageFilePath(imagesDir, imageRef);
        const imageName = path.basename(imageFilePath);
        const storagePath = buildImagePath(owner.ownerUserId, listingId, imageName);
        const fileBuffer = await fs.readFile(imageFilePath);
        const ext = path.extname(imageName).toLowerCase();
        const contentType =
          ext === ".png"
            ? "image/png"
            : ext === ".webp"
              ? "image/webp"
              : ext === ".gif"
                ? "image/gif"
                : "image/jpeg";

        const { error: uploadError } = await supabaseAdmin.storage
          .from(LISTING_IMAGES_BUCKET)
          .upload(storagePath, fileBuffer, { cacheControl: "3600", upsert: false, contentType });

        if (uploadError) {
          throw new Error(`Image upload failed for ${imageName}: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabaseAdmin.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(storagePath);
        uploadedImages.push({
          listing_id: listingId,
          storage_path: storagePath,
          public_url: publicUrlData.publicUrl,
          is_primary: imageIndex === 0,
          display_order: imageIndex,
        });
      }

      if (uploadedImages.length > 0) {
        const { error: imageInsertError } = await supabaseAdmin.from("listing_images").insert(uploadedImages);
        if (imageInsertError) {
          throw new Error(imageInsertError.message || "Failed to write listing_images rows.");
        }
      }

      console.log(`[#${index + 1}] Imported ${listingPayload.title} (listing_id=${listingId}, images=${uploadedImages.length})`);
      success += 1;
    } catch (error) {
      failed += 1;
      console.error(`[#${index + 1}] Failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log("");
  console.log("Bulk upload finished");
  console.log(`Successful: ${success}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
