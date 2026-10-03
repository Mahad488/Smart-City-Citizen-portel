export {
  JWT_SECRET,
  authenticateToken as authenticate,
} from "./middleware/auth.js";

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
