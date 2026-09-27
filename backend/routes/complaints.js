import express from "express";
import db from "../config/db.js";

const router = express.Router();


// =====================================================
// GET ALL COMPLAINTS - ADMIN
// =====================================================
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT *
       FROM complaints
       ORDER BY created_at DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error("GET COMPLAINTS ERROR:", error);

    res.status(500).json({
      message: "Error fetching complaints",
    });
  }
});


// =====================================================
// GET CITIZEN'S COMPLAINTS
// =====================================================
router.get("/citizen/:citizen_id", async (req, res) => {
  try {
    const { citizen_id } = req.params;

    const [rows] = await db.query(
      `SELECT *
       FROM complaints
       WHERE citizen_id = ?
       ORDER BY created_at DESC`,
      [citizen_id]
    );

    res.json(rows);
  } catch (error) {
    console.error("GET CITIZEN COMPLAINTS ERROR:", error);

    res.status(500).json({
      message: "Error fetching citizen complaints",
    });
  }
});


// =====================================================
// POST COMPLAINT FROM CITIZEN
// =====================================================
router.post("/citizen", async (req, res) => {
  try {
    const {
      citizen_id,
      title,
      description,
      category,
      area,
      latitude,
      longitude,
    } = req.body;

    if (!citizen_id || !title || !description) {
      return res.status(400).json({
        message: "Citizen, title and description are required",
      });
    }

    // Check citizen
    const [citizenRows] = await db.query(
      `SELECT id, name, email, area, status
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
        message: "Only active citizens can submit complaints",
      });
    }

    const [result] = await db.query(
      `INSERT INTO complaints
       (
         citizen_id,
         category,
         description,
         location,
         priority,
         status,
         latitude,
         longitude
       )
      VALUES (?, ?, ?, ?, 'Medium', 'Pending', ?, ?)`,
      [
        citizen_id,
        category || "Other",
        `Title: ${title}\n\n${description}`,
        area || citizen.area || "Not provided",
        latitude ?? null,
        longitude ?? null,
      ]
    );

    res.status(201).json({
      message: "Complaint submitted successfully",
      complaintId: result.insertId,
    });

  } catch (error) {
    console.error("CREATE CITIZEN COMPLAINT ERROR:", error);

    res.status(500).json({
      message: error.sqlMessage || error.message || "Error creating complaint",
    });
  }
});


// =====================================================
// UPDATE CITIZEN COMPLAINT
// =====================================================
router.put("/citizen/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      citizen_id,
      title,
      description,
      category,
      area,
    } = req.body;

    if (!citizen_id || !title || !description) {
      return res.status(400).json({
        message: "Citizen, title and description are required",
      });
    }

    // Make sure complaint belongs to citizen
    const [existing] = await db.query(
      `SELECT id
       FROM complaints
       WHERE id = ? AND citizen_id = ?`,
      [id, citizen_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Complaint not found or access denied",
      });
    }

    await db.query(
      `UPDATE complaints
       SET category = ?,
           description = ?,
           location = ?
       WHERE id = ? AND citizen_id = ?`,
      [
        category || "Other",
        `Title: ${title}\n\n${description}`,
        area || "Not provided",
        id,
        citizen_id,
      ]
    );

    res.json({
      message: "Complaint updated successfully",
    });

  } catch (error) {
    console.error("UPDATE CITIZEN COMPLAINT ERROR:", error);

    res.status(500).json({
      message: error.sqlMessage || error.message || "Error updating complaint",
    });
  }
});


// =====================================================
// DELETE CITIZEN COMPLAINT
// =====================================================
router.delete("/citizen/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { citizen_id } = req.body;

    if (!citizen_id) {
      return res.status(400).json({
        message: "Citizen ID is required",
      });
    }

    const [result] = await db.query(
      `DELETE FROM complaints
       WHERE id = ? AND citizen_id = ?`,
      [id, citizen_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Complaint not found or access denied",
      });
    }

    res.json({
      message: "Complaint deleted successfully",
    });

  } catch (error) {
    console.error("DELETE CITIZEN COMPLAINT ERROR:", error);

    res.status(500).json({
      message: error.sqlMessage || error.message || "Error deleting complaint",
    });
  }
});


// =====================================================
// GET SINGLE COMPLAINT
// =====================================================
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT *
       FROM complaints
       WHERE id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    res.json(rows[0]);

  } catch (error) {
    console.error("GET SINGLE COMPLAINT ERROR:", error);

    res.status(500).json({
      message: "Error fetching complaint",
    });
  }
});


// =====================================================
// ADMIN CREATE COMPLAINT
// =====================================================
router.post("/", async (req, res) => {
  try {
    const {
      citizen_id,
      category,
      description,
      location,
      priority,
      status,
      latitude,
      longitude,
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO complaints
       (
         citizen_id,
         category,
         description,
         location,
         priority,
         status,
         latitude,
         longitude
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        citizen_id || null,
        category,
        description,
        location,
        priority || "Medium",
        status || "Pending",
        latitude ?? null,
        longitude ?? null,
      ]
    );

    res.status(201).json({
      message: "Complaint created successfully",
      id: result.insertId,
    });

  } catch (error) {
    console.error("ADMIN CREATE COMPLAINT ERROR:", error);

    res.status(500).json({
      message: error.sqlMessage || error.message || "Error creating complaint",
    });
  }
});


// =====================================================
// ADMIN UPDATE COMPLAINT
// =====================================================
router.put("/:id", async (req, res) => {
  try {
    const {
      category,
      description,
      location,
      priority,
      status,
      latitude,
      longitude,
    } = req.body;

    const [result] = await db.query(
      `UPDATE complaints
       SET category = ?,
           description = ?,
           location = ?,
           priority = ?,
           status = ?,
           latitude = ?,
           longitude = ?
       WHERE id = ?`,
      [
        category,
        description,
        location,
        priority,
        status,
        latitude ?? null,
        longitude ?? null,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    res.json({
      message: "Complaint updated successfully",
    });

  } catch (error) {
    console.error("ADMIN UPDATE COMPLAINT ERROR:", error);

    res.status(500).json({
      message: error.sqlMessage || error.message || "Error updating complaint",
    });
  }
});


// =====================================================
// ADMIN DELETE COMPLAINT
// =====================================================
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.query(
      `DELETE FROM complaints
       WHERE id = ?`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    res.json({
      message: "Complaint deleted successfully",
    });

  } catch (error) {
    console.error("ADMIN DELETE COMPLAINT ERROR:", error);

    res.status(500).json({
      message: "Error deleting complaint",
    });
  }
});


export default router;