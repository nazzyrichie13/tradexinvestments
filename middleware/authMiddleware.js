// middleware/authMiddleware.js

import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ msg: "No token provided" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;
    req.userRole = payload.role; // ⚡ important for admin routes
    next();
  } catch (e) {
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
};


