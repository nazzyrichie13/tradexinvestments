// user.js
import express from "express";
import User from "../models/User.js";
import Investment from "../models/Investment.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import Withdrawal from "../models/Withdrawal.js"; // Add this at the top



const router = express.Router();

  
router.post("/transactions", requireAuth, async (req, res) => {
  try {
    const { type, amount, method } = req.body;
    if (!["deposit", "withdraw"].includes(type))
      return res.status(400).json({ msg: "Invalid type" });

    if (!amount || amount <= 0)
      return res.status(400).json({ msg: "Invalid amount" });

    const TxModel = type === "withdraw" ? Withdrawal : Deposit;
    const tx = await TxModel.create({
      userId: req.userId,
      amount,
      method: method || "wallet",
      status: "pending"
    });

    res.json({ msg: `${type} request submitted`, transaction: tx });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});
router.get("/transactions/my", requireAuth, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ userId: req.userId })
      .select("type amount status createdAt method")
      .lean();
    const deposits = await Deposit.find({ userId: req.userId })
      .select("type amount status createdAt method")
      .lean();

    const transactions = [...withdrawals, ...deposits]
      .map(t => ({ ...t, type: t.type || (t.modelName === "Withdrawal" ? "withdraw" : "deposit") }))
      .sort((a, b) => b.createdAt - a.createdAt);

    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});



export default router;
