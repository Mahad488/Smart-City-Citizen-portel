import jwt from "jsonwebtoken";
import process from "node:process";

const JWT_SECRET = process.env.JWT_SECRET || "smart-city-citizen-dev-secret-at-least-32-chars-long";

if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET environment variable is not explicitly set; using fallback secret.");
}

function getCookieToken(cookieHeader) {
  if (typeof cookieHeader !== "string") {
    return null;
  }

  const matchingCookies = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie.startsWith("token="));

  if (matchingCookies.length !== 1) {
    return null;
  }

  try {
    const token = decodeURIComponent(matchingCookies[0].slice("token=".length));
    return token || null;
  } catch {
    return null;
  }
}

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string") {
    if (authHeader.startsWith("Bearer ")) {
      return authHeader.slice("Bearer ".length).trim();
    }
    return null;
  }

  return getCookieToken(req.headers.cookie);
}

export function authenticate(req, res, next) {
  if (req.method === "OPTIONS") {
    return next();
  }

  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      message: "Authentication required. Please log in again.",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || typeof decoded !== "object" || !decoded.email) {
      return res.status(401).json({
        message: "Invalid authentication token payload.",
      });
    }

    const role = decoded.role || (decoded.citizen_id ? "CITIZEN" : "ADMIN");
    if (role !== "CITIZEN" && role !== "ADMIN") {
      return res.status(401).json({
        message: "Invalid or unsupported user role.",
      });
    }

    req.user = {
      id: decoded.id,
      citizen_id: decoded.citizen_id || null,
      email: decoded.email,
      name: decoded.name,
      status: decoded.status,
      role: role,
    };

    next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    return res.status(401).json({
      message: "Your session has expired or is invalid. Please log in again.",
    });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({
      message: "Administrator access required. Access denied.",
    });
  }

  next();
}

export function requireCitizenSelf(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  if (req.user.role === "ADMIN") {
    return next();
  }

  const requestedCitizenId = req.params.citizen_id || req.body?.citizen_id;

  if (!requestedCitizenId) {
    return next();
  }

  if (String(req.user.citizen_id || "").trim() !== String(requestedCitizenId).trim()) {
    return res.status(403).json({
      message: "You can only access your own citizen records.",
    });
  }

  next();
}

export { JWT_SECRET };
