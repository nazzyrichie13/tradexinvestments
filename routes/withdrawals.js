// withdrawals.js

import express from "express";
import Withdrawal from "../models/Withdrawal.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import transporter from "../utils/mailer.js";

import { send2FACode } from "../utils/mailer.js"; // reuse transporter

const router = express.Router();

/**
 * POST /api/withdrawals
 * body: { method, amount }
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { method, amount } = req.body;
    if (!["paypal", "bitcoin", "cashapp", "bank"].includes(method))
      return res.status(400).json({ msg: "Unsupported method" });
    if (!amount || amount <= 0) return res.status(400).json({ msg: "Invalid amount" });

    // compute available
    const inv = await Investment.find({ userId: req.userId, status: "active" });
    const totalPrincipal = inv.reduce((s, x) => s + x.principal, 0);
    const totalProfit = inv.reduce((s, x) => s + x.profit, 0);
    const pending = await Withdrawal.aggregate([
      { $match: { userId: req.userId, status: "pending" } },
      { $group: { _id: null, amt: { $sum: "$amount" } } }
    ]);
    const pendingAmt = pending[0]?.amt || 0;
    const available = Math.max(totalPrincipal + totalProfit - pendingAmt, 0);

    if (amount > available)
      return res.status(400).json({ msg: "Amount exceeds available balance" });

    // Example business rule: block bank transfers (as in your UI)
    if (method === "bank")
      return res.status(400).json({ msg: "Bank-to-Bank withdrawal not allowed. Contact support." });

    const w = await Withdrawal.create({ userId: req.userId, method, amount });

    // (Optional) Notify admin & user. Reuse mailer transporter for quick notice.
    try {
      await sendMail(process.env.ADMIN_EMAIL || process.env.SMTP_USER,
        `Withdrawal request: $${amount} via ${method}`);
      // For the user:
      await sendMail(req.userEmail || process.env.SMTP_USER,
        `Your withdrawal request of $${amount} via ${method} is received and pending.`);
    } catch { /* ignore email errors silently */ }

    res.status(201).json({ msg: "Withdrawal request submitted", withdrawal: w });
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * GET /api/withdrawals/my
 * List user withdrawals
 */
router.get("/my", requireAuth, async (req, res) => {
  try {
    const list = await Withdrawal.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(list);
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
