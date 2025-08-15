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

    // 3) Ensure 2FA secret exists
    if (!account.twoFASecret) {
      const secret = speakeasy.generateSecret({ length: 20 });
      account.twoFASecret = secret.base32;
      await account.save();
    }

    // 4) Send 2FA code if user (skip for admin)
    let tempToken = null;
    let requires2FA = false;
    let requiresTerms = false;

    if (account.role === "user") {
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

    res.json({
      success: true,
      message: "Login successful",
      requires2FA,
      requiresTerms,
      tempToken,
      token: account.role === "admin" ? jwt.sign({ id: account._id, email: account.email, role: "admin" }, JWT_SECRET, { expiresIn: "1h" }) : null,
      user: {
        id: account._id,
        name: account.name,
        email: account.email,
        role: account.role,
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

    const jwtToken = jwt.sign({ id: account._id, email: account.email, role: account.role }, JWT_SECRET, { expiresIn: "1h" });

    res.json({
      success: true,
      message: "2FA verified",
      token: jwtToken,
      user: {
        id: account._id,
        name: account.name,
        email: account.email,
        role: account.role,
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
