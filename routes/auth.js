// routes/auth.js
// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import transporter from "../utils/mailer.js";

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

    // 2FA setup for user
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
      requires2FA: true,
      tempToken,
      requiresTerms: !user.acceptedTerms // ✅ send to frontend
    });
  } catch (err) {
    console.error("User login error:", err);
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

// =========================
// USER 2FA VERIFY
// =========================
router.post("/verify-2fa", async (req, res) => {
  try {
    const { code, tempToken } = req.body;
    if (!code || !tempToken) return res.status(400).json({ success: false, message: "Code and tempToken required" });

    const decoded = jwt.verify(tempToken, JWT_SECRET);
    if (decoded.kind !== "user") return res.status(400).json({ success: false, message: "Invalid token for 2FA" });

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const verified = speakeasy.totp.verify({ secret: user.twoFASecret, encoding: "base32", token: code, window: 2 });
    if (!verified) return res.status(400).json({ success: false, message: "Invalid 2FA code" });

    const jwtToken = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ success: true, token: jwtToken, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error("2FA verify error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// =========================
// Middleware: Protect Admin Routes
function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(403).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Not authorized as admin" });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}


// =========================
// Get All Users (Investments, Withdrawals etc.)
// =========================
router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});
// Update User Investment (amount & interest)
// =========================
router.put("/admin/users/:id/investment", requireAdmin, async (req, res) => {
  try {
    const { balance, profit, interest } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { balance, profit, interest } }, // ✅ now matches frontend
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update investment" });
  }
});

// =========================
// Get All Withdrawals
// =========================
import Withdrawal from "../models/Withdrawal.js";  // make sure you import this at top

router.get("/admin/withdrawals", requireAdmin, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find().populate("user", "name email");
    res.json({ success: true, withdrawals });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch withdrawals" });
  }
});

// =========================
// Update User Investment
// =========================


app.put('/API/admin/user/:id/investment', async (req, res) => {
  try {
    const { id } = req.params;
    const { balance, interest, profit } = req.body;

    // Validate body
    if (amount == null || interest == null || profit == null) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { balance, interest, profit },
      { new: true } // returns the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // ✅ Send JSON response
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});


// =========================
// Confirm Withdrawal
// =========================
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
