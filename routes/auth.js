// routes/auth.js
// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import transporter from "../utils/mailer.js";
import Withdrawal from "../models/Withdrawal.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key";

// =========================
// USER REGISTRATION
// =========================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(409).json({ message: "Email already registered." });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, email: email.toLowerCase(), password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id, email: newUser.email }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      message: "User account created successfully!",
      user: { id: newUser._id, name: newUser.name, email: newUser.email },
      token,
    });
  } catch (err) {
    console.error("User signup error:", err);
    res.status(500).json({ message: "Server error during signup." });
  }
});

// =========================
// USER LOGIN
// =========================
router.post("/user-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });

    // Setup 2FA if not exists
    if (!user.twoFASecret) {
      const secret = speakeasy.generateSecret({ length: 20 });
      user.twoFASecret = secret.base32;
      await user.save();
    }

    const code = speakeasy.totp({ secret: user.twoFASecret, encoding: "base32" });

    await transporter.sendMail({
      from: `"TradexInvest" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Your TradexInvest 2FA Code",
      text: `Your 2FA code is: ${code}`,
    });

    const tempToken = jwt.sign({ id: user._id, kind: "user" }, JWT_SECRET, { expiresIn: "10m" });

    res.json({
      success: true,
      requiresTerms: !user.acceptedTerms, // force terms acceptance first
      requires2FA: true,
      tempToken
    });
  } catch (err) {
    console.error("User login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 2️⃣ Accept terms
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

// 3️⃣ Verify 2FA
router.post("/verify-2fa", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const { code } = req.body;
    if (!token) return res.status(401).json({ success: false, message: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: "base32",
      token: code,
      window: 1
    });

    if (!verified) return res.status(400).json({ success: false, message: "Invalid 2FA code" });

    // 2FA passed → issue final JWT
    const finalToken = jwt.sign({ id: user._id, kind: "user" }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, token: finalToken, user: { email: user.email, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =========================
// ADMIN LOGIN
// =========================
router.post("/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const token = jwt.sign({ id: admin._id, email: admin.email }, JWT_SECRET, { expiresIn: "1h" });

    res.json({
      success: true,
      message: "Admin login successful",
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//
// Middleware
function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    console.log("❌ No token sent");
    return res.status(403).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("✅ Admin verified:", decoded);

    req.admin = decoded; // attach decoded token to request
    next();
  } catch (err) {
    console.error("❌ JWT verify failed:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
}
// Get all users
router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Update user investment
router.put("/user/:id/investment", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { balance, interest, profit } = req.body;

    if (balance == null || interest == null || profit == null) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.investment.balance = balance;
    user.investment.profit = profit;
    user.investment.interest = interest;

    await user.save();

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update investment" });
  }
});


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
