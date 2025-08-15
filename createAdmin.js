// createAdmin.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js"; // adjust path if your User model is elsewhere
import bcrypt from "bcrypt";

// Load environment variables
dotenv.config();

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("✅ Connected to MongoDB");

    const adminEmail = process.env.ADMIN_EMAIL || "admin@tradex.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    // Check if admin already exists
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      // Hash password before creating admin
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      admin = await User.create({
        name: "Permanent Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        balance: 0,
        profit: 0,
        interest: 0,
      });

      console.log(`✅ Permanent admin created: ${adminEmail}`);
    } else {
      console.log(`ℹ️ Admin already exists: ${adminEmail}`);
    }

    await mongoose.disconnect();
    console.log("✅ MongoDB connection closed");
  } catch (err) {
    console.error("❌ Error creating admin:", err);
    process.exit(1);
  }
}

createAdmin();
