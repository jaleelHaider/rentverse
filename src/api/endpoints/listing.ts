import { supabase } from "@/lib/supabase";
import type { Listing } from "@/types";
import type {
	CreateListingPayload,
	ListingOwner,
	ListingType,
	UpdateListingPayload,
} from "@/types/listing.types";

const LISTING_IMAGES_BUCKET = "listing-images";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientFetchError = (error: unknown): boolean => {
	if (!(error instanceof TypeError)) {
		return false;
	}

	return /failed to fetch|fetch/i.test(error.message);
};

const withTransientRetry = async <T>(operation: () => PromiseLike<T>): Promise<T> => {
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

interface CreateListingResult {
	listingId: string;
	imageCount: number;
}

export interface EditableListingData {
	id: string;
	ownerUserId: string;
	title: string;
	description: string;
	category: string;
	subCategory: string;
	condition: string;
	listingType: "buy" | "rent" | "both";
	location: {
		address: string;
		city: string;
		state: string;
		country: string;
		lat: number;
		lng: number;
		radius: number;
	};
	price: {
		buy: string;
		rent: {
			daily: string;
			weekly: string;
			monthly: string;
		};
		securityDeposit: string;
	};
	availability: {
		minRentalDays: number;
		maxRentalDays: number;
		instantBooking: boolean;
		maxRenters: number;
		totalForRent: number;
		availableForRent: number;
		totalForSale: number;
		availableForSale: number;
	};
	specifications: Record<string, string>;
	sellerTerms: string[];
	features: string[];
	images: string[];
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
	total_for_rent: number;
	available_for_rent: number;
	total_for_sale: number;
	available_for_sale: number;
	owner_user_id: string;
	owner_name: string | null;
	created_at: string;
	updated_at: string;
	status: "draft" | "active" | "paused" | "archived" | "pending" | "sold" | "rented";
	listing_images: ListingImageRow[] | null;
}

interface EditableListingRow {
	id: string;
	owner_user_id: string;
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
	location_country: string | null;
	location_lat: number | null;
	location_lng: number | null;
	service_radius_km: number | null;
	min_rental_days: number;
	max_rental_days: number;
	instant_booking: boolean;
	max_renters: number;
	total_for_rent: number;
	available_for_rent: number;
	total_for_sale: number;
	available_for_sale: number;
	features: string[] | null;
	specifications: Record<string, string> | null;
	listing_images: ListingImageRow[] | null;
}

interface ListingInventoryRow {
	owner_user_id: string;
	total_for_rent: number;
	available_for_rent: number;
	total_for_sale: number;
	available_for_sale: number;
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

const mapStatusForClient = (status: ListingRow["status"]): Listing["status"] => {
	if (status === "draft") {
		return "pending";
	}

	if (status === "archived") {
		return "paused";
	}

	if (status === "sold" || status === "rented" || status === "pending" || status === "paused") {
		return status;
	}

	return "active";
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

const toNumber = (value: string): number | null => {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const sanitizeFileName = (fileName: string): string => {
	return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
};

const buildImagePath = (userId: string, listingId: string, file: File): string => {
	const extension = file.name.split(".").pop() || "jpg";
	const safeName = sanitizeFileName(file.name.replace(`.${extension}`, ""));
	const unique = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

	return `${userId}/${listingId}/${unique}-${safeName}.${extension}`;
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
		const path = buildImagePath(owner.userId, listingId, image);

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
			"id,title,description,category,sub_category,condition,listing_type,buy_price,rent_daily_price,rent_weekly_price,rent_monthly_price,security_deposit,location_address,location_city,location_state,location_lat,location_lng,features,specifications,owner_user_id,owner_name,total_for_rent,available_for_rent,total_for_sale,available_for_sale,created_at,updated_at,status,listing_images(public_url,is_primary,display_order)"
		)
		.eq("status", "active")
		.order("created_at", { ascending: false });

	if (error) {
		throw new Error(error.message || "Failed to fetch listings");
	}

	return ((data || []) as ListingRow[]).map(mapRowToMarketplaceListing);
};

export const fetchUserListings = async (userId: string): Promise<Listing[]> => {
	const { data, error } = await supabase
		.from("listings")
		.select(
			"id,title,description,category,sub_category,condition,listing_type,buy_price,rent_daily_price,rent_weekly_price,rent_monthly_price,security_deposit,location_address,location_city,location_state,location_lat,location_lng,features,specifications,owner_user_id,owner_name,total_for_rent,available_for_rent,total_for_sale,available_for_sale,created_at,updated_at,status,listing_images(public_url,is_primary,display_order)"
		)
		.eq("owner_user_id", userId)
		.order("created_at", { ascending: false });

	if (error) {
		throw new Error(error.message || "Failed to fetch your listings");
	}

	return ((data || []) as ListingRow[]).map(mapRowToMarketplaceListing);
};

export const fetchMarketplaceListingById = async (listingId: string): Promise<Listing> => {
	const { data, error } = await supabase
		.from("listings")
		.select(
			"id,title,description,category,sub_category,condition,listing_type,buy_price,rent_daily_price,rent_weekly_price,rent_monthly_price,security_deposit,location_address,location_city,location_state,location_lat,location_lng,features,specifications,owner_user_id,owner_name,total_for_rent,available_for_rent,total_for_sale,available_for_sale,created_at,updated_at,status,listing_images(public_url,is_primary,display_order)"
		)
		.eq("id", listingId)
		.single();

	if (error || !data) {
		throw new Error(error?.message || "Listing not found");
	}

	return mapRowToMarketplaceListing(data as ListingRow);
};

export const fetchEditableListing = async (
	listingId: string,
	ownerUserId: string
): Promise<EditableListingData> => {
	const { data, error } = await supabase
		.from("listings")
		.select(
			"id,owner_user_id,title,description,category,sub_category,condition,listing_type,buy_price,rent_daily_price,rent_weekly_price,rent_monthly_price,security_deposit,location_address,location_city,location_state,location_country,location_lat,location_lng,service_radius_km,min_rental_days,max_rental_days,instant_booking,max_renters,total_for_rent,available_for_rent,total_for_sale,available_for_sale,features,specifications,listing_images(public_url,is_primary,display_order)"
		)
		.eq("id", listingId)
		.eq("owner_user_id", ownerUserId)
		.single();

	if (error || !data) {
		throw new Error(error?.message || "Listing not found for editing.");
	}

	const row = data as EditableListingRow;
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

	return {
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
	};
};

export const updateUserListing = async (
	payload: UpdateListingPayload,
	ownerUserId: string
): Promise<void> => {
	const { data: inventoryRow, error: inventoryError } = await withTransientRetry(() =>
		supabase
			.from("listings")
			.select("owner_user_id,total_for_rent,available_for_rent,total_for_sale,available_for_sale")
			.eq("id", payload.listingId)
			.single()
	);

	if (inventoryError || !inventoryRow) {
		throw new Error(inventoryError?.message || "Listing not found.");
	}

	const inventory = inventoryRow as ListingInventoryRow;
	if (inventory.owner_user_id !== ownerUserId) {
		throw new Error("You are not allowed to update this listing.");
	}

	const reservedForRent = Math.max(0, inventory.total_for_rent - inventory.available_for_rent);
	const reservedForSale = Math.max(0, inventory.total_for_sale - inventory.available_for_sale);

	const nextAvailableForRent = Math.max(0, payload.availability.totalForRent - reservedForRent);
	const nextAvailableForSale = Math.max(0, payload.availability.totalForSale - reservedForSale);

	const { error: updateError } = await withTransientRetry(() =>
		supabase
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
				security_deposit:
					toNumber(payload.price.securityDeposit) ?? payload.availability.securityDeposit,
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
				features: payload.features.filter((feature) => feature.trim().length > 0),
			})
			.eq("id", payload.listingId)
			.eq("owner_user_id", ownerUserId)
	);

	if (updateError) {
		throw new Error(updateError.message || "Failed to update listing.");
	}

	if (!payload.images || payload.images.length === 0) {
		return;
	}

	const { data: oldImageRows, error: oldImagesError } = await withTransientRetry(() =>
		supabase
			.from("listing_images")
			.select("id,storage_path")
			.eq("listing_id", payload.listingId)
	);

	if (oldImagesError) {
		throw new Error(oldImagesError.message || "Failed to load existing listing images.");
	}

	const oldStoragePaths = (oldImageRows || [])
		.map((row) => row.storage_path as string)
		.filter((path) => path.length > 0);

	if (oldStoragePaths.length > 0) {
		const { error: removeStorageError } = await withTransientRetry(() =>
			supabase.storage.from(LISTING_IMAGES_BUCKET).remove(oldStoragePaths)
		);

		if (removeStorageError) {
			throw new Error(removeStorageError.message || "Failed to replace listing images.");
		}

		const { error: deleteOldImagesError } = await withTransientRetry(() =>
			supabase
				.from("listing_images")
				.delete()
				.eq("listing_id", payload.listingId)
		);

		if (deleteOldImagesError) {
			throw new Error(deleteOldImagesError.message || "Failed to clear old listing images.");
		}
	}

	const uploadedImages: Array<{ path: string; publicUrl: string; displayOrder: number }> = [];

	for (let index = 0; index < payload.images.length; index += 1) {
		const image = payload.images[index];
		const path = buildImagePath(ownerUserId, payload.listingId, image);

		const { error: uploadError } = await withTransientRetry(() =>
			supabase.storage.from(LISTING_IMAGES_BUCKET).upload(path, image, {
				cacheControl: "3600",
				upsert: false,
				contentType: image.type,
			})
		);

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

	const { error: imageInsertError } = await withTransientRetry(() =>
		supabase.from("listing_images").insert(
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
		throw new Error(imageInsertError.message || "Failed to save listing images.");
	}
};

export const deleteUserListing = async (listingId: string, ownerUserId: string): Promise<void> => {
	const { data: listingRow, error: listingError } = await withTransientRetry(() =>
		supabase
			.from("listings")
			.select("id,owner_user_id")
			.eq("id", listingId)
			.single()
	);

	if (listingError || !listingRow) {
		throw new Error(listingError?.message || "Listing not found.");
	}

	if ((listingRow.owner_user_id as string) !== ownerUserId) {
		throw new Error("You are not allowed to delete this listing.");
	}

	const { data: imageRows, error: imageRowsError } = await withTransientRetry(() =>
		supabase
			.from("listing_images")
			.select("storage_path")
			.eq("listing_id", listingId)
	);

	if (imageRowsError) {
		throw new Error(imageRowsError.message || "Failed to prepare listing deletion.");
	}

	const storagePaths = (imageRows || [])
		.map((row) => row.storage_path as string)
		.filter((path) => path.length > 0);

	if (storagePaths.length > 0) {
		const { error: removeStorageError } = await withTransientRetry(() =>
			supabase.storage.from(LISTING_IMAGES_BUCKET).remove(storagePaths)
		);

		if (removeStorageError) {
			throw new Error(removeStorageError.message || "Failed to remove listing images from storage.");
		}
	}

	const { error: deleteError } = await withTransientRetry(() =>
		supabase
			.from("listings")
			.delete()
			.eq("id", listingId)
			.eq("owner_user_id", ownerUserId)
	);

	if (deleteError) {
		throw new Error(deleteError.message || "Failed to delete listing.");
	}
};

interface SellerStatsRow {
	status: ListingRow["status"];
	created_at: string;
}

export const fetchSellerDerivedStats = async (
	ownerUserId: string
): Promise<{ activeListings: number; memberSince: string }> => {
	const { data, error } = await supabase
		.from("listings")
		.select("status,created_at")
		.eq("owner_user_id", ownerUserId);

	if (error) {
		throw new Error(error.message || "Failed to fetch seller stats");
	}

	const rows = (data || []) as SellerStatsRow[];
	const activeListings = rows.filter((row) => row.status === "active").length;

	let earliestTime = Number.POSITIVE_INFINITY;
	for (const row of rows) {
		const time = new Date(row.created_at).getTime();
		if (Number.isFinite(time) && time < earliestTime) {
			earliestTime = time;
		}
	}

	const memberSince = Number.isFinite(earliestTime)
		? String(new Date(earliestTime).getFullYear())
		: "0";

	return {
		activeListings,
		memberSince,
	};
};

interface CategoryCountRow {
	category: string | null;
}

export const fetchActiveListingCategoryCounts = async (): Promise<Record<string, number>> => {
	const { data, error } = await supabase
		.from("listings")
		.select("category")
		.eq("status", "active");

	if (error) {
		throw new Error(error.message || "Failed to fetch category counts");
	}

	const rows = (data || []) as CategoryCountRow[];
	const counts: Record<string, number> = {};

	for (const row of rows) {
		const key = (row.category || "").trim().toLowerCase();
		if (!key) {
			continue;
		}

		counts[key] = (counts[key] || 0) + 1;
	}

	return counts;
};

export interface ReserveInventoryResult {
	remainingQuantity: number;
	updatedStatus: "active" | "sold" | "rented";
}

export const reserveListingInventory = async (
	listingId: string,
	mode: "buy" | "rent",
	quantity: number
): Promise<ReserveInventoryResult> => {
	const safeQuantity = Math.max(1, Math.floor(quantity));
	const modeForDb = mode === "buy" ? "sell" : "rent";

	const { data, error } = await supabase.rpc("reserve_listing_inventory", {
		p_listing_id: listingId,
		p_mode: modeForDb,
		p_quantity: safeQuantity,
	});

	if (error) {
		throw new Error(error.message || "Failed to reserve listing inventory");
	}

	const result = (Array.isArray(data) ? data[0] : data) as
		| { remaining_quantity?: number; updated_status?: "active" | "sold" | "rented" }
		| null;

	if (!result) {
		throw new Error("Inventory reservation failed. Please try again.");
	}

	return {
		remainingQuantity: result.remaining_quantity ?? 0,
		updatedStatus: result.updated_status || "active",
	};
};
