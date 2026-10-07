import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import db from "../config/db.js";
import { authenticate } from "../auth.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "smart-city-citizen-dev-secret";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const generateCitizenId = async () => {
  try {
    const [rows] = await db.query(
      `SELECT citizen_id
       FROM citizens
       WHERE citizen_id LIKE 'CIT-%'
       ORDER BY CAST(SUBSTRING(citizen_id, 5) AS UNSIGNED) DESC, id DESC
       LIMIT 1`
    );

    const lastCitizenId = rows?.[0]?.citizen_id;

    if (!lastCitizenId) {
      return "CIT-10001";
    }

    const match = String(lastCitizenId).match(/(\d+)$/);
    const lastNumber = match ? Number(match[1]) : 10000;

    return `CIT-${lastNumber + 1}`;
  } catch (error) {
    console.error("Error generating citizen ID:", error);
    return `CIT-${Date.now()}`;
  }
};

// GET all citizens
router.get("/", authenticate, (req, res) => {
  const sql = `
    SELECT
      id,
      citizen_id,
      name,
      email,
      phone,
      area,
      registered_at,
      status
    FROM citizens
    ORDER BY registered_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching citizens:", err);
      return res.status(500).json({
        message: "Failed to fetch citizens"
      });
    }

    res.json(results);
  });
});


// Citizen statistics
router.get("/stats/summary", authenticate, (req, res) => {
  const sql = `
    SELECT
      COUNT(*) AS total,
      SUM(status = 'Active') AS active,
      SUM(status = 'Pending') AS pending,
      SUM(status = 'Inactive') AS inactive
    FROM citizens
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching citizen stats:", err);

      return res.status(500).json({
        message: "Failed to fetch citizen statistics"
      });
    }

    res.json(results[0]);
  });
});


