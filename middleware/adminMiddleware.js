// middleware/adminMiddleware.js


// middleware/adminMiddleware.js
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

export const requireAdmin = async (req, res, next) => {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;

    if (!token) {
      return res.status(401).json({ msg: "No token provided" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // check if this user exists in Admin collection
    const admin = await Admin.findById(payload.id);
    if (!admin) {
      return res.status(403).json({ msg: "Access denied, not an admin" });
    }

    req.adminId = admin._id;
    next();
  } catch (err) {
    console.error("Admin middleware error:", err.message);
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
};

