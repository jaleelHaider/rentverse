import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { reserveListingInventoryInternal } from "./listings.js";

export const ordersRouter = Router();

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1200&q=80";

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

const orderSelect =
  "id,listing_id,buyer_id,seller_id,order_mode,quantity,duration_unit,duration_count,unit_price,item_amount,security_deposit,platform_fee,total_due,payment_method,payment_confirmed,status,status_reason,full_name,phone,city,delivery_address,special_instructions,created_at,updated_at,approved_at,rejected_at,listings(id,title,listing_images(public_url,is_primary,display_order))";

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
