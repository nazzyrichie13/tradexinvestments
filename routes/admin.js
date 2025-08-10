const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const router = express.Router();

// Middleware to verify JWT and admin role
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid or expired token" });

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    req.user = decoded; // contains userId, email, role, etc.
    next();
  });
}

// Get all users with role "user"
router.get("/users", authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: "user" });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update a user's investment data
router.put("/user/:id", authenticateAdmin, async (req, res) => {
  try {
    const { investmentAmount, profit, totalInterest } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { investmentAmount, profit, totalInterest },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
