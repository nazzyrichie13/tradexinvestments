// routes/admin.js
import express from "express";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import transporter from "../utils/mailer.js";


const router = express.Router();

// =========================
// Admin Login
// =========================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const adminUser = await Admin.findOne({ email });
    if (!adminUser) return res.status(401).json({ message: "Admin not found" });

    const isMatch = await bcrypt.compare(password, adminUser.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: adminUser._id, email: adminUser.email, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =========================
// Middleware: Verify JWT + Admin Role
// =========================
export function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid or expired token" });
    if (decoded.role !== "admin") return res.status(403).json({ message: "Access denied" });

    req.user = decoded;
    next();
  });
}

// =========================
// Get all users
// =========================
router.get("/users", authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: "user" });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/withdrawals", requireAuth, requireAdmin, async (req, res) => {
  const list = await Withdrawal.find()
    .sort({ createdAt: -1 })
    .populate("userId", "name email");
  res.json(list);
});

// POST approve/reject
router.post("/withdrawals/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    if (!["approve","reject"].includes(action))
      return res.status(400).json({ msg: "Invalid action" });

    const withdrawal = await Withdrawal.findById(req.params.id).populate("userId");
    if (!withdrawal) return res.status(404).json({ msg: "Withdrawal not found" });

    withdrawal.status = action === "approve" ? "approved" : "rejected";
    await withdrawal.save();

    // Send email notification to user
    const msg = action === "approve" 
      ? `Your withdrawal of $${withdrawal.amount} via ${withdrawal.method} has been approved.`
      : `Your withdrawal of $${withdrawal.amount} via ${withdrawal.method} has been rejected. Please contact support.`;

    await sendMail(withdrawal.userId.email, msg);

    res.json({ msg: `Withdrawal ${action}d successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Admin: Update User Investment
// =========================
router.put("/update-user-investment/:id", async (req, res) => {
  try {
    const { amount, interest, outcome } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { amount, interest, outcome },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User investment updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
import { requireAdmin } from "../middleware/adminMiddleware.js";

router.get("/admin/transactions", requireAuth, requireAdmin, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find()
      .populate("userId", "name email")
      .lean();
    const deposits = await Deposit.find()
      .populate("userId", "name email")
      .lean();

    res.json({ transactions: [...withdrawals, ...deposits] });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

router.patch("/admin/transactions/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "success", "fail"].includes(status))
      return res.status(400).json({ msg: "Invalid status" });

    let tx = await Withdrawal.findById(req.params.id);
    if (!tx) tx = await Deposit.findById(req.params.id);
    if (!tx) return res.status(404).json({ msg: "Transaction not found" });

    tx.status = status;
    await tx.save();

    res.json({ msg: "Status updated", transaction: tx });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});



export default router;