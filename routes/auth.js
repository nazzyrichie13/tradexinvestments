// routes/auth.js
// routes/auth.js
import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs"; // consistent
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import speakeasy from "speakeasy";
import { requireAuth } from "../middleware/authMiddleware.js";
import transporter from "../utils/mailer.js";
import { send2FACode } from "../utils/mailer.js";
import nodemailer from "nodemailer";
const router = express.Router();


// ---------------- Multer setup ----------------
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ---------------- JWT Secret ----------------
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key";

// ---------------- SIGNUP ----------------
// ---------------- LOGIN (User or Admin) ----------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").toLowerCase();

    // 1) Find user OR admin
    let account = await User.findOne({ email: normalizedEmail });
    let accountKind = "user"; // or "admin"

    if (!account) {
      account = await Admin.findOne({ email: normalizedEmail });
      accountKind = account ? "admin" : "none";
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

    // 4) Generate TOTP and send it
    const token2FA = speakeasy.totp({ secret: account.twoFASecret, encoding: "base32" });

    await transporter.sendMail({
      from: `"TradexInvest" <${process.env.EMAIL_USER}>`,
      to: account.email,
      subject: "Your TradexInvest 2FA Code",
      text: `Your 2FA code is: ${token2FA}`,
    });

    // 5) Temp token for 2FA verification (10 min)
    const tempToken = jwt.sign(
      { id: account._id, email: account.email, kind: accountKind },
      JWT_SECRET,
      { expiresIn: "10m" }
    );

    // 6) Return a **consistent** structure the frontend expects
    res.json({
      success: true,
      message: "OTP sent to email",
      requires2FA: true,
      requiresTerms: true, // toggle if you later track on server
      tempToken,
      user: {
        id: account._id,
        email: account.email,
        name: account.name,
        role: account.role || (accountKind === "admin" ? "admin" : "user"),
        photo: account.photo || ""
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------------- VERIFY 2FA ----------------
router.post("/verify-2fa", async (req, res) => {
  try {
    const { code, tempToken } = req.body;
    if (!code || !tempToken) {
      return res.status(400).json({ success: false, message: "Code and tempToken are required" });
    }

    const decoded = jwt.verify(tempToken, JWT_SECRET);
    const { id, kind } = decoded;

    const Model = kind === "admin" ? Admin : User;
    const account = await Model.findById(id);
    if (!account) return res.status(401).json({ success: false, message: "Account not found" });

    const verified = speakeasy.totp.verify({
      secret: account.twoFASecret,
      encoding: "base32",
      token: code,
      window: 2
    });
    if (!verified) return res.status(400).json({ success: false, message: "Invalid 2FA code" });

    // Final JWT (1h)
    const jwtToken = jwt.sign(
      { id: account._id, email: account.email, role: account.role || (kind === "admin" ? "admin" : "user") },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      success: true,
      message: "2FA verified",
      token: jwtToken,
      user: {
        id: account._id,
        email: account.email,
        name: account.name,
        role: account.role || (kind === "admin" ? "admin" : "user"),
        photo: account.photo || ""
      }
    });
  } catch (err) {
    console.error("2FA verify error:", err);
    const msg = err.name === "TokenExpiredError" ? "2FA session expired, please login again" : "Server error";
    res.status(500).json({ success: false, message: msg });
  }
});

// ---------------- RESEND 2FA ----------------
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
