import "dotenv/config";
import { Buffer } from "node:buffer";
import jwt from "jsonwebtoken";
import process from "node:process";

const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_COOKIE_NAME = "token";
const JWT_ISSUER = "citizen-portal";
const JWT_AUDIENCE = "citizen-portal-api";

if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET, "utf8") < 32) {
  throw new Error("JWT_SECRET must be configured with at least 32 bytes.");
}

function unauthorized(res) {
  return res.status(401).json({
    message: "Authentication required. Please log in again.",
  });
}

function getCookieToken(cookieHeader) {
  if (typeof cookieHeader !== "string") {
    return null;
  }

  const matchingCookies = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`));

  if (matchingCookies.length !== 1) {
    return null;
  }

  try {
    const token = decodeURIComponent(
      matchingCookies[0].slice(AUTH_COOKIE_NAME.length + 1)
    );
    return token || null;
  } catch {
    return null;
  }
}

function getToken(req) {
  const authorization = req.headers.authorization;

  if (authorization !== undefined) {
    if (typeof authorization !== "string") {
      return null;
    }

    const match = /^Bearer\s+(\S+)$/i.exec(authorization);
    return match?.[1] || null;
  }

  return getCookieToken(req.headers.cookie);
}

export function authenticateToken(req, res, next) {
  if (
    req.method === "OPTIONS" ||
    req.path.includes("/login") ||
    req.path.includes("/register")
  ) {
    return next();
  }

  const token = getToken(req);

  if (!token) {
    return unauthorized(res);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return unauthorized(res);
  }

  if (
    !decoded ||
    typeof decoded !== "object" ||
    typeof decoded.email !== "string" ||
    decoded.email.trim().length === 0
  ) {
    return unauthorized(res);
  }

  const role = decoded.role || (decoded.citizen_id ? "CITIZEN" : "ADMIN");
  if (role !== "CITIZEN" && role !== "ADMIN") {
    return unauthorized(res);
  }

  const user = {
    citizen_id: decoded.citizen_id || null,
    email: decoded.email,
    role: role,
  };
  if (decoded.id !== undefined) user.id = decoded.id;
  if (decoded.name !== undefined) user.name = decoded.name;

  req.user = user;

  return next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({
      message: "Administrator access is required.",
    });
  }

  return next();
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export { JWT_SECRET };
