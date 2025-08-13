// routes/auth.js
// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import multer from "multer";
import fs from "fs";

import User from "../models/User.js";

import middleware from "./middleware/auth.js";

const router = express.Router()



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
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ msg: "Invalid email" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ msg: "Invalid password" });

    const twoFACode = Math.floor(100000 + Math.random() * 900000).toString();
    user.twoFACode = twoFACode;
    user.twoFAExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry
    await user.save();

    await send2FACode(user.email, twoFACode);
    res.json({ email: user.email, name: user.name, photo: user.photo });
  } catch (err) { res.status(500).send("Server error"); }
});

// POST /verify-2fa
router.post("/verify-2fa", async (req, res) => {
  const { email, code } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ msg: "User not found" });

    if (!user.twoFACode || !user.twoFAExpires || new Date() > user.twoFAExpires)
      return res.status(401).json({ msg: "2FA code expired. Please resend." });

    if (user.twoFACode !== code) return res.status(401).json({ msg: "Invalid 2FA code" });

    user.twoFACode = null;
    user.twoFAExpires = null;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token });
  } catch (err) { res.status(500).send("Server error"); }
});

// POST /resend-2fa
router.post("/resend-2fa", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ msg: "User not found" });

    const twoFACode = Math.floor(100000 + Math.random() * 900000).toString();
    user.twoFACode = twoFACode;
    user.twoFAExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    await send2FACode(user.email, twoFACode);
    res.json({ msg: "2FA code resent successfully" });
  } catch (err) { res.status(500).send("Server error"); }
});

export default router;

