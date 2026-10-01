import express from "express";
import cors from "cors";
import "dotenv/config"; // .env variables auto-load karne ke liye
import process from "node:process";

import citizenRoutes from "./routes/citizens.js";
import complaintsRoutes from "./routes/complaints.js";
import emergenciesRoutes from "./routes/emergencies.js";
import notificationRoutes from "./routes/notifications.js";

const app = express();
const port = Number(process.env.PORT) || 5000;

// Middleware
app.use(cors()); // Cross-Origin Request allow karne ke liye
app.use(express.json({ limit: "8mb" }));

// Health check route (Railway testing ke liye)
app.get("/", (req, res) => {
  res.send("Backend API is running successfully!");
});

// API Routes
app.use("/api/citizens", citizenRoutes);
app.use("/api/complaints", complaintsRoutes);
app.use("/api/emergency", emergenciesRoutes);
app.use("/api/notifications", notificationRoutes);

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});