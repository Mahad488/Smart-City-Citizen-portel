import express from "express";
import process from "node:process";
import citizenRoutes from "./backend/routes/citizens.js";
import complaintsRoutes from "./backend/routes/complaints.js";
import emergenciesRoutes from "./backend/routes/emergencies.js";
import notificationRoutes from "./backend/routes/notifications.js";

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(express.json());
app.use("/api/citizens", citizenRoutes);
app.use("/api/complaints", complaintsRoutes);
app.use("/api/emergency", emergenciesRoutes);
app.use("/api/notifications", notificationRoutes);

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});