// routes/admin.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Admin from "../models/Admin.js";
import User from "../models/user.js";
import WithdrawalRequest from "../models/withdrawalRequest.js";
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

// =========================
// Update a user's investment
// =========================
router.put("/user/:id", authenticateAdmin, async (req, res) => {
  try {
    const { investmentAmount, profit, totalInterest } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { investmentAmount, profit, totalInterest },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// =========================
// List all withdrawal requests
// =========================
router.get("/withdrawals", authenticateAdmin, async (req, res) => {
  try {
    const requests = await WithdrawalRequest.find()
      .populate("userId", "email fullName")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// =========================
// Approve withdrawal
// =========================
router.put("/withdrawal/:id/approve", authenticateAdmin, async (req, res) => {
  try {
    const request = await WithdrawalRequest.findById(req.params.id).populate("userId");
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") return res.status(400).json({ message: "Request already processed" });

    const user = request.userId;
    user.investmentAmount = Math.max(0, (user.investmentAmount || 0) - request.amount);
    await user.save();

    request.status = "approved";
    request.updatedAt = new Date();
    await request.save();

    // Email user
    const mailOptions = {
      from: `"TradeXInvest" <support@tradexinvest.com>`,
      to: user.email,
      subject: "Withdrawal Request Approved",
      html: `
        <p>Dear ${user.fullName || user.email},</p>
        <p>Your withdrawal request of $${request.amount.toFixed(2)} via <strong>${request.method}</strong> has been <strong>approved</strong>.</p>
        <p>Recipient Details: ${request.recipientDetails}</p>
        <p>Thank you for investing with TradeXInvest.</p>
      `,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.error("Error sending approval email:", error);
      else console.log("Approval email sent:", info.response);
    });

    res.json({ message: "Withdrawal approved", request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// =========================
// Reject withdrawal
// =========================
router.put("/withdrawal/:id/reject", authenticateAdmin, async (req, res) => {
  try {
    const request = await WithdrawalRequest.findById(req.params.id).populate("userId");
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") return res.status(400).json({ message: "Request already processed" });

    request.status = "rejected";
    request.updatedAt = new Date();
    await request.save();

    // Email user
    const user = request.userId;
    const mailOptions = {
      from: `"TradeXInvest" <support@tradexinvest.com>`,
      to: user.email,
      subject: "Withdrawal Request Rejected",
      html: `
        <p>Dear ${user.fullName || user.email},</p>
        <p>Your withdrawal request of $${request.amount.toFixed(2)} via <strong>${request.method}</strong> has been <strong>rejected</strong>.</p>
        <p>If you have any questions, please contact support.</p>
      `,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.error("Error sending rejection email:", error);
      else console.log("Rejection email sent:", info.response);
    });

    res.json({ message: "Withdrawal rejected", request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
