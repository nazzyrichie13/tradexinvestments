// routes/auth.js
// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import sgMail from "@sendgrid/mail";

// ✅ Models (PascalCase to match filenames)
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import Withdrawal from "../models/Withdrawal.js";
import Investment from "../models/Investment.js"; // only if you actually use a separate Investment model

// ✅ Utils
import transporter from "../utils/mailer.js";
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key";

// ────────────────────────────────────────────────────────────────────────────────
// Auth middleware
// ────────────────────────────────────────────────────────────────────────────────
export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    // Optionally: verify admin exists
    req.admin = decoded; // { id }
    return next();
  } catch (err) {
    console.error("JWT verify (admin) failed:", err.message);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    req.user = user;
    req.userId = user._id; // convenience for routes
    return next();
  } catch (err) {
    console.error("JWT verify (user) failed:", err.message);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// USER ROUTES
// ────────────────────────────────────────────────────────────────────────────────
// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "All fields are required" });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ success: false, message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email: email.toLowerCase(), password: hashed });
    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: { id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error during registration" });
  }
});

// Get current user
router.get("/current-user", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// User login (2-step: terms -> 2FA)
router.post("/user-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });

    // Step 1: must accept terms first
    if (!user.acceptedTerms) {
      const tempToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "10m" });
      return res.json({
        success: true,
        requiresTerms: true,
        requires2FA: false,
        tempToken,
        user: { name: user.name, email: user.email, acceptedTerms: user.acceptedTerms },
      });
    }

    // Step 2: ensure 2FA secret exists
    if (!user.twoFASecret) {
      const secret = speakeasy.generateSecret({ length: 20 });
      user.twoFASecret = secret.base32;
      await user.save();
    }

    const code = speakeasy.totp({ secret: user.twoFASecret, encoding: "base32" });

    // Send code via email
    
await sgMail.send({
  from: {
    name: "TradexInvest",
    email: process.env.EMAIL_USER, // must be a verified sender in SendGrid
  },
  to: user.email,
  subject: "Your 2FA Code",
  text: `Your 2FA code is: ${code}`,
});
    const tempToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "10m" });
    return res.json({
      success: true,
      requiresTerms: false,
      requires2FA: true,
      tempToken,
      user: { name: user.name, email: user.email, acceptedTerms: user.acceptedTerms },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
});

// Accept terms
router.post("/accept-terms", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ success: false, message: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.acceptedTerms = true;
    await user.save();

    res.json({ success: true, message: "Terms accepted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Verify 2FA
router.post("/verify-2fa", async (req, res) => {
  try {
    const headerToken = req.headers.authorization?.split(" ")[1];
    const tempToken = headerToken || req.body.tempToken;
    const { code } = req.body;
    if (!tempToken || !code) return res.status(400).json({ success: false, message: "Missing token or code" });

    const payload = jwt.verify(tempToken, JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: "base32",
      token: code,
      window: 2,
    });

    if (!verified) return res.status(401).json({ success: false, message: "Invalid 2FA code" });

    const authToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });

    res.json({
      success: true,
      user: {
        email: user.email,
        currentInvestment: user.investment?.currentAmount || 0, // not in schema; kept for compatibility
        balance: user.investment?.balance || 0,
        profit: user.investment?.profit || 0,
        interest: user.investment?.interest || 0,
        name: user.name,
      },
      authToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error verifying 2FA" });
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ────────────────────────────────────────────────────────────────────────────────
// Admin login
router.post("/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: "1h" });

    res.json({ success: true, token, admin: { id: admin._id, name: admin.name, email: admin.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get all users (admin)
router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

// ✅ Update running totals (balance/profit/interest)
// PUT /admin/user/:id/portfolio
router.put("/admin/user/:id/portfolio", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { balance, profit, interest } = req.body;

    if (balance == null || profit == null || interest == null) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.investment.balance = balance;
    user.investment.profit = profit;
    user.investment.interest = interest;

    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    console.error("Update portfolio error:", err);
    res.status(500).json({ success: false, message: "Failed to update portfolio" });
  }
});

// ✅ Append a new investment record to user's embedded array
// POST /admin/user/:id/investments
router.post("/admin/user/:id/investments", requireAdmin, async (req, res) => {
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

// Get withdrawals (admin)
router.get("/admin/withdrawals", requireAdmin, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, withdrawals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch withdrawals" });
  }
});

// Approve / Reject withdrawal (admin)
router.put("/admin/withdrawals/:id/:action", requireAdmin, async (req, res) => {
  try {
    const { id, action } = req.params; // action = confirm | reject
    const withdrawal = await Withdrawal.findById(id).populate("user");
    if (!withdrawal) return res.status(404).json({ success: false, message: "Withdrawal not found" });

    if (action === "confirm") {
      const user = withdrawal.user;
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      if ((user.investment?.balance || 0) < withdrawal.amount) {
        return res.status(400).json({ success: false, message: "User has insufficient balance" });
      }
      user.investment.balance -= withdrawal.amount;
      await user.save();
    }

    withdrawal.status = action === "confirm" ? "Confirmed" : "Rejected";
    await withdrawal.save();

    const io = req.app.get("io");
    io?.emit("withdrawal-updated", { id: withdrawal._id, status: withdrawal.status });

    res.json({ success: true, withdrawal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update withdrawal" });
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// USER WITHDRAWALS
// ────────────────────────────────────────────────────────────────────────────────
// Create withdrawal (user)
router.post("/withdrawals", requireAuth, async (req, res) => {
  try {
    const { amount, method } = req.body;
    if (amount == null || !method) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }

    const withdrawal = new Withdrawal({
      user: req.user._id,
      amount,
      method,
      status: "Pending",
    });
    await withdrawal.save();

    // Real-time notify admin dashboard if socket exists
    const io = req.app.get("io");
    io?.emit("new-withdrawal", {
      id: withdrawal._id,
      user: req.user._id,
      amount,
      method,
      status: "Pending",
    });

    // Email admin
    if (process.env.ADMIN_EMAIL) {
      await transporter.sendMail({
        from: `"TradexInvest" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: "New Withdrawal Request",
        text: `User requested a withdrawal: $${amount} via ${method}.`,
      });
    }

    res.json({ success: true, withdrawal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create withdrawal" });
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// OPTIONAL: Admin Investment model endpoints (if you keep a separate Investment collection)
// ────────────────────────────────────────────────────────────────────────────────
router.get("/admin/investments", requireAdmin, async (req, res) => {
  try {
    const investments = await Investment.find().populate("user", "email");
    res.json({ success: true, investments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch investments" });
  }
});

router.delete("/admin/investments/:id", requireAdmin, async (req, res) => {
  try {
    await Investment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Delete failed" });
  }
});

export default router;
