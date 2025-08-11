// routes/auth.js
// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");

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
router.post("/signup", upload.single("profilePic"), async (req, res) => {
  try {
    // With multipart/form-data, text fields are on req.body, file on req.file
    const { email, password, fullName, role } = req.body;

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

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      passwordHash,
      fullName,
      role: role || "user",
      profilePic: req.file ? req.file.filename : null,
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

// ---------------- LOGIN ----------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // If 2FA is enabled, stop here and require 2FA code
    if (user.twoFA?.enabled) {
      return res.json({ require2FA: true, userId: user._id });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Return safe user object
    const safeUser = user.toObject();
    delete safeUser.passwordHash;

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- 2FA SETUP ----------------
router.post("/setup-2fa", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const secret = speakeasy.generateSecret({
      name: `TradexInvest (${user.email})`,
    });

    user.twoFA = user.twoFA || {};
    user.twoFA.secret = secret.base32;
    user.twoFA.enabled = false;
    await user.save();

    const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url);

    res.json({ qrCode: qrCodeDataURL, secret: secret.base32 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- 2FA VERIFY ----------------
router.post("/verify-2fa", async (req, res) => {
  try {
    const { userId, token } = req.body;
    const user = await User.findById(userId);
    if (!user || !user.twoFA?.secret) {
      return res.status(400).json({ message: "2FA not setup for user" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFA.secret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ success: false, message: "Invalid 2FA code" });
    }

    // Enable 2FA if first time verifying
    if (!user.twoFA.enabled) {
      user.twoFA.enabled = true;
      await user.save();
    }

    const authToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const safeUser = user.toObject();
    delete safeUser.passwordHash;

    res.json({ success: true, token: authToken, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- GET LOGGED-IN USER ----------------
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
