// routes/admin.js
import express from "express";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import jwt from "jsonwebtoken";

const router = express.Router();



// Admin login





router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(401).json({ message: "Invalid email or password" });

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

  // create token
  const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.json({ success: true, token, role: admin.role, email: admin.email, name: admin.name });
});






/

// --- Middleware to check admin token ---
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    req.adminId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// --- Get all users ---
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password"); // exclude password
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// --- Update user stats ---
router.patch("/update-user-stats/:id", requireAdmin, async (req, res) => {
  const { balance, profit, interest } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (balance != null) user.amount = balance;
    if (profit != null) user.profit = profit;
    if (interest != null) user.interest = interest;

    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
