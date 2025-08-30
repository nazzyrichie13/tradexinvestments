import express from "express";
import User from "../models/User.js";
import { verifyToken } from "../routes/auth.js";
 

const router = express.Router();

// ✅ Notice: no extra "/admin" here
router.post("/user/:id/investments", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method, date } = req.body;

    if (amount == null || !method) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.investments.push({ amount, method, date: date || Date.now() });
    await user.save();

    res.json({ success: true, message: "Investment added", investments: user.investments });
  } catch (err) {
    console.error("Add investment error:", err);
    res.status(500).json({ success: false, message: "Failed to add investment" });
  }
});

export default router;
