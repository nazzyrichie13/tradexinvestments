require('dotenv').config(); // Load .env before anything else
const mongoose = require('mongoose');

console.log("DEBUG MONGO_URI:", process.env.MONGO_URI); // Should print the full connection string

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch(err => console.error("❌ Connection error:", err));
