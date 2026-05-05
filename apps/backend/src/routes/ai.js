import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
// import Redis from "ioredis"; // TODO: Enable Redis in production for rate limiting

export const aiRouter = Router();

// NOTE: Redis rate limiting is DISABLED for development.
// All requests pass through without rate limiting.
// To enable: uncomment the import above, uncomment the Redis initialization,
// and comment out the simplified middleware below.

// Redis-backed fixed-window limiter (per-minute) — DISABLED for dev
// const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

function getKey(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return `token:${authHeader.slice(7)}`;
  }
  return `ip:${req.ip || req.headers["x-forwarded-for"] || "unknown"}`;
}

// DEV: Simplified no-op rate limiter (always allows requests)
async function rateLimitMiddleware(req, res, next) {
  // TODO: Re-enable when Redis is ready for production
  // Guests: 10 req/min, Authenticated: 20 req/min
  next();
}

aiRouter.post("/chat", rateLimitMiddleware, async (req, res) => {
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
  const timeoutMs = Number.parseInt(String(process.env.AI_SERVICE_TIMEOUT_MS || "12000"), 10) || 12000;

  const payload = {
    session_id: req.body.session_id || null,
    user_id: req.body.user_id || null,
    message: req.body.message || req.body.text || "",
  };

  if (!payload.message) {
    return res.status(400).json({ message: "Missing message" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log(`[AI] Calling ${AI_SERVICE_URL}/ai/chat with payload:`, payload);
    const response = await fetch(`${AI_SERVICE_URL}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();
    console.log(`[AI] Response status: ${response.status}, data:`, data);
    
    if (!response.ok) {
      console.error(`[AI] Error from FastAPI:`, data);
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (err) {
    if (err.name === "AbortError") {
      console.error(`[AI] Request timed out after ${timeoutMs}ms`);
      return res.status(504).json({ message: "AI service timed out" });
    }

    console.error(`[AI] Error calling FastAPI:`, err);
    return res.status(502).json({ message: "AI service error", error: String(err) });
  }
});

// Proxy admin seed endpoint (should be protected in production)
aiRouter.post("/admin/seed", requireAuth, async (req, res) => {
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
  try {
    const response = await fetch(`${AI_SERVICE_URL}/admin/seed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(502).json({ message: "AI service error", error: String(err) });
  }
});

// Server-side streaming proxy: /api/ai/chat/stream
aiRouter.post("/chat/stream", rateLimitMiddleware, async (req, res) => {
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
  const payload = {
    session_id: req.body.session_id || null,
    user_id: req.body.user_id || null,
    message: req.body.message || req.body.text || "",
  };
  if (!payload.message) {
    return res.status(400).json({ message: "Missing message" });
  }

  try {
    const upstream = await fetch(`${AI_SERVICE_URL}/ai/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      return res.status(upstream.status).send(body);
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    // Stream chunks from upstream to client
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      res.write(chunk);
    }
    res.end();
  } catch (err) {
    return res.status(502).json({ message: "AI service error", error: String(err) });
  }
});
