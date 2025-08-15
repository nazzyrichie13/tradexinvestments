// routes/admin.js
import express from "express";
import User from "../models/User.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

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
