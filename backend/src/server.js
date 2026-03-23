import "dotenv/config";

import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { listingsRouter } from "./routes/listings.js";
import { chatRouter } from "./routes/chat.js";
import { ordersRouter } from "./routes/orders.js";
import { notificationsRouter } from "./routes/notifications.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (origin === frontendUrl || allowedLocalhost.test(origin)) {
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
app.use("/api/notifications", notificationsRouter);

app.use((error, _req, res, _next) => {
  const message = error instanceof Error ? error.message : "Internal server error";
  res.status(500).json({ message });
});

app.listen(port, () => {
  console.log(`RentVerse backend listening on http://localhost:${port}`);
});
