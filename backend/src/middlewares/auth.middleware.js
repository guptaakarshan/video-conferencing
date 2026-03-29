import httpStatus from "http-status";
import jwt from "jsonwebtoken";

// Keep this in environment variables in production deployments.
const JWT_SECRET = process.env.JWT_SECRET || "replace-this-in-production";

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(httpStatus.UNAUTHORIZED)
      .json({ message: "Authorization token missing" });
  }

  const token = authHeader.slice(7);

  try {
    // Verifies signature and expiry, then injects payload into request context.
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res
      .status(httpStatus.UNAUTHORIZED)
      .json({ message: "Invalid or expired token" });
  }
};
