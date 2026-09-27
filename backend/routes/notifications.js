import express from "express";
import db from "../config/db.js";

const router = express.Router();

// GET all notifications
router.get("/", (req, res) => {
    const sql = `
        SELECT id, title, message, type, is_read, created_at
        FROM notifications
        ORDER BY created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching notifications:", err);
            return res.status(500).json({
                message: "Failed to fetch notifications"
            });
        }

        res.json(results);
    });
});


// POST new notification
router.post("/", (req, res) => {
    const { title, message, type } = req.body;

    if (!title || !message) {
        return res.status(400).json({
            message: "Title and message are required"
        });
    }

    const sql = `
        INSERT INTO notifications (title, message, type)
        VALUES (?, ?, ?)
    `;

    db.query(
        sql,
        [title, message, type || "System"],
        (err, result) => {
            if (err) {
                console.error("Error creating notification:", err);
                return res.status(500).json({
                    message: "Failed to create notification"
                });
            }

            res.status(201).json({
                message: "Notification created successfully",
                id: result.insertId
            });
        }
    );
});


// Mark notification as read
router.put("/:id/read", (req, res) => {
    const { id } = req.params;

    const sql = `
        UPDATE notifications
        SET is_read = TRUE
        WHERE id = ?
    `;

    db.query(sql, [id], (err) => {
        if (err) {
            console.error("Error marking notification as read:", err);
            return res.status(500).json({
                message: "Failed to mark notification as read"
            });
        }

        res.json({
            message: "Notification marked as read"
        });
    });
});


// Delete notification
router.delete("/:id", (req, res) => {
    const { id } = req.params;

    const sql = `
        DELETE FROM notifications
        WHERE id = ?
    `;

    db.query(sql, [id], (err) => {
        if (err) {
            console.error("Error deleting notification:", err);
            return res.status(500).json({
                message: "Failed to delete notification"
            });
        }

        res.json({
            message: "Notification deleted successfully"
        });
    });
});


export default router;