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
  const token = getToken(req);

  if (!token) {
    return unauthorized(res);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch {
    return unauthorized(res);
  }

  if (
    !decoded ||
    typeof decoded !== "object" ||
    typeof decoded.email !== "string" ||
    decoded.email.trim().length === 0 ||
    !Number.isInteger(decoded.exp) ||
    decoded.exp <= Math.floor(Date.now() / 1000) ||
    !["ADMIN", "CITIZEN"].includes(decoded.role) ||
    (decoded.role === "ADMIN" && decoded.citizen_id !== null) ||
    (decoded.role === "CITIZEN" &&
      (typeof decoded.citizen_id !== "string" ||
        decoded.citizen_id.length === 0))
  ) {
    return unauthorized(res);
  }

  req.user = {
    citizen_id: decoded.citizen_id,
    email: decoded.email,
    role: decoded.role,
  };

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
