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
import { requireAuth } from "../middleware/authMiddleware.js";
import transporter from "../utils/mailer.js";
import { send2FACode } from "../utils/mailer.js";
const router = express.Router();


// --- Multer setup ---
const uploadDir = path.join(process.cwd(), "uploads");
// ensure uploads folder exists
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ---------------- REGISTER ----------------
router.post("/signup", upload.single("photo"), async (req, res) => {
  try {
    // With multipart/form-data, text fields are on req.body, file on req.file
    const { email, password, name, role } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // If you saved uploaded file but user exists, consider deleting the file to avoid orphans.
      if (req.file) {
        try { fs.unlinkSync(path.join(uploadDir, req.file.filename)); } catch (e) {}
      }
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

const newUser = new User({
  name,
  email,
  password: hashedPassword, // <- hashed password stored here
  photo: req.file ? `/uploads/${req.file.filename}` : null,
});
await newUser.save();


    // generate token so user is effectively logged in after signup
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Return safe user object (remove passwordHash)
    const safeUser = newUser.toObject();
    delete safeUser.passwordHash;

    return res.status(201).json({ message: "User registered successfully", token, user: safeUser });
  } catch (err) {
    console.error(err);
    // If multer saved file and an error happened, you may want to remove the uploaded file:
    if (req.file) {
      try { fs.unlinkSync(path.join(uploadDir, req.file.filename)); } catch (e) {}
    }
    res.status(500).json({ message: "Server error" });
  }
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";

// ==================== LOGIN ROUTE ====================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ msg: "Invalid email" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ msg: "Invalid password" });

    // Generate a temporary 2FA secret if user doesn't have one
    if (!user.twoFASecret) {
      const secret = speakeasy.generateSecret({ length: 20 });
      user.twoFASecret = secret.base32;
      await user.save();
    }

    // Respond to frontend for 2FA step
    res.json({
      msg: "Login successful, proceed with 2FA",
      email: user.email,
      name: user.name,
      photo: user.photo || "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ==================== VERIFY 2FA ====================
router.post("/verify-2fa", async (req, res) => {
  const { email, code } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ msg: "User not found" });

    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: "base32",
      token: code,
      window: 2, // allow ±2 intervals
    });

    if (!verified) return res.status(400).json({ msg: "Invalid 2FA code" });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ msg: "2FA verified", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ==================== RESEND 2FA ====================
router.post("/resend-2fa", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ msg: "User not found" });

    // For demo purposes, we'll just return the code (in production, send email/SMS)
    const token = speakeasy.totp({
      secret: user.twoFASecret,
      encoding: "base32",
    });

    res.json({ msg: `Your 2FA code is: ${token}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});




export default router;

