import express from "express";
import { Buffer } from "node:buffer";
import db from "../config/db.js";
import { authenticate } from "../auth.js";
import { sendComplaintConfirmationEmail } from "../services/emailService.js";

const router = express.Router();

const ensureComplaintAttachmentsTable = () =>
  db.query(
    `CREATE TABLE IF NOT EXISTS complaint_attachments (
       complaint_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
       mime_type VARCHAR(32) NOT NULL,
       photo_data MEDIUMBLOB NOT NULL,
       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     ) ENGINE=InnoDB`
  );


// =====================================================
// GET ALL COMPLAINTS - ADMIN
// =====================================================
router.get("/", authenticate, async (req, res) => {
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
router.get("/citizen/:citizen_id", authenticate, async (req, res) => {
  try {
    const { citizen_id } = req.params;

    if (req.user.citizen_id !== citizen_id) {
      return res.status(403).json({
        message: "You can only view your own complaints.",
      });
    }

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
router.post("/citizen", authenticate, async (req, res) => {
  try {
    const {
      citizen_id,
      title,
      description,
      category,
      area,
      latitude,
      longitude,
      photo,
    } = req.body;

    if (!citizen_id || !title || !description) {
      return res.status(400).json({
        message: "Citizen, title and description are required",
      });
    }

    if (req.user.citizen_id !== citizen_id) {
      return res.status(403).json({
        message: "You can only create complaints for your own account.",
      });
    }

    let photoBuffer = null;
    let photoMimeType = null;

    if (photo != null) {
      const photoMatch =
        typeof photo === "string" &&
        /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/]+={0,2})$/.exec(photo);

      if (!photoMatch) {
        return res.status(400).json({
          message: "Photo must be a valid JPG or PNG image.",
        });
      }

      photoMimeType = photoMatch[1];
      photoBuffer = Buffer.from(photoMatch[2], "base64");

      const isPng =
        photoMimeType === "image/png" &&
        photoBuffer.subarray(0, 8).equals(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        );
      const isJpeg =
        photoMimeType === "image/jpeg" &&
        photoBuffer[0] === 0xff &&
        photoBuffer[1] === 0xd8 &&
        photoBuffer[2] === 0xff;

      if (!isPng && !isJpeg) {
        return res.status(400).json({
          message: "Photo content is not a valid JPG or PNG image.",
        });
      }

      if (photoBuffer.length > 5 * 1024 * 1024) {
        return res.status(413).json({
          message: "Photo must be 5 MB or smaller.",
        });
      }
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

    if (photoBuffer) {
      await ensureComplaintAttachmentsTable();
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

    if (photoBuffer && photoMimeType) {
      try {
        await db.query(
          `INSERT INTO complaint_attachments (complaint_id, mime_type, photo_data)
           VALUES (?, ?, ?)` ,
          [result.insertId, photoMimeType, photoBuffer]
        );
      } catch (error) {
        await db.query("DELETE FROM complaints WHERE id = ?", [result.insertId]);
        throw error;
      }
    }

    // Send confirmation email asynchronously without blocking response
    sendComplaintConfirmationEmail({
      citizenName: citizen.name,
      citizenEmail: citizen.email,
      complaintId: result.insertId,
      title: title,
      category: category || "Other",
      area: area || citizen.area || "Not provided",
    }).catch((emailErr) => {
      console.error("[COMPLAINT ROUTE] Error sending complaint confirmation email:", emailErr);
    });

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
router.put("/citizen/:id", authenticate, async (req, res) => {
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

    if (req.user.citizen_id !== citizen_id) {
      return res.status(403).json({
        message: "You can only update your own complaints.",
      });
    }

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
        message: "You can only delete your own complaints.",
      });
    }

    await ensureComplaintAttachmentsTable();
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

    await db.query(
      `DELETE FROM complaint_attachments WHERE complaint_id = ?`,
      [id]
    );

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
router.get("/:id/attachment", authenticate, async (req, res) => {
  try {
    const complaintId = Number(req.params.id);
    const [complaintRows] = await db.query(
      `SELECT citizen_id FROM complaints WHERE id = ?`,
      [complaintId]
    );

    if (complaintRows.length === 0) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (req.user.citizen_id !== complaintRows[0].citizen_id) {
      return res.status(403).json({
        message: "You can only access your own complaint photo.",
      });
    }

    await ensureComplaintAttachmentsTable();
    const [rows] = await db.query(
      `SELECT mime_type, photo_data
       FROM complaint_attachments
       WHERE complaint_id = ?`,
      [complaintId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Complaint photo not found" });
    }

    res.set("Content-Type", rows[0].mime_type);
    res.set("Cache-Control", "private, no-store");
    res.set("X-Content-Type-Options", "nosniff");
    res.send(rows[0].photo_data);
  } catch (error) {
    console.error("GET COMPLAINT PHOTO ERROR:", error);

    res.status(500).json({
      message: "Error fetching complaint photo",
    });
  }
});

router.get("/:id", authenticate, async (req, res) => {
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

    if (req.user.citizen_id !== rows[0].citizen_id) {
      return res.status(403).json({
        message: "This complaint does not belong to your account.",
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
router.post("/", authenticate, async (req, res) => {
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
router.put("/:id", authenticate, async (req, res) => {
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
router.delete("/:id", authenticate, async (req, res) => {
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