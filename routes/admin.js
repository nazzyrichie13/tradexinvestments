import express from "express";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

// =========================
// Admin Login
// routes/auth.js

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// ---------- LOGIN ----------
// router.post("/admin-login", async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const admin = await Admin.findOne({ email: email.toLowerCase() });
//     if (!admin) return res.status(401).json({ success: false, message: "Invalid email or password" });

//     const isMatch = await bcrypt.compare(password, admin.password);
//     if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });

//     const token = jwt.sign({ id: admin._id, email: admin.email }, JWT_SECRET, { expiresIn: "1h" });

//     res.json({
//       success: true,
//       message: "Admin login successful",
//       token,
//       admin: { id: admin._id, name: admin.name, email: admin.email },
//     });
//   } catch (err) {
//     console.error("Admin login error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

// // Get all users
// // 
// // Update user investment
// router.put("/user/:id/investment", requireAdmin, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { balance, interest, profit } = req.body;

//     if (balance == null || interest == null || profit == null) {
//       return res.status(400).json({ error: "Missing fields" });
//     }

//     const user = await User.findById(id);
//     if (!user) return res.status(404).json({ error: "User not found" });

//     user.investment.balance = balance;
//     user.investment.profit = profit;
//     user.investment.interest = interest;

//     await user.save();

//     res.json({ success: true, user });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to update investment" });
//   }
// });


// Get all withdrawals
router.get("/admin/withdrawals", requireAdmin, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find().populate("user", "name email");
    res.json({ success: true, withdrawals });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch withdrawals" });
  }
});

// Confirm withdrawal
router.put("/admin/withdrawals/:id/confirm", requireAdmin, async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "Confirmed" } },
      { new: true }
    );
    res.json({ success: true, withdrawal });
  } catch (err) {
    res.status(500).json({ error: "Failed to confirm withdrawal" });
  }
});

export default router;

