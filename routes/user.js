import express from "express";
import User from "./models/User.js";
import Investment from "./models/Investment.js";
import Withdrawal from "./models/Withdrawal.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
/**
 * GET /api/user/me
 * Returns: { name, email, photo, stats: { investment, profit, interest, available }, withdrawals: [...] }
 * "interest" here is just profit for simplicity; customize if you calculate interest separately.
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("name email photo");
    if (!user) return res.status(404).json({ msg: "User not found" });

    const inv = await Investment.find({ userId: req.userId, status: "active" });
    const totalPrincipal = inv.reduce((s, x) => s + x.principal, 0);
    const totalProfit = inv.reduce((s, x) => s + x.profit, 0);

    // Available = principal + profit - pending withdrawals
    const pending = await Withdrawal.aggregate([
      { $match: { userId: user._id, status: "pending" } },
      { $group: { _id: null, amt: { $sum: "$amount" } } }
    ]);
    const pendingAmt = pending[0]?.amt || 0;

    const available = Math.max(totalPrincipal + totalProfit - pendingAmt, 0);

    const recentWithdrawals = await Withdrawal.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("amount method status createdAt");

    res.json({
      name: user.name,
      email: user.email,
      photo: user.photo,
      stats: {
        investment: totalPrincipal,
        profit: totalProfit,
        interest: totalProfit, // adjust if you track separately
        available
      },
      withdrawals: recentWithdrawals
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
