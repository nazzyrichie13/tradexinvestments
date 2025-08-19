// routes/auth.js
// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import Withdrawal from "../models/Withdrawal.js";
import transporter from "../utils/mailer.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key";

// =========================
// Middleware
// =========================
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error("JWT verify failed:", err.message);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(403).json({ success: false, message: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    console.error("JWT verify failed:", err.message);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

// =========================
// USER ROUTES
// =========================

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "All fields are required" });

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser)
      return res.status(409).json({ success: false, message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email: email.toLowerCase(), password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: { id: newUser._id, name: newUser.name, email: newUser.email },
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
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// User login
router.post("/user-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });

    // Check if terms are accepted first
    if (!user.acceptedTerms) {
      // Do NOT generate 2FA yet
      const tempToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "10m" });
      return res.json({
        success: true,
        requiresTerms: true,
        requires2FA: false, // 2FA not yet required
        tempToken,
      });
    }

    // Generate 2FA secret if missing
    if (!user.twoFASecret) {
      const secret = speakeasy.generateSecret({ length: 20 });
      user.twoFASecret = secret.base32;
      await user.save();
    }

    const code = speakeasy.totp({ secret: user.twoFASecret, encoding: "base32" });

    // Send code via email
    await transporter.sendMail({
      from: `"TradexInvest" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Your 2FA Code",
      text: `Your 2FA code is: ${code}`,
    });

    const tempToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "10m" });

    res.json({
      success: true,
      requiresTerms: false,
      requires2FA: true,
      tempToken,
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
    const tempToken = headerToken || req.body.tempToken; // support both
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

    // Generate real JWT for session
    const authToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });

    res.json({
      success: true,
      user: {
        email: user.email,
        currentInvestment: user.investment?.currentAmount || 0,
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


// =========================
// ADMIN ROUTES
// =========================

// Admin login
router.post("/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: "1h" });

    res.json({
      success: true,
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
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

// Update user investment (admin)
router.put("/user/:id/investment", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { balance, interest, profit } = req.body;

    if (balance == null || interest == null || profit == null)
      return res.status(400).json({ success: false, message: "Missing fields" });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.investment.balance = balance;
    user.investment.interest = interest;
    user.investment.profit = profit;
    await user.save();

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update investment" });
  }
});

// Get withdrawals (admin)
router.get("/admin/withdrawals", requireAdmin, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find().populate("user", "name email");
    res.json({ success: true, withdrawals });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch withdrawals" });
  }
});

// Confirm withdrawal (admin)
router.put("/admin/withdrawals/:id/confirm", requireAdmin, async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findByIdAndUpdate(
      req.params.id,
      { status: "Confirmed" },
      { new: true }
    );
    res.json({ success: true, withdrawal });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to confirm withdrawal" });
  }
});

export default router;
