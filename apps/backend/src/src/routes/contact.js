import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

export const contactRouter = Router();

const MAX_NAME_LEN = 120;
const MAX_EMAIL_LEN = 200;
const MAX_PHONE_LEN = 32;
const MAX_SUBJECT_LEN = 60;
const MAX_MESSAGE_LEN = 5000;

const clean = (value) => String(value || "").trim();

const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);

const normalizeSubject = (value) => {
  const allowed = new Set(["general", "technical", "billing", "safety", "business", "media"]);
  return allowed.has(value) ? value : "general";
};

contactRouter.post("/", async (req, res) => {
  const raw = req.body || {};
  const name = clean(raw.name);
  const email = clean(raw.email).toLowerCase();
  const phone = clean(raw.phone);
  const message = clean(raw.message);
  const sourcePage = clean(raw.sourcePage) || "/contact";
  const subject = normalizeSubject(clean(raw.subject));

  if (!name || name.length > MAX_NAME_LEN) {
    return res.status(400).json({ message: `Name is required and must be <= ${MAX_NAME_LEN} characters` });
  }

  if (!email || email.length > MAX_EMAIL_LEN || !isValidEmail(email)) {
    return res.status(400).json({ message: "A valid email is required" });
  }

  if (phone.length > MAX_PHONE_LEN) {
    return res.status(400).json({ message: `Phone must be <= ${MAX_PHONE_LEN} characters` });
  }

  if (!message || message.length > MAX_MESSAGE_LEN) {
    return res.status(400).json({ message: `Message is required and must be <= ${MAX_MESSAGE_LEN} characters` });
  }

  const { data, error } = await supabaseAdmin
    .from("contact_messages")
    .insert({
      name,
      email,
      phone: phone || null,
      subject,
      message,
      source_page: sourcePage,
      status: "new",
    })
    .select("id,created_at")
    .single();

  if (error || !data) {
    return res.status(400).json({ message: error?.message || "Failed to submit message" });
  }

  return res.status(201).json({
    ok: true,
    messageId: data.id,
    createdAt: data.created_at,
  });
});
