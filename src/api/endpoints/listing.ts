import { supabase } from "@/lib/supabase";
import type { Listing } from "@/types";
import type {
	CreateListingPayload,
	ListingOwner,
	ListingType,
} from "@/types/listing.types";

const LISTING_IMAGES_BUCKET = "listing-images";

interface CreateListingResult {
	listingId: string;
	imageCount: number;
}

interface ListingImageRow {
	public_url: string;
	is_primary: boolean;
	display_order: number;
}

interface ListingRow {
	id: string;
	title: string;
	description: string;
	category: string;
	sub_category: string | null;
	condition: string;
	listing_type: "rent" | "sell" | "both";
	buy_price: number | null;
	rent_daily_price: number | null;
	rent_weekly_price: number | null;
	rent_monthly_price: number | null;
	security_deposit: number | null;
	location_address: string | null;
	location_city: string | null;
	location_state: string | null;
	location_lat: number | null;
	location_lng: number | null;
	features: string[] | null;
	specifications: Record<string, string> | null;
	owner_firebase_uid: string;
	owner_name: string | null;
	created_at: string;
	updated_at: string;
	status: "draft" | "active" | "paused" | "archived";
	listing_images: ListingImageRow[] | null;
}

const mapListingTypeForClient = (type: ListingRow["listing_type"]): Listing["type"] => {
	if (type === "sell") {
		return "buy";
	}

	return type;
};

const mapConditionForCard = (value: string): string => {
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

const formatRelativeCreatedAt = (isoDate: string): string => {
	const created = new Date(isoDate).getTime();
	if (!Number.isFinite(created)) {
		return "Recently";
	}

	const diffMs = Date.now() - created;
	const dayMs = 24 * 60 * 60 * 1000;
	const days = Math.floor(diffMs / dayMs);

	if (days <= 0) {
		return "Today";
	}
	if (days === 1) {
		return "1 day ago";
	}
	if (days < 30) {
		return `${days} days ago`;
	}

	const months = Math.floor(days / 30);
	if (months === 1) {
		return "1 month ago";
	}

	return `${months} months ago`;
};

const mapRowToMarketplaceListing = (row: ListingRow): Listing => {
	const sortedImages = [...(row.listing_images || [])].sort((a, b) => {
		if (a.is_primary === b.is_primary) {
			return a.display_order - b.display_order;
		}
		return a.is_primary ? -1 : 1;
	});

	const images = sortedImages.map((image) => image.public_url);
	const listingType = mapListingTypeForClient(row.listing_type);
	const normalizedStatus: Listing["status"] =
		row.status === "paused" ? "paused" : "active";

	return {
		id: row.id,
		title: row.title,
		description: row.description,
		type: listingType,
		category: row.category,
		subCategory: row.sub_category || "",
		condition: mapConditionForCard(row.condition) as Listing["condition"],
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
		specifications: row.specifications || {},
		features: row.features || [],
		seller: {
			id: row.owner_firebase_uid,
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

const toNumber = (value: string): number | null => {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const sanitizeFileName = (fileName: string): string => {
	return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
};

const buildImagePath = (firebaseUid: string, listingId: string, file: File): string => {
	const extension = file.name.split(".").pop() || "jpg";
	const safeName = sanitizeFileName(file.name.replace(`.${extension}`, ""));
	const unique = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

	return `${firebaseUid}/${listingId}/${unique}-${safeName}.${extension}`;
};

const parseListingStatus = (listingType: ListingType): string => {
	if (listingType === "buy") {
		return "sell";
	}
	return listingType;
};

export const createListingWithImages = async (
	payload: CreateListingPayload,
	owner: ListingOwner
): Promise<CreateListingResult> => {
	const { data: listingRow, error: listingError } = await supabase
		.from("listings")
		.insert({
			owner_firebase_uid: owner.firebaseUid,
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
			specifications: payload.specifications,
			features: payload.features.filter((feature) => feature.trim().length > 0),
			status: "active",
		})
		.select("id")
		.single();

	if (listingError || !listingRow) {
		throw new Error(listingError?.message || "Failed to create listing");
	}

	const listingId = listingRow.id as string;

	if (!payload.images.length) {
		return {
			listingId,
			imageCount: 0,
		};
	}

	const uploadedImages: Array<{ path: string; publicUrl: string; displayOrder: number }> = [];

	for (let index = 0; index < payload.images.length; index += 1) {
		const image = payload.images[index];
		const path = buildImagePath(owner.firebaseUid, listingId, image);

		const { error: uploadError } = await supabase.storage
			.from(LISTING_IMAGES_BUCKET)
			.upload(path, image, {
				cacheControl: "3600",
				upsert: false,
				contentType: image.type,
			});

		if (uploadError) {
			throw new Error(`Image upload failed for ${image.name}: ${uploadError.message}`);
		}

		const { data: publicUrlData } = supabase.storage
			.from(LISTING_IMAGES_BUCKET)
			.getPublicUrl(path);

		uploadedImages.push({
			path,
			publicUrl: publicUrlData.publicUrl,
			displayOrder: index,
		});
	}

	const { error: imageInsertError } = await supabase.from("listing_images").insert(
		uploadedImages.map((uploadedImage, index) => ({
			listing_id: listingId,
			storage_path: uploadedImage.path,
			public_url: uploadedImage.publicUrl,
			is_primary: index === 0,
			display_order: uploadedImage.displayOrder,
		}))
	);

	if (imageInsertError) {
		throw new Error(imageInsertError.message || "Failed to save listing images");
	}

	return {
		listingId,
		imageCount: uploadedImages.length,
	};
};

export const fetchMarketplaceListings = async (): Promise<Listing[]> => {
	const { data, error } = await supabase
		.from("listings")
		.select(
			"id,title,description,category,sub_category,condition,listing_type,buy_price,rent_daily_price,rent_weekly_price,rent_monthly_price,security_deposit,location_address,location_city,location_state,location_lat,location_lng,features,specifications,owner_firebase_uid,owner_name,created_at,updated_at,status,listing_images(public_url,is_primary,display_order)"
		)
		.eq("status", "active")
		.order("created_at", { ascending: false });

	if (error) {
		throw new Error(error.message || "Failed to fetch listings");
	}

	return ((data || []) as ListingRow[]).map(mapRowToMarketplaceListing);
};
