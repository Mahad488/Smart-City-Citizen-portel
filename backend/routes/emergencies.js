import express from "express";
import db from "../config/db.js";
import { authenticate } from "../auth.js";
import { sendEmergencyConfirmationEmail } from "../services/emailService.js";

const router = express.Router();


// =====================================================
// GET ALL EMERGENCIES - ADMIN
// =====================================================
router.get("/", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT *
       FROM emergencies
       ORDER BY id DESC`
    );

    res.json(rows);

  } catch (error) {
    console.error("GET EMERGENCIES ERROR:", error);

    res.status(500).json({
      message: "Error fetching emergencies",
    });
  }
});


// =====================================================
// GET CITIZEN'S EMERGENCIES (/me or /citizen/:citizen_id)
// =====================================================
router.get(["/me", "/citizen/:citizen_id"], authenticate, async (req, res) => {
  try {
    const citizen_id = req.params.citizen_id || req.user?.citizen_id;

    if (!citizen_id) {
      return res.status(400).json({
        message: "Citizen ID could not be identified from session",
      });
    }

    if (
      req.user.role !== "ADMIN" &&
      String(req.user.citizen_id || "").trim() !== String(citizen_id || "").trim()
    ) {
      return res.status(403).json({
        message: "You can only view your own emergencies.",
      });
    }

    const [rows] = await db.query(
      `SELECT *
       FROM emergencies
       WHERE citizen_id = ?
       ORDER BY id DESC`,
      [citizen_id]
    );

    res.json(rows);

  } catch (error) {
    console.error("GET CITIZEN EMERGENCIES ERROR:", error);

    res.status(500).json({
      message: "Error fetching citizen emergencies",
    });
  }
});


// =====================================================
// POST EMERGENCY FROM CITIZEN
// =====================================================
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      citizen_id,
      type,
      location,
      team,
      priority,
      status,
      latitude,
      longitude,
    } = req.body;

    if (!citizen_id || !type || !location) {
      return res.status(400).json({
        message: "Citizen, emergency type and location are required",
      });
    }

    if (req.user.citizen_id !== citizen_id) {
      return res.status(403).json({
        message: "You can only report emergencies for your own account.",
      });
    }

    const [citizenRows] = await db.query(
      `SELECT id, name, email, status
       FROM citizens
       WHERE citizen_id = ?`,
      [citizen_id]
    );

    if (citizenRows.length === 0) {
      return res.status(404).json({
        message: "Citizen not found",
      });
    }

    const citizen = citizenRows[0];

    if (citizen.status !== "Active") {
      return res.status(403).json({
        message: "Only active citizens can report emergencies",
      });
    }

    const [result] = await db.query(
      `INSERT INTO emergencies
       (
         citizen_id,
         type,
         location,
         team,
         priority,
         status,
         latitude,
         longitude
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        citizen_id,
        type,
        location,
        team || "Emergency Response Team",
        priority || "High",
        status || "Active",
        latitude ?? null,
        longitude ?? null,
      ]
    );

    res.status(201).json({
      message: "Emergency reported successfully",
      id: result.insertId,
    });

    // Send confirmation email asynchronously (non-blocking)
    sendEmergencyConfirmationEmail({
      citizenName: citizen.name,
      citizenEmail: citizen.email,
      emergencyId: result.insertId,
      emergencyType: type,
      location,
    }).catch((emailErr) => {
      console.error("[EMERGENCY ROUTE] Error sending emergency confirmation email:", emailErr);
    });

  } catch (error) {
    console.error("CREATE EMERGENCY ERROR:", error);

    res.status(500).json({
      message: error.sqlMessage || error.message || "Error creating emergency",
    });
  }
});


// =====================================================
// UPDATE CITIZEN EMERGENCY
// =====================================================
router.put("/citizen/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const {
      citizen_id,
      type,
      location,
    } = req.body;

    if (!citizen_id || !type || !location) {
      return res.status(400).json({
        message: "Citizen, emergency type and location are required",
      });
    }

    if (req.user.citizen_id !== citizen_id) {
      return res.status(403).json({
        message: "You can only update your own emergencies.",
      });
    }

    const [existing] = await db.query(
      `SELECT id
       FROM emergencies
       WHERE id = ? AND citizen_id = ?`,
      [id, citizen_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Emergency not found or access denied",
      });
    }

    await db.query(
      `UPDATE emergencies
       SET type = ?,
           location = ?
       WHERE id = ? AND citizen_id = ?`,
      [
        type,
        location,
        id,
        citizen_id,
      ]
    );

    res.json({
      message: "Emergency updated successfully",
    });

  } catch (error) {
    console.error("UPDATE CITIZEN EMERGENCY ERROR:", error);

    res.status(500).json({
      message: error.sqlMessage || error.message || "Error updating emergency",
    });
  }
});


// =====================================================
// DELETE CITIZEN EMERGENCY
// =====================================================
router.delete("/citizen/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { citizen_id } = req.body;

    if (!citizen_id) {
      return res.status(400).json({
        message: "Citizen ID is required",
      });
    }

    if (req.user.citizen_id !== citizen_id) {
      return res.status(403).json({
        message: "You can only delete your own emergencies.",
      });
    }

    const [result] = await db.query(
      `DELETE FROM emergencies
       WHERE id = ? AND citizen_id = ?`,
      [id, citizen_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Emergency not found or access denied",
      });
    }

    res.json({
      message: "Emergency deleted successfully",
    });

  } catch (error) {
    console.error("DELETE CITIZEN EMERGENCY ERROR:", error);

    res.status(500).json({
      message: error.sqlMessage || error.message || "Error deleting emergency",
    });
  }
});


// =====================================================
// GET SINGLE EMERGENCY
// =====================================================
router.get("/:id", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT *
       FROM emergencies
       WHERE id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Emergency not found",
      });
    }

    if (req.user.citizen_id !== rows[0].citizen_id) {
      return res.status(403).json({
        message: "This emergency does not belong to your account.",
      });
    }

    res.json(rows[0]);

  } catch (error) {
    console.error("GET SINGLE EMERGENCY ERROR:", error);

    res.status(500).json({
      message: "Error fetching emergency",
    });
  }
});


// =====================================================
// ADMIN UPDATE EMERGENCY
// =====================================================
router.put("/:id", async (req, res) => {
  try {
    const {
      type,
      location,
      team,
      priority,
      status,
      latitude,
      longitude,
    } = req.body;

    const [result] = await db.query(
      `UPDATE emergencies
       SET type = ?,
           location = ?,
           team = ?,
           priority = ?,
           status = ?,
           latitude = ?,
           longitude = ?
       WHERE id = ?`,
      [
        type,
        location,
        team,
        priority,
        status,
        latitude ?? null,
        longitude ?? null,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Emergency not found",
      });
    }

    res.json({
      message: "Emergency updated successfully",
    });

  } catch (error) {
    console.error("ADMIN UPDATE EMERGENCY ERROR:", error);

    res.status(500).json({
      message: error.sqlMessage || error.message || "Error updating emergency",
    });
  }
});


// =====================================================
// ADMIN DELETE EMERGENCY
// =====================================================
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.query(
      `DELETE FROM emergencies
       WHERE id = ?`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Emergency not found",
      });
    }

    res.json({
      message: "Emergency deleted successfully",
    });

  } catch (error) {
    console.error("ADMIN DELETE EMERGENCY ERROR:", error);

    res.status(500).json({
      message: "Error deleting emergency",
    });
  }
});


export default router;