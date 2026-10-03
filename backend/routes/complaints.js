import express from "express";
import { Buffer } from "node:buffer";
import db from "../config/db.js";
import { requireAdmin } from "../middleware/auth.js";

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

const canAccessComplaint = (req, citizenId) =>
  req.user.role === "ADMIN" || req.user.citizen_id === citizenId;

async function fetchComplaintForAccess(id, req, res) {
  const [rows] = await db.query(
    `SELECT *
     FROM complaints
     WHERE id = ?`,
    [id]
  );

  if (rows.length === 0) {
    res.status(404).json({ message: "Complaint not found" });
    return null;
  }

  if (!canAccessComplaint(req, rows[0].citizen_id)) {
    res.status(403).json({
      message: "You can only access your own complaints.",
    });
    return null;
  }

  return rows[0];
}


// =====================================================
// GET ALL COMPLAINTS - ADMIN
// =====================================================
router.get("/", requireAdmin, async (req, res) => {
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
async function getMyComplaints(req, res) {
  if (req.user.role !== "CITIZEN") {
    return res.status(403).json({
      message: "Citizen access is required.",
    });
  }

  try {
    const [rows] = await db.query(
      `SELECT *
       FROM complaints
       WHERE citizen_id = ?
       ORDER BY created_at DESC`,
      [req.user.citizen_id]
    );

    return res.json(rows);
  } catch (error) {
    console.error("GET CITIZEN COMPLAINTS ERROR:", error);

    return res.status(500).json({
      message: "Error fetching citizen complaints",
    });
  }
}

router.get("/me", getMyComplaints);
router.get("/citizen/:citizen_id", (req, res) => {
  if (
    req.user.role !== "CITIZEN" ||
    req.user.citizen_id !== req.params.citizen_id
  ) {
    return res.status(403).json({
      message: "You can only view your own complaints.",
    });
  }

  return getMyComplaints(req, res);
});


// =====================================================
// POST COMPLAINT FROM CITIZEN
// =====================================================
router.post("/citizen", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      area,
      latitude,
      longitude,
      photo,
    } = req.body;
    const { citizen_id } = req.user;

    if (req.user.role !== "CITIZEN") {
      return res.status(403).json({
        message: "Citizen access is required.",
      });
    }

    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required",
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
      title,
      description,
      category,
      area,
    } = req.body;
    const { citizen_id } = req.user;

    if (req.user.role !== "CITIZEN") {
      return res.status(403).json({
        message: "Citizen access is required.",
      });
    }

    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required",
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
router.delete("/citizen/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== "CITIZEN") {
      return res.status(403).json({
        message: "Citizen access is required.",
      });
    }
    const { citizen_id } = req.user;

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
router.get("/:id/attachment", async (req, res) => {
  try {
    const complaintId = Number(req.params.id);
    const complaint = await fetchComplaintForAccess(complaintId, req, res);
    if (!complaint) {
      return;
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

router.get("/:id", async (req, res) => {
  try {
    const complaint = await fetchComplaintForAccess(req.params.id, req, res);
    if (!complaint) {
      return;
    }

    res.json(complaint);

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
router.post("/", requireAdmin, async (req, res) => {
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
    const { citizen_id } = req.user;

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
    const complaint = await fetchComplaintForAccess(req.params.id, req, res);
    if (!complaint) {
      return;
    }

    const {
      category,
      description,
      location,
      priority,
      status,
      latitude,
      longitude,
    } = req.body;

    if (req.user.role !== "ADMIN") {
      const [result] = await db.query(
        `UPDATE complaints
         SET category = ?,
             description = ?,
             location = ?
         WHERE id = ? AND citizen_id = ?`,
        [
          category,
          description,
          location,
          req.params.id,
          req.user.citizen_id,
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Complaint not found",
        });
      }

      return res.json({
        message: "Complaint updated successfully",
      });
    }

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
    const complaint = await fetchComplaintForAccess(req.params.id, req, res);
    if (!complaint) {
      return;
    }

    await ensureComplaintAttachmentsTable();
    const [result] = req.user.role === "ADMIN"
      ? await db.query(
        `DELETE FROM complaints
         WHERE id = ?`,
        [req.params.id]
      )
      : await db.query(
        `DELETE FROM complaints
         WHERE id = ? AND citizen_id = ?`,
        [req.params.id, req.user.citizen_id]
      );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    await db.query(
      `DELETE FROM complaint_attachments
       WHERE complaint_id = ?`,
      [req.params.id]
    );

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