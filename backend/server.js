import express from "express";
import "dotenv/config";
import process from "node:process";

import citizenRoutes from "./routes/citizens.js";
import complaintsRoutes from "./routes/complaints.js";
import emergenciesRoutes from "./routes/emergencies.js";
import notificationRoutes from "./routes/notifications.js";
import { authenticateToken } from "./middleware/auth.js";

const app = express();
const port = Number(process.env.PORT) || 5000;
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

  if (
    typeof origin === "string" &&
    allowedOrigins.includes(origin.replace(/\/+$/, ""))
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
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

app.use(
  "/api/citizens",
  (req, res, next) => {
    const publicAuthPaths = [
      "/login",
      "/register",
      "/admin/login",
      "/google",
    ];
    const requestPath = req.path.replace(/\/+$/, "").toLowerCase() || "/";
    if (req.method === "POST" && publicAuthPaths.includes(requestPath)) {
      return next();
    }
    return authenticateToken(req, res, next);
  },
  citizenRoutes
);
app.use("/api/complaints", authenticateToken, complaintsRoutes);
app.use("/api/emergencies", authenticateToken, emergenciesRoutes);
app.use("/api/emergency", authenticateToken, emergenciesRoutes);
app.use("/api/notifications", authenticateToken, notificationRoutes);

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});