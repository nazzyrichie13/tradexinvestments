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






// PATCH /api/admin/update-user-stats/:id
router.patch("/update-user-stats/:id", requireAdmin, async (req, res) => {
  const { balance, profit, interest } = req.body;
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { balance, profit, interest }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User stats updated", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
