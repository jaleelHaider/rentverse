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

const app = express();
const port = Number(process.env.PORT || 4000);
const configuredFrontendUrls = String(process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

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
      if (isAllowedDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS not allowed"));
    },
    credentials: true,
  })
);
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

app.use((error, _req, res, _next) => {
  const message = error instanceof Error ? error.message : "Internal server error";
  res.status(500).json({ message });
});

app.listen(port, () => {
  console.log(`RentVerse backend listening on http://localhost:${port}`);
});
