import express from "express";
import "dotenv/config";
import process from "node:process";

import citizenRoutes from "./routes/citizens.js";
import complaintsRoutes from "./routes/complaints.js";
import emergenciesRoutes from "./routes/emergencies.js";
import notificationRoutes from "./routes/notifications.js";
import { authenticate } from "./auth.js";
import { sendComplaintConfirmationEmail } from "./services/emailService.js";

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

  if (typeof origin === "string") {
    const cleanOrigin = origin.replace(/\/+$/, "");
    if (
      allowedOrigins.length === 0 ||
      allowedOrigins.includes(cleanOrigin) ||
      cleanOrigin === "https://smart-city-citizen-portel-a37g.vercel.app" ||
      cleanOrigin.endsWith(".vercel.app") ||
      cleanOrigin.includes("localhost")
    ) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
  }

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  return next();
});

app.use(express.json({ limit: "8mb" }));

app.get("/", (req, res) => {
  res.send("Backend API is running successfully!");
});

app.get("/api/test-email", async (req, res) => {
  try {
    const to = req.query.to || "mahadrafiq480@gmail.com";
    const result = await sendComplaintConfirmationEmail({
      citizenName: "Test Citizen",
      citizenEmail: to,
      complaintId: 999,
      title: "Test Complaint Delivery",
      category: "Test Category",
      area: "Test Area",
    });
    res.json({ ok: true, to, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use("/api/citizens", citizenRoutes);
app.use("/api/complaints", authenticate, complaintsRoutes);
app.use("/api/emergencies", authenticate, emergenciesRoutes);
app.use("/api/emergency", authenticate, emergenciesRoutes);
app.use("/api/notifications", authenticate, notificationRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend server listening on port ${PORT}`);
});