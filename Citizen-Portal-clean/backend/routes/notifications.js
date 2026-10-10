import express from "express";
import db from "../config/db.js";
import { authenticate, requireAdmin } from "../auth.js";

const router = express.Router();

const ensureNotificationsTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        citizen_id VARCHAR(50) NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'System',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    // Safely add citizen_id column if it does not exist
    try {
      await db.query(`ALTER TABLE notifications ADD COLUMN citizen_id VARCHAR(50) NULL AFTER id`);
    } catch (_) {
      // Column already exists
    }
  } catch (err) {
    console.error("Notifications table check error:", err);
  }
};

// GET notifications (Citizen: own + system announcements, Admin: all)
router.get("/", authenticate, async (req, res) => {
  try {
    await ensureNotificationsTable();

    if (req.user.role === "ADMIN") {
      const [results] = await db.query(`
        SELECT id, citizen_id, title, message, type, is_read, created_at
        FROM notifications
        ORDER BY created_at DESC
      `);
      return res.json(results);
    }

    const citizen_id = req.user.citizen_id;
    const [results] = await db.query(
      `
      SELECT id, citizen_id, title, message, type, is_read, created_at
      FROM notifications
      WHERE citizen_id = ? OR citizen_id IS NULL
      ORDER BY created_at DESC
      `,
      [citizen_id || ""]
    );

    res.json(results);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// POST new notification (Admin or Authorized System)
router.post("/", authenticate, async (req, res) => {
  try {
    const { title, message, type, citizen_id } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        message: "Title and message are required",
      });
    }

    // Citizens can only create notifications for themselves; Admins can target any citizen or broadcast
    const targetCitizenId = req.user.role === "ADMIN" ? (citizen_id || null) : req.user.citizen_id;

    await ensureNotificationsTable();

    const [result] = await db.query(
      `
      INSERT INTO notifications (citizen_id, title, message, type)
      VALUES (?, ?, ?, ?)
      `,
      [targetCitizenId, title, message, type || "System"]
    );

    res.status(201).json({
      message: "Notification created successfully",
      id: result.insertId,
    });
  } catch (err) {
    console.error("Error creating notification:", err);
    res.status(500).json({ message: "Failed to create notification" });
  }
});

// Mark notification as read (Owner or Admin)
router.put("/:id/read", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await ensureNotificationsTable();

    let sql = `UPDATE notifications SET is_read = TRUE WHERE id = ?`;
    let params = [id];

    if (req.user.role !== "ADMIN") {
      sql += ` AND (citizen_id = ? OR citizen_id IS NULL)`;
      params.push(req.user.citizen_id || "");
    }

    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Notification not found or access denied",
      });
    }

    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

// Delete notification (Admin or Owner only)
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await ensureNotificationsTable();

    let sql = `DELETE FROM notifications WHERE id = ?`;
    let params = [id];

    if (req.user.role !== "ADMIN") {
      sql += ` AND citizen_id = ?`;
      params.push(req.user.citizen_id || "");
    }

    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Notification not found or access denied",
      });
    }

    res.json({ message: "Notification deleted successfully" });
  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).json({ message: "Failed to delete notification" });
  }
});

export default router;