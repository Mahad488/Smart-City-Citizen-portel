import jwt from "jsonwebtoken";
import process from "node:process";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set. Server cannot start securely.");
  process.exit(1);
}

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required. Please log in again.",
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({
      message: "Authentication token is missing.",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || typeof decoded !== "object") {
      return res.status(401).json({
        message: "Invalid authentication token.",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("JWT verification failed:", error);
    return res.status(401).json({
      message: "Your session has expired or is invalid. Please log in again.",
    });
  }
}

export function requireCitizenSelf(req, res, next) {
  const requestedCitizenId = req.params.citizen_id || req.body?.citizen_id;

  if (!requestedCitizenId) {
    return next();
  }

  if (!req.user || req.user.citizen_id !== requestedCitizenId) {
    return res.status(403).json({
      message: "You can only access your own citizen records.",
    });
  }

  next();
}
