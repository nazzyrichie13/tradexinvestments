// createAdmin.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

async function createAdmin() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const adminEmail = process.env.ADMIN_EMAIL || "admin@tradex.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: "Permanent Admin",
        email: adminEmail,
        password: adminPassword, // Your User model should hash this
        role: "admin",
        balance: 0,
        profit: 0,
        interest: 0,
      });
      console.log(`✅ Permanent admin created: ${adminEmail}`);
    } else {
      console.log(`ℹ️ Admin already exists: ${adminEmail}`);
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating admin:", err);
    process.exit(1);
  }
}

createAdmin();
