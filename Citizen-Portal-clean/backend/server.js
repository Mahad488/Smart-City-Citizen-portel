import express from "express";
import cors from "cors";
import "dotenv/config";
import process from "node:process";

import citizenRoutes from "./routes/citizens.js";
import complaintsRoutes from "./routes/complaints.js";
import emergenciesRoutes from "./routes/emergencies.js";
import notificationRoutes from "./routes/notifications.js";
import { authenticate } from "./auth.js";

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "8mb" }));

app.get("/", (req, res) => {
  res.send("Backend API is running successfully!");
});

app.use("/api/citizens", citizenRoutes);
app.use("/api/complaints", authenticate, complaintsRoutes);
app.use("/api/emergency", authenticate, emergenciesRoutes);
app.use("/api/notifications", authenticate, notificationRoutes);

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});