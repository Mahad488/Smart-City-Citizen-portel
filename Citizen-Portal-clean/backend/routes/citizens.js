import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import db from "../config/db.js";
import { authenticate, requireAdmin, JWT_SECRET } from "../auth.js";
import { sendLoginWelcomeEmail, sendPasswordResetEmail } from "../services/emailService.js";

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const ensurePasswordResetsTable = async () => {
  try {
    await db.query(
      `CREATE TABLE IF NOT EXISTS password_resets (
         email VARCHAR(255) NOT NULL PRIMARY KEY,
         token_hash VARCHAR(255) NOT NULL,
         expires_at DATETIME NOT NULL,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       ) ENGINE=InnoDB`
    );
  } catch (err) {
    console.error("Error ensuring password_resets table:", err);
  }
};

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

// GET all citizens (Admin Only - Protects Citizen PII)
router.get("/", authenticate, requireAdmin, (req, res) => {
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


// Citizen statistics (Admin Only)
router.get("/stats/summary", authenticate, requireAdmin, (req, res) => {
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
    const { email, password, rememberMe } = req.body;

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
      await db.query("UPDATE citizens SET status = 'Active' WHERE id = ?", [citizen.id]);
      citizen.status = "Active";
    }

    if (citizen.status === "Inactive") {
      return res.status(403).json({
        message: "Your account has been deactivated by the administrator."
      });
    }

    const userRole = citizen.email?.toLowerCase().startsWith("admin") ? "ADMIN" : "CITIZEN";
    const expiresIn = rememberMe ? "30d" : "7d";

    const token = jwt.sign(
      {
        id: citizen.id,
        citizen_id: citizen.citizen_id,
        email: citizen.email,
        name: citizen.name,
        status: citizen.status,
        role: userRole,
      },
      JWT_SECRET,
      { expiresIn }
    );

    // Send welcome / login notification email asynchronously
    sendLoginWelcomeEmail({
      citizenName: citizen.name,
      citizenEmail: citizen.email,
      loginType: "Standard Portal Login",
    }).catch((emailErr) => {
      console.error("[CITIZEN ROUTE] Error sending login welcome email:", emailErr);
    });

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
        await db.query("UPDATE citizens SET status = 'Active' WHERE id = ?", [citizen.id]);
        citizen.status = "Active";
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

    // Send welcome / login notification email asynchronously
    sendLoginWelcomeEmail({
      citizenName: citizen.name,
      citizenEmail: citizen.email,
      loginType: "Google OAuth Login",
    }).catch((emailErr) => {
      console.error("[CITIZEN ROUTE] Error sending Google login welcome email:", emailErr);
    });

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

// Approve / Activate citizen (Admin only)
router.put("/:id/activate", authenticate, requireAdmin, async (req, res) => {
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

// Deactivate citizen (Admin only)
router.put("/:id/deactivate", authenticate, requireAdmin, async (req, res) => {
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

// GET citizen by ID (Owner or Admin Only)
router.get("/:id", authenticate, (req, res) => {
  const { id } = req.params;

  if (
    req.user.role !== "ADMIN" &&
    String(req.user.id) !== String(id) &&
    req.user.citizen_id !== id
  ) {
    return res.status(403).json({
      message: "You can only view your own citizen profile.",
    });
  }

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
       VALUES (?, ?, ?, ?, ?, ?, 'Active')`,
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
      message: "Registration successful! You can now log in.",
      citizen: {
        id: result.insertId,
        citizen_id: citizenId,
        name,
        email,
        phone,
        area,
        status: "Active",
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
router.post("/", authenticate, requireAdmin, async (req, res) => {
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
      status || "Active"
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


// PUT update citizen (Admin Only)
router.put("/:id", authenticate, requireAdmin, (req, res) => {
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


// DELETE citizen (Admin Only)
router.delete("/:id", authenticate, requireAdmin, (req, res) => {
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

// =====================================================
// FORGOT & RESET PASSWORD
// =====================================================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ message: "A valid email address is required." });
    }

    await ensurePasswordResetsTable();

    const [rows] = await db.query(
      "SELECT id, name, email FROM citizens WHERE email = ?",
      [email.trim().toLowerCase()]
    );

    // Generic response to prevent email enumeration
    if (rows.length === 0) {
      return res.json({
        message: "If that email address is registered, password reset instructions have been sent.",
      });
    }

    const citizen = rows[0];
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await db.query(
      `INSERT INTO password_resets (email, token_hash, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), expires_at = VALUES(expires_at)`,
      [citizen.email, tokenHash, expiresAt]
    );

    const frontendUrl = process.env.FRONTEND_URL || "https://smart-city-citizen-portel-a37g.vercel.app";
    const resetLink = `${frontendUrl.replace(/\/+$/, "")}/citizen-login?resetEmail=${encodeURIComponent(citizen.email)}&resetToken=${encodeURIComponent(rawToken)}`;

    sendPasswordResetEmail({
      citizenName: citizen.name,
      citizenEmail: citizen.email,
      resetToken: rawToken,
      resetLink,
    }).catch((err) => console.error("Error sending reset email:", err));

    res.json({
      message: "If that email address is registered, password reset instructions have been sent.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Failed to process password reset request." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: "Email, token, and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long." });
    }

    await ensurePasswordResetsTable();

    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

    const [resetRows] = await db.query(
      "SELECT * FROM password_resets WHERE email = ? AND token_hash = ?",
      [email.trim().toLowerCase(), tokenHash]
    );

    if (resetRows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired password reset token." });
    }

    const resetRecord = resetRows[0];
    if (new Date(resetRecord.expires_at) < new Date()) {
      await db.query("DELETE FROM password_resets WHERE email = ?", [email.trim().toLowerCase()]);
      return res.status(400).json({ message: "Password reset token has expired. Please request a new one." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      "UPDATE citizens SET password_hash = ? WHERE email = ?",
      [passwordHash, email.trim().toLowerCase()]
    );

    await db.query("DELETE FROM password_resets WHERE email = ?", [email.trim().toLowerCase()]);

    res.json({ message: "Password reset successful! You can now log in with your new password." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Failed to reset password." });
  }
});

export default router;