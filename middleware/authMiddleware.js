// middleware/authMiddleware.js

// middleware/auth.js

import Admin from "../models/Admin.js";
import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ msg: "No token provided" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;
    req.isAdmin = payload.isAdmin || false; // ✅ comes from token
    next();
  } catch (e) {
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
};

// for admin-only routes
export const requireAdmin = (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({ msg: "Admins only" });
  }
  next();
};
