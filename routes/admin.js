import express from "express";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

// =========================
// Admin Login
// =========================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email & password required" });

    const adminUser = await Admin.findOne({ email });
    if (!adminUser) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, adminUser.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: adminUser._id, role: adminUser.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, user: adminUser, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =========================
// Get all users (admin)
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find({});
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =========================
// Update user stats (admin)
router.patch("/update-user-stats/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { balance, profit, interest } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (balance != null) user.amount = balance;
    if (profit != null) user.profit = profit;
    if (interest != null) user.interest = interest;

    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =========================
// Get all transactions (deposits & withdrawals)
router.get("/transactions", requireAdmin, async (req, res) => {
  try {
    const users = await User.find({});
    const transactions = [];

    users.forEach(u => {
      if (u.amount > 0) transactions.push({ type: "deposit", user: u, amount: u.amount });
      if (u.outcome > 0) transactions.push({ type: "withdraw", user: u, amount: u.outcome });
    });

    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =========================
// Update withdrawal status
router.patch("/transactions/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.outcomeStatus = status;
    await user.save();

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
