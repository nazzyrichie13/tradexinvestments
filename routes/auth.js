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
router.post("/signup", upload.single("photo"), async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password) {
      if (req.file) fs.unlinkSync(path.join(uploadDir, req.file.filename));
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (req.file) fs.unlinkSync(path.join(uploadDir, req.file.filename));
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: role || "user",
      photo: req.file ? `/uploads/${req.file.filename}` : null,
    });

    await newUser.save();

    // Generate JWT for immediate login (optional)
    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: "1d" });

    const safeUser = newUser.toObject();
    delete safeUser.password;

    res.status(201).json({ message: "User registered successfully", token, user: safeUser });
  } catch (err) {
    console.error("Signup error:", err);
    if (req.file) fs.unlinkSync(path.join(uploadDir, req.file.filename));
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- LOGIN (send 2FA + temp token) ----------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(401).json({ msg: "Invalid email" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ msg: "Invalid password" });

    // Generate 2FA secret if missing
    if (!user.twoFASecret) {
      const secret = speakeasy.generateSecret({ length: 20 });
      user.twoFASecret = secret.base32;
      await user.save();
    }

    // Generate TOTP 2FA code
    const token2FA = speakeasy.totp({ secret: user.twoFASecret, encoding: "base32" });

    // Send 2FA code via email
    await transporter.sendMail({
      from: `"TradexInvest" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Your TradexInvest 2FA Code",
      text: `Your 2FA code is: ${token2FA}`,
    });

    // Generate temporary token for 2FA verification (expires in 10 min)
    const tempToken = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "10m" });

    res.json({
      msg: "Check your email for 2FA code",
      tempToken,
      email: user.email,
      name: user.name,
      photo: user.photo || ""
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ---------------- VERIFY 2FA ----------------
router.post("/verify-2fa", async (req, res) => {
  try {
    const { code, tempToken } = req.body;

    // Decode temporary token
    const decoded = jwt.verify(tempToken, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ msg: "User not found" });

    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: "base32",
      token: code,
      window: 2
    });

    if (!verified) return res.status(400).json({ msg: "Invalid 2FA code" });

    // Generate final JWT token for full access
    const jwtToken = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "1h" });

    res.json({ msg: "2FA verified", token: jwtToken });
  } catch (err) {
    console.error("2FA verify error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ---------------- RESEND 2FA ----------------
router.post("/resend-2fa", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ msg: "User not found" });

    const token = speakeasy.totp({ secret: user.twoFASecret, encoding: "base32" });

    await transporter.sendMail({
      from: `"TradexInvest" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Your TradexInvest 2FA Code (Resent)",
      text: `Your 2FA code is: ${token}`,
    });

    res.json({ msg: "2FA code resent to your email" });
  } catch (err) {
    console.error("2FA resend error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
