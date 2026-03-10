import { supabase } from "@/lib/supabase";
import { reserveListingInventory } from "@/api/endpoints/listing";
import type {
  CreateMarketplaceOrderInput,
  MarketplaceOrder,
  MarketplaceOrderStatus,
} from "@/types/order.types";

interface ListingOrderRow {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  order_mode: "buy" | "rent";
  quantity: number;
  duration_unit: "day" | "week" | "month" | null;
  duration_count: number | null;
  unit_price: number;
  item_amount: number;
  security_deposit: number;
  platform_fee: number;
  total_due: number;
  payment_method: "escrow_card" | "bank_transfer" | "wallet";
  payment_confirmed: boolean;
  status: MarketplaceOrderStatus;
  status_reason: string | null;
  full_name: string;
  phone: string;
  city: string;
  delivery_address: string;
  special_instructions: string;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  listings:
    | {
        id: string;
        title: string;
        listing_images: Array<{ public_url: string; is_primary: boolean; display_order: number }> | null;
      }
    | Array<{
        id: string;
        title: string;
        listing_images: Array<{ public_url: string; is_primary: boolean; display_order: number }> | null;
      }>
    | null;
}

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1200&q=80";

const mapListingRelation = (value: ListingOrderRow["listings"]) => {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return value[0] || null;
  }
  return value;
};

const mapPrimaryImage = (
  images: Array<{ public_url: string; is_primary: boolean; display_order: number }> | null
): string => {
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

const mapRowToOrder = (row: ListingOrderRow): MarketplaceOrder => {
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
    fullName: row.full_name,
    phone: row.phone,
    city: row.city,
    deliveryAddress: row.delivery_address,
    specialInstructions: row.special_instructions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
  };
};

export const createMarketplaceOrder = async (
  input: CreateMarketplaceOrderInput
): Promise<MarketplaceOrder> => {
  const { data: listingRow, error: listingError } = await supabase
    .from("listings")
    .select("id,owner_user_id,owner_name,title")
    .eq("id", input.listingId)
    .single();

  if (listingError || !listingRow) {
    throw new Error(listingError?.message || "Listing not found.");
  }

  const sellerId = listingRow.owner_user_id as string;

  if (sellerId === input.buyerId) {
    throw new Error("You cannot create an order for your own listing.");
  }

  const { data, error } = await supabase
    .from("marketplace_orders")
    .insert({
      listing_id: input.listingId,
      buyer_id: input.buyerId,
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
    .select(
      "id,listing_id,buyer_id,seller_id,order_mode,quantity,duration_unit,duration_count,unit_price,item_amount,security_deposit,platform_fee,total_due,payment_method,payment_confirmed,status,status_reason,full_name,phone,city,delivery_address,special_instructions,created_at,updated_at,approved_at,rejected_at,listings(id,title,listing_images(public_url,is_primary,display_order))"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create order request.");
  }

  await supabase.from("notifications").insert({
    user_id: sellerId,
    actor_id: input.buyerId,
    type: "order_request",
    title: "New order request",
    body: `You received a ${input.mode} request on ${listingRow.title}.`,
    data: {
      listingId: input.listingId,
      orderId: data.id,
    },
  });

  return mapRowToOrder(data as ListingOrderRow);
};

export const fetchMarketplaceOrdersForUser = async (userId: string): Promise<MarketplaceOrder[]> => {
  const { data, error } = await supabase
    .from("marketplace_orders")
    .select(
      "id,listing_id,buyer_id,seller_id,order_mode,quantity,duration_unit,duration_count,unit_price,item_amount,security_deposit,platform_fee,total_due,payment_method,payment_confirmed,status,status_reason,full_name,phone,city,delivery_address,special_instructions,created_at,updated_at,approved_at,rejected_at,listings(id,title,listing_images(public_url,is_primary,display_order))"
    )
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to load orders.");
  }

  return ((data || []) as ListingOrderRow[]).map(mapRowToOrder);
};

export const approveMarketplaceOrder = async (
  orderId: string,
  sellerId: string
): Promise<MarketplaceOrder> => {
  const { data: current, error: currentError } = await supabase
    .from("marketplace_orders")
    .select("id,listing_id,buyer_id,seller_id,order_mode,quantity,status")
    .eq("id", orderId)
    .single();

  if (currentError || !current) {
    throw new Error(currentError?.message || "Order not found.");
  }

  if (current.seller_id !== sellerId) {
    throw new Error("Only listing owner can approve this request.");
  }

  if (current.status !== "pending_seller_approval") {
    throw new Error("Only pending requests can be approved.");
  }

  await reserveListingInventory(
    current.listing_id as string,
    (current.order_mode as "buy" | "rent") === "buy" ? "buy" : "rent",
    current.quantity as number
  );

  const approvedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("marketplace_orders")
    .update({
      status: "approved",
      approved_at: approvedAt,
      status_reason: null,
    })
    .eq("id", orderId)
    .select(
      "id,listing_id,buyer_id,seller_id,order_mode,quantity,duration_unit,duration_count,unit_price,item_amount,security_deposit,platform_fee,total_due,payment_method,payment_confirmed,status,status_reason,full_name,phone,city,delivery_address,special_instructions,created_at,updated_at,approved_at,rejected_at,listings(id,title,listing_images(public_url,is_primary,display_order))"
    )
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message || "Failed to approve order.");
  }

  await supabase.from("notifications").insert({
    user_id: current.buyer_id as string,
    actor_id: sellerId,
    type: "order_approved",
    title: "Order approved",
    body: "Your order request has been approved by the seller.",
    data: {
      orderId,
      listingId: current.listing_id,
    },
  });

  return mapRowToOrder(updated as ListingOrderRow);
};

export const rejectMarketplaceOrder = async (
  orderId: string,
  sellerId: string,
  reason?: string
): Promise<MarketplaceOrder> => {
  const { data: current, error: currentError } = await supabase
    .from("marketplace_orders")
    .select("id,listing_id,buyer_id,seller_id,status")
    .eq("id", orderId)
    .single();

  if (currentError || !current) {
    throw new Error(currentError?.message || "Order not found.");
  }

  if (current.seller_id !== sellerId) {
    throw new Error("Only listing owner can reject this request.");
  }

  if (current.status !== "pending_seller_approval") {
    throw new Error("Only pending requests can be rejected.");
  }

  const rejectedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("marketplace_orders")
    .update({
      status: "rejected",
      rejected_at: rejectedAt,
      status_reason: reason || null,
    })
    .eq("id", orderId)
    .select(
      "id,listing_id,buyer_id,seller_id,order_mode,quantity,duration_unit,duration_count,unit_price,item_amount,security_deposit,platform_fee,total_due,payment_method,payment_confirmed,status,status_reason,full_name,phone,city,delivery_address,special_instructions,created_at,updated_at,approved_at,rejected_at,listings(id,title,listing_images(public_url,is_primary,display_order))"
    )
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message || "Failed to reject order.");
  }

  await supabase.from("notifications").insert({
    user_id: current.buyer_id as string,
    actor_id: sellerId,
    type: "order_rejected",
    title: "Order rejected",
    body: "Your order request was rejected by the seller.",
    data: {
      orderId,
      listingId: current.listing_id,
    },
  });

  return mapRowToOrder(updated as ListingOrderRow);
};
