// middleware/adminMiddleware.js
export const requireAdmin = (req, res, next) => {
  // Make sure req.userRole is set in requireAuth
  if (!req.userRole || req.userRole !== "admin") {
    return res.status(403).json({ msg: "Admin access required" });
  }
  next();
};