// POST citizen login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const [rows] = await db.query(
      `SELECT
        id,
        citizen_id,
        name,
        email,
        password_hash,
        phone,
        area,
        registered_at,
        status
       FROM citizens
       WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const citizen = rows[0];

    const passwordMatch = await bcrypt.compare(password, citizen.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    if (citizen.status === "Pending") {
      return res.status(403).json({
        message: "Your account is waiting for admin approval."
      });
    }

    if (citizen.status === "Inactive") {
      return res.status(403).json({
        message: "Your account has been deactivated by the administrator."
      });
    }

    const token = jwt.sign(
      {
        id: citizen.id,
        citizen_id: citizen.citizen_id,
        email: citizen.email,
        name: citizen.name,
        status: citizen.status,
        role: "CITIZEN",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      citizen: {
        id: citizen.id,
        citizen_id: citizen.citizen_id,
        name: citizen.name,
        email: citizen.email,
        phone: citizen.phone,
        area: citizen.area,
        registered_at: citizen.registered_at,
        status: citizen.status,
      },
    });
  } catch (error) {
    console.error("Citizen login error:", error);

    res.status(500).json({
      message: "Login failed"
    });
  }
});

// POST google login
router.post(["/google-login", "/google"], async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Google ID token is required" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name } = payload;

    if (!email) {
      return res.status(400).json({ message: "Email is missing from Google account" });
    }

    let [rows] = await db.query(
      `SELECT
        id, citizen_id, name, email, phone, area, registered_at, status
       FROM citizens
       WHERE email = ?`,
      [email]
    );

    let citizen;

    if (rows.length === 0) {
      // Auto-register citizen if they don't exist
      const citizen_id = await generateCitizenId();
      // Create a dummy strong password for OAuth users
      const dummyPassword = await bcrypt.hash(Math.random().toString(36).slice(-8) + Date.now(), 10);
      
      const [result] = await db.query(
        `INSERT INTO citizens
         (citizen_id, name, email, password_hash, status)
         VALUES (?, ?, ?, ?, 'Active')`, // Auto-activate OAuth accounts
        [citizen_id, name, email, dummyPassword]
      );

      citizen = {
        id: result.insertId,
        citizen_id,
        name,
        email,
        phone: null,
        area: null,
        status: "Active"
      };
    } else {
      citizen = rows[0];

      if (citizen.status === "Pending") {
        return res.status(403).json({ message: "Your account is waiting for admin approval." });
      }

      if (citizen.status === "Inactive") {
        return res.status(403).json({ message: "Your account has been deactivated by the administrator." });
      }
    }

    const jwtToken = jwt.sign(
      {
        id: citizen.id,
        citizen_id: citizen.citizen_id,
        email: citizen.email,
        name: citizen.name,
        status: citizen.status,
        role: "CITIZEN",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token: jwtToken,
      citizen,
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({ message: "Google login failed" });
  }
});

// Approve / Activate citizen
router.put("/:id/activate", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "UPDATE citizens SET status = 'Active' WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Citizen not found"
      });
    }

    res.json({
      message: "Citizen activated successfully"
    });
  } catch (error) {
    console.error("Activate citizen error:", error);

    res.status(500).json({
      message: "Failed to activate citizen"
    });
  }
});

// Deactivate citizen
router.put("/:id/deactivate", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "UPDATE citizens SET status = 'Inactive' WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Citizen not found"
      });
    }

    res.json({
      message: "Citizen deactivated successfully"
    });
  } catch (error) {
    console.error("Deactivate citizen error:", error);

    res.status(500).json({
      message: "Failed to deactivate citizen"
    });
  }
});

// GET current citizen profile
router.get("/me", authenticate, async (req, res) => {
  try {
    const citizen_id = req.user.citizen_id;
    const numericId = Number(req.user.id);
    const whereClause = citizen_id ? "citizen_id = ?" : "id = ?";
    const whereParam = citizen_id || numericId;

    const [rows] = await db.query(
      `SELECT id, citizen_id, name, email, phone, area, registered_at, status
       FROM citizens
       WHERE ${whereClause}`,
      [whereParam]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Citizen not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching current citizen:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// PUT update current citizen profile
router.put("/me", authenticate, async (req, res) => {
  try {
    const citizen_id = req.user.citizen_id;
    const numericId = Number(req.user.id);
    const whereClause = citizen_id ? "citizen_id = ?" : "id = ?";
    const whereParam = citizen_id || numericId;

    const { name, phone, area, address } = req.body;
    const chosenArea = area || address || null;

    await db.query(
      `UPDATE citizens
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           area = COALESCE(?, area)
       WHERE ${whereClause}`,
      [name || null, phone || null, chosenArea, whereParam]
    );

    const [rows] = await db.query(
      `SELECT id, citizen_id, name, email, phone, area, registered_at, status
       FROM citizens
       WHERE ${whereClause}`,
      [whereParam]
    );

    res.json({
      message: "Profile updated successfully",
      citizen: rows[0],
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// PUT update current citizen password
router.put("/me/password", authenticate, async (req, res) => {
  try {
    const citizen_id = req.user.citizen_id;
    const numericId = Number(req.user.id);
    const whereClause = citizen_id ? "citizen_id = ?" : "id = ?";
    const whereParam = citizen_id || numericId;

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const [rows] = await db.query(
      `SELECT id, password_hash FROM citizens WHERE ${whereClause}`,
      [whereParam]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Citizen not found" });
    }

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query(`UPDATE citizens SET password_hash = ? WHERE id = ?`, [newHash, rows[0].id]);

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Failed to update password" });
  }
});

// GET citizen by ID
router.get("/:id", authenticate, (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      id,
      citizen_id,
      name,
      email,
      phone,
      area,
      registered_at,
      status
    FROM citizens
    WHERE id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error fetching citizen:", err);
      return res.status(500).json({
        message: "Failed to fetch citizen"
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Citizen not found"
      });
    }

    res.json(results[0]);
  });
});


// POST register new citizen
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, area } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const [existing] = await db.query(
      "SELECT id FROM citizens WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    const [lastCitizen] = await db.query(
      `SELECT citizen_id
       FROM citizens
       WHERE citizen_id LIKE 'CIT-%'
       ORDER BY id DESC
       LIMIT 1`
    );

    let nextNumber = 10001;

    if (lastCitizen.length > 0) {
      const lastId = parseInt(
        lastCitizen[0].citizen_id.replace("CIT-", ""),
        10
      );

      if (!isNaN(lastId)) {
        nextNumber = lastId + 1;
      }
    }

    const citizenId = `CIT-${nextNumber}`;

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO citizens
       (citizen_id, name, email, password_hash, phone, area, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        citizenId,
        name,
        email,
        passwordHash,
        phone || null,
        area || null,
      ]
    );

    res.status(201).json({
      message: "Registration successful. Waiting for admin approval.",
      citizen: {
        id: result.insertId,
        citizen_id: citizenId,
        name,
        email,
        phone,
        area,
        status: "Pending",
      },
    });
  } catch (error) {
    console.error("Citizen registration error:", error);

    res.status(500).json({
      message: "Server error during registration",
    });
  }
});

// POST admin creates citizen
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      area,
      status
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        message: "Name and email are required"
      });
    }

    const citizen_id = req.body.citizen_id || await generateCitizenId();

    const [existing] = await db.query(
      "SELECT id FROM citizens WHERE citizen_id = ? OR email = ?",
      [citizen_id, email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "Citizen ID or email already exists"
      });
    }

    const sql = `
      INSERT INTO citizens
      (citizen_id, name, email, phone, area, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(sql, [
      citizen_id,
      name,
      email,
      phone || null,
      area || null,
      status || "Pending"
    ]);

    res.status(201).json({
      message: "Citizen created successfully",
      id: result.insertId,
      citizen_id
    });
  } catch (error) {
    console.error("Error creating citizen:", error);

    return res.status(500).json({
      message: "Failed to create citizen"
    });
  }
});


// PUT update citizen
router.put("/:id", authenticate, (req, res) => {
  const { id } = req.params;

  const {
    name,
    email,
    phone,
    area,
    status
  } = req.body;

  const sql = `
    UPDATE citizens
    SET
      name = ?,
      email = ?,
      phone = ?,
      area = ?,
      status = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      name,
      email,
      phone || null,
      area || null,
      status,
      id
    ],
    (err) => {
      if (err) {
        console.error("Error updating citizen:", err);

        return res.status(500).json({
          message: "Failed to update citizen"
        });
      }

      res.json({
        message: "Citizen updated successfully"
      });
    }
  );
});


// DELETE citizen
router.delete("/:id", authenticate, (req, res) => {
  const { id } = req.params;

  const sql = `
    DELETE FROM citizens
    WHERE id = ?
  `;

  db.query(sql, [id], (err) => {
    if (err) {
      console.error("Error deleting citizen:", err);

      return res.status(500).json({
        message: "Failed to delete citizen"
      });
    }

    res.json({
      message: "Citizen deleted successfully"
    });
  });
});

export default router;