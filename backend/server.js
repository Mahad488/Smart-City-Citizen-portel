import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

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
const isProd = process.env.NODE_ENV === "production";

// =====================================================
// CORS CONFIGURATION (M-05 Remediation)
// =====================================================
const configuredOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const defaultAllowedOrigins = [
  "https://smart-city-citizen-portel-a37g.vercel.app",
  "https://smart-city-citizen-portal.vercel.app",
];

// Add localhost only in non-production environments
if (!isProd) {
  defaultAllowedOrigins.push(
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5173"
  );
}

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...configuredOrigins]));

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Security Headers (L-05 Remediation)
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

  if (isProd) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

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

  if (typeof origin === "string") {
    const cleanOrigin = origin.replace(/\/+$/, "");
    if (allowedOrigins.includes(cleanOrigin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
  }

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  return next();
});

// =====================================================
// RATE LIMITING MIDDLEWARE (L-05 Remediation)
// =====================================================
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 20; // 20 requests per window

function authRateLimiter(req, res, next) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "ip";
  const now = Date.now();

  const record = rateLimitMap.get(ip);
  if (!record || now - record.startTime > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, startTime: now });
    return next();
  }

  record.count += 1;
  if (record.count > RATE_LIMIT_MAX) {
    return res.status(429).json({
      message: "Too many authentication attempts. Please try again after 5 minutes.",
    });
  }

  next();
}

// Cleanup rate limit map every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.startTime > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(ip);
    }
  }
}, 10 * 60 * 1000);

app.use(express.json({ limit: "8mb" }));

// Root health check
app.get("/", (req, res) => {
  res.send("Backend API is running securely!");
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

// Rate limit sensitive authentication endpoints
app.use("/api/citizens/login", authRateLimiter);
app.use("/api/citizens/register", authRateLimiter);
app.use("/api/citizens/forgot-password", authRateLimiter);
app.use("/api/citizens/reset-password", authRateLimiter);

// Mount Application Routes
app.use("/api/citizens", citizenRoutes);
app.use("/api/complaints", authenticate, complaintsRoutes);
app.use("/api/emergencies", authenticate, emergenciesRoutes);
app.use("/api/emergency", authenticate, emergenciesRoutes);
app.use("/api/notifications", authenticate, notificationRoutes);

// Centralized error handling middleware
app.use((err, req, res, _next) => {
  console.error("Unhandled server error:", err);
  res.status(err.status || 500).json({
    message: isProd ? "Internal server error" : (err.message || "Internal server error"),
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend server listening on port ${PORT}`);
});