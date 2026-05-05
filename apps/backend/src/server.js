import "dotenv/config";

import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { listingsRouter } from "./routes/listings.js";
import { chatRouter } from "./routes/chat.js";
import { ordersRouter } from "./routes/orders.js";
import { profilesRouter } from "./routes/profiles.js";
import { notificationsRouter } from "./routes/notifications.js";
import { adminRouter } from "./routes/admin.js";
import { contactRouter } from "./routes/contact.js";
import { reportsRouter } from "./routes/reports.js";
import { aiRouter } from "./routes/ai.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const configuredFrontendUrls = String(process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

console.log('[SERVER] Starting RentVerse backend...');
console.log('[SERVER] Port:', port);
console.log('[SERVER] FRONTEND_URL:', configuredFrontendUrls);

const allowedLocalhost = /^https?:\/\/([a-z0-9-]+\.)*(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)(:\d+)?$/i;

const isPrivateIpv4Host = (hostname) => {
  const parts = hostname.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((value) => Number.isNaN(value) || value < 0 || value > 255)) {
    return false;
  }

  if (parts[0] === 10) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
};

const isAllowedDevOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (configuredFrontendUrls.includes(origin) || allowedLocalhost.test(origin)) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    return isPrivateIpv4Host(parsed.hostname);
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      console.log('[CORS] Request origin:', origin);
      if (isAllowedDevOrigin(origin)) {
        console.log('[CORS] Origin allowed');
        callback(null, true);
        return;
      }

      console.log('[CORS] Origin rejected:', origin);
      callback(new Error("CORS not allowed"));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// Handle OPTIONS preflight requests explicitly
app.options('*', (req, res) => {
  console.log('[CORS] OPTIONS preflight for:', req.path);
  res.sendStatus(200);
});

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    origin: req.headers.origin,
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length'],
    userAgent: req.headers['user-agent']?.substring(0, 50),
  });
  
  // Log response timing
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[RESPONSE] ${req.method} ${req.path} - Status: ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

app.use(express.json({ limit: "25mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/profiles", profilesRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/contact", contactRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/ai", aiRouter);

// KB CRUD endpoints proxied/implemented here using Supabase server client
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
let supabase = null
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
}

const KB_TABLES = ['faq_entries', 'policy_entries', 'shipping_info_entries']

app.get('/api/ai/admin/kb/:table', requireAuth, async (req, res) => {
  try {
    const table = req.params.table
    if (!KB_TABLES.includes(table)) return res.status(400).json({ message: 'Invalid table' })
    if (!supabase) return res.status(500).json({ message: 'Supabase not configured' })
    const { data, error } = await supabase.from(table).select('*').limit(200)
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ message: String(err) })
  }
})

app.post('/api/ai/admin/kb/:table', requireAuth, async (req, res) => {
  try {
    const table = req.params.table
    if (!KB_TABLES.includes(table)) return res.status(400).json({ message: 'Invalid table' })
    if (!supabase) return res.status(500).json({ message: 'Supabase not configured' })
    const { data, error } = await supabase.from(table).insert(req.body).select()
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ message: String(err) })
  }
})

app.put('/api/ai/admin/kb/:table/:id', requireAuth, async (req, res) => {
  try {
    const table = req.params.table
    const id = req.params.id
    if (!KB_TABLES.includes(table)) return res.status(400).json({ message: 'Invalid table' })
    if (!supabase) return res.status(500).json({ message: 'Supabase not configured' })
    const { data, error } = await supabase.from(table).update(req.body).eq('id', id).select()
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ message: String(err) })
  }
})

app.delete('/api/ai/admin/kb/:table/:id', requireAuth, async (req, res) => {
  try {
    const table = req.params.table
    const id = req.params.id
    if (!KB_TABLES.includes(table)) return res.status(400).json({ message: 'Invalid table' })
    if (!supabase) return res.status(500).json({ message: 'Supabase not configured' })
    const { data, error } = await supabase.from(table).delete().eq('id', id).select()
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ message: String(err) })
  }
})

app.use((error, _req, res, _next) => {
  const message = error instanceof Error ? error.message : "Internal server error";
  res.status(500).json({ message });
});

app.listen(port, () => {
  console.log(`RentVerse backend listening on http://localhost:${port}`);
});
