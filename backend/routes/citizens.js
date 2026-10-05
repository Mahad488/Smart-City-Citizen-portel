import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Buffer } from "node:buffer";
import process from "node:process";
import { OAuth2Client } from "google-auth-library";
import db from "../config/db.js";
import {
  JWT_SECRET,
  requireAdmin,
  setAuthCookie,
} from "../middleware/auth.js";

const router = express.Router();

const googleClient = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

const createCitizenToken = (citizen) => {
  return jwt.sign(
    {
      id: citizen.id,
      citizen_id: citizen.citizen_id,
      email: citizen.email,
      role: "CITIZEN",
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
      algorithm: "HS256",
      issuer: "citizen-portal",
      audience: "citizen-portal-api",
    }
  );
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

// GET all citizens
router.get("/", requireAdmin, (req, res) => {
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
router.get("/stats/summary", requireAdmin, (req, res) => {
  const sql = `
    SELECT
      COUNT(*) AS total,
      SUM(status = 'Active') AS active,
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

    if (!citizen.password_hash) {
      return res.status(401).json({
        message:
          "This account uses Google Sign-In. Please continue with Google.",
      });
    }

    const passwordMatch = await bcrypt.compare(password, citizen.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    if (citizen.status === "Inactive") {
      return res.status(403).json({
        message: "Your account has been deactivated by the administrator."
      });
    }

    const token = createCitizenToken(citizen);

    setAuthCookie(res, token);
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
        role: "CITIZEN",
      },
    });
  } catch (error) {
    console.error("Citizen login error:", error);

    res.status(500).json({
      message: "Login failed"
    });
  }
});

// POST Google citizen login
router.post("/google", async (req, res) => {
  const { credential, intent } = req.body ?? {};

  if (typeof credential !== "string" || !credential.trim()) {
    return res.status(400).json({
      message: "Google credential is required.",
    });
  }

  if (intent !== "register" && intent !== "login") {
    return res.status(400).json({
      message: "Google authentication intent must be login or register.",
    });
  }

  if (!process.env.VITE_GOOGLE_CLIENT_ID) {
    console.error("VITE_GOOGLE_CLIENT_ID is not configured.");
    return res.status(503).json({
      message: "Google authentication is not configured.",
    });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.VITE_GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (error) {
    console.error("Google ID token verification failed:", error);
    return res.status(401).json({
      message: "Google authentication failed.",
    });
  }

  if (!payload) {
    return res.status(401).json({
      message: "Invalid Google authentication token.",
    });
  }

  const { sub: googleId, email, name } = payload;
  if (
    typeof googleId !== "string" ||
    typeof email !== "string" ||
    typeof name !== "string"
  ) {
    return res.status(401).json({
      message: "Google account information is incomplete.",
    });
  }

  if (payload.email_verified !== true) {
    return res.status(401).json({
      message: "Google email address is not verified.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();

  if (!normalizedEmail || !normalizedName) {
    return res.status(401).json({
      message: "Google account information is incomplete.",
    });
  }

  try {
    const citizenFields = `
      id,
      citizen_id,
      name,
      email,
      google_id,
      password_hash,
      phone,
      area,
      registered_at,
      status
    `;

    const [googleMatches] = await db.query(
      `SELECT ${citizenFields}
       FROM citizens
       WHERE google_id = ?
       LIMIT 1`,
      [googleId]
    );

    let citizen = googleMatches[0];

    if (!citizen) {
      const [emailMatches] = await db.query(
        `SELECT ${citizenFields}
         FROM citizens
         WHERE email = ?
         LIMIT 1`,
        [normalizedEmail]
      );
      citizen = emailMatches[0];
    }

    if (intent === "register" && citizen) {
      return res.status(409).json({
        message:
          "Email already registered. Please continue with Google from the login page.",
      });
    }

    if (intent === "login" && !citizen) {
      return res.status(404).json({
        message: "No account found. Please register with Google first.",
      });
    }

    if (citizen) {
      if (citizen.status === "Inactive") {
        return res.status(403).json({
          message:
            "Your account has been deactivated by the administrator.",
        });
      }

      if (citizen.google_id && citizen.google_id !== googleId) {
        return res.status(409).json({
          message:
            "This email is already linked to another Google account.",
        });
      }

      if (!citizen.google_id) {
        await db.query(
          `UPDATE citizens
           SET google_id = ?
           WHERE id = ?`,
          [googleId, citizen.id]
        );
        citizen.google_id = googleId;
      }
    } else {
      const citizenId = await generateCitizenId();
      const [result] = await db.query(
        `INSERT INTO citizens
         (
           citizen_id,
           name,
           email,
           google_id,
           password_hash,
           phone,
           area,
           status
         )
         VALUES (?, ?, ?, ?, NULL, NULL, NULL, 'Active')`,
        [citizenId, normalizedName, normalizedEmail, googleId]
      );

      citizen = {
        id: result.insertId,
        citizen_id: citizenId,
        name: normalizedName,
        email: normalizedEmail,
        google_id: googleId,
        phone: null,
        area: null,
        registered_at: new Date(),
        status: "Active",
      };
    }

    if (intent === "register") {
      return res.status(201).json({
        message:
          "Google account created successfully. Please continue with Google from the login tab.",
      });
    }

    const token = createCitizenToken(citizen);
    setAuthCookie(res, token);

    return res.json({
      message: "Google login successful.",
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
        role: "CITIZEN",
      },
    });
  } catch (error) {
    console.error("Google citizen authentication error:", error);
    return res.status(500).json({
      message: "Google authentication could not be completed.",
    });
  }
});

router.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({
      message: "Email and password are required.",
    });
  }

  if (
    !adminEmail ||
    !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(adminPasswordHash || "")
  ) {
    console.error("Admin login is unavailable: ADMIN_EMAIL and ADMIN_PASSWORD_HASH must be configured.");
    return res.status(503).json({
      message: "Administrator login is not configured.",
    });
  }

  if (Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({
      message: "Password must be 72 bytes or fewer.",
    });
  }

  try {
    const passwordMatches = await bcrypt.compare(password, adminPasswordHash);
    if (
      !passwordMatches ||
      email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()
    ) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const normalizedEmail = adminEmail.trim().toLowerCase();
    const token = jwt.sign(
      {
        citizen_id: null,
        email: normalizedEmail,
        role: "ADMIN",
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
        algorithm: "HS256",
        issuer: "citizen-portal",
        audience: "citizen-portal-api",
      }
    );

    setAuthCookie(res, token);
    return res.json({
      message: "Administrator login successful.",
      token,
      user: {
        citizen_id: null,
        email: normalizedEmail,
        role: "ADMIN",
      },
    });
  } catch (error) {
    console.error("Administrator login error:", error);
    return res.status(500).json({
      message: "Administrator login failed.",
    });
  }
});

router.put("/me", async (req, res) => {
  if (req.user.role !== "CITIZEN") {
    return res.status(403).json({
      message: "Citizen access is required.",
    });
  }

  const { name, phone, address } = req.body;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 255 ||
    typeof phone !== "string" ||
    typeof address !== "string"
  ) {
    return res.status(400).json({
      message: "A valid name, phone number, and address are required.",
    });
  }

  const normalizedPhone = phone.trim();
  const normalizedAddress = address.trim();

  if (
    (normalizedPhone && normalizedPhone.length > 32) ||
    (normalizedAddress && normalizedAddress.length > 255)
  ) {
    return res.status(400).json({
      message: "Phone number or address is too long.",
    });
  }

  try {
    await db.query(
      `UPDATE citizens
       SET name = ?, phone = ?, area = ?
       WHERE citizen_id = ?`,
      [
        name.trim(),
        normalizedPhone,
        normalizedAddress,
        req.user.citizen_id,
      ]
    );

    const [rows] = await db.query(
      `SELECT citizen_id, name, email, phone, area
       FROM citizens
       WHERE citizen_id = ?`,
      [req.user.citizen_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Citizen profile not found.",
      });
    }

    return res.json({
      message: "Profile updated successfully.",
      citizen: rows[0],
    });
  } catch (error) {
    console.error("Citizen profile update error:", error);
    return res.status(500).json({
      message: "Failed to update profile.",
    });
  }
});

router.put("/me/password", async (req, res) => {
  if (req.user.role !== "CITIZEN") {
    return res.status(403).json({
      message: "Citizen access is required.",
    });
  }

  const { currentPassword, newPassword } = req.body;
  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string"
  ) {
    return res.status(400).json({
      message: "Current password and new password are required.",
    });
  }

  if (
    Buffer.byteLength(currentPassword, "utf8") > 72 ||
    newPassword.length < 6 ||
    Buffer.byteLength(newPassword, "utf8") > 72
  ) {
    return res.status(400).json({
      message: "New password must be at least 6 characters and no more than 72 bytes.",
    });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({
      message: "New password must be different from the current password.",
    });
  }

  try {
    const [rows] = await db.query(
      `SELECT password_hash
       FROM citizens
       WHERE citizen_id = ?`,
      [req.user.citizen_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Citizen account not found.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      rows[0].password_hash
    );
    if (!passwordMatches) {
      return res.status(400).json({
        message: "Current password is incorrect.",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.query(
      `UPDATE citizens
       SET password_hash = ?
       WHERE citizen_id = ?`,
      [passwordHash, req.user.citizen_id]
    );

    return res.json({
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Citizen password update error:", error);
    return res.status(500).json({
      message: "Failed to change password.",
    });
  }
});

// Approve / Activate citizen
router.put("/:id/activate", requireAdmin, async (req, res) => {
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
router.put("/:id/deactivate", requireAdmin, async (req, res) => {
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

// GET citizen by ID
router.get("/:id", (req, res) => {
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

    if (
      req.user.role !== "ADMIN" &&
      req.user.citizen_id !== results[0].citizen_id
    ) {
      return res.status(403).json({
        message: "You can only view your own citizen profile."
      });
    }

    res.json(results[0]);
  });
});


// POST register new citizen
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, area } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (
      password.length < 6 ||
      !/[A-Z]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters and include an uppercase letter and a special character.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existing] = await db.query(
      "SELECT id FROM citizens WHERE email = ?",
      [normalizedEmail]
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
        name.trim(),
        normalizedEmail,
        passwordHash,
        phone || null,
        area || null,
      ]
    );

    res.status(201).json({
      message: "Registration successful. Your account is now active.",
      citizen: {
        id: result.insertId,
        citizen_id: citizenId,
        name: name.trim(),
        email: normalizedEmail,
        phone,
        area,
        status: "Active",
      },
    });
  } catch (error) {
    console.error("Citizen registration error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    res.status(500).json({
      message: "Server error during registration",
    });
  }
});

// POST admin creates citizen
router.post("/", requireAdmin, async (req, res) => {
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


// PUT update citizen
router.put("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;

  const {
    name,
    email,
    phone,
    area,
    status
  } = req.body;

  if (status !== "Active" && status !== "Inactive") {
    return res.status(400).json({
      message: "Status must be Active or Inactive"
    });
  }

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
router.delete("/:id", requireAdmin, (req, res) => {
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