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

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Check required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered." });
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();

    // 5. Generate JWT token (optional)
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 6. Respond with success and user info
    res.status(201).json({
      message: "Account created successfully!",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email
      },
      token
    });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error during signup." });
  }
});

// -------- LOGIN (User or Admin) --------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").toLowerCase();

    // 1) Find account
    let account = await User.findOne({ email: normalizedEmail });
    let kind = "user";

    if (!account) {
      account = await Admin.findOne({ email: normalizedEmail });
      kind = account ? "admin" : null;
    }

    if (!account) return res.status(401).json({ success: false, message: "Invalid email or password" });

    // 2) Check password
    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });

    // Ensure account.role exists
    const role = account.role || kind;

    // 3) Ensure 2FA secret exists for users
    if (role === "user" && !account.twoFASecret) {
      const secret = speakeasy.generateSecret({ length: 20 });
      account.twoFASecret = secret.base32;
      await account.save();
    }

    // 4) Send 2FA code if user (skip for admin)
    let tempToken = null;
    let requires2FA = false;
    let requiresTerms = false;

    if (role === "user") {
      const token2FA = speakeasy.totp({ secret: account.twoFASecret, encoding: "base32" });

      await transporter.sendMail({
        from: `"TradexInvest" <${process.env.EMAIL_USER}>`,
        to: account.email,
        subject: "Your TradexInvest 2FA Code",
        text: `Your 2FA code is: ${token2FA}`,
      });

      tempToken = jwt.sign({ id: account._id, email: account.email, kind }, JWT_SECRET, { expiresIn: "10m" });
      requires2FA = true;
      requiresTerms = true;
    }

    // JWT for admin login
    const jwtToken = role === "admin"
      ? jwt.sign({ id: account._id, email: account.email, role }, JWT_SECRET, { expiresIn: "1h" })
      : null;

    res.json({
      success: true,
      message: "Login successful",
      requires2FA,
      requiresTerms,
      tempToken,
      token: jwtToken,
      user: {
        id: account._id,
        name: account.name,
        email: account.email,
        role,
      },
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -------- VERIFY 2FA --------
router.post("/verify-2fa", async (req, res) => {
  try {
    const { code, tempToken } = req.body;
    if (!code || !tempToken) return res.status(400).json({ success: false, message: "Code and tempToken required" });

    const decoded = jwt.verify(tempToken, JWT_SECRET);
    const { id, kind } = decoded;

    const Model = kind === "admin" ? Admin : User;
    const account = await Model.findById(id);
    if (!account) return res.status(401).json({ success: false, message: "Account not found" });

    const verified = speakeasy.totp.verify({ secret: account.twoFASecret, encoding: "base32", token: code, window: 2 });
    if (!verified) return res.status(400).json({ success: false, message: "Invalid 2FA code" });

    const jwtToken = jwt.sign({ id: account._id, email: account.email, role: account.role || kind }, JWT_SECRET, { expiresIn: "1h" });

    res.json({
      success: true,
      message: "2FA verified",
      token: jwtToken,
      user: {
        id: account._id,
        name: account.name,
        email: account.email,
        role: account.role || kind,
      },
    });

  } catch (err) {
    console.error("2FA verify error:", err);
    const msg = err.name === "TokenExpiredError" ? "2FA session expired, please login again" : "Server error";
    res.status(500).json({ success: false, message: msg });
  }
});

// -------- RESEND 2FA --------
router.post("/resend-2fa", async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email || "").toLowerCase();

    let account = await User.findOne({ email: normalizedEmail });
    if (!account) account = await Admin.findOne({ email: normalizedEmail });
    if (!account) return res.status(401).json({ success: false, message: "Account not found" });

    if (!account.twoFASecret) {
      const secret = speakeasy.generateSecret({ length: 20 });
      account.twoFASecret = secret.base32;
      await account.save();
    }

    const token2FA = speakeasy.totp({ secret: account.twoFASecret, encoding: "base32" });

    await transporter.sendMail({
      from: `"TradexInvest" <${process.env.EMAIL_USER}>`,
      to: account.email,
      subject: "Your TradexInvest 2FA Code (Resent)",
      text: `Your 2FA code is: ${token2FA}`,
    });

    res.json({ success: true, message: "2FA code resent to your email" });
  } catch (err) {
    console.error("2FA resend error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
