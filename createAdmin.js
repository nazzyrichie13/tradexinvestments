import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Admin from "./models/Admin.js"; // adjust path if needed

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tradexinvest";

const run = async () => {
  try {
    // 1️⃣ Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // 2️⃣ Admin credentials
    const email = "example@gmail.com";
    const plainPassword = "Adminpassword";

    // 3️⃣ Check if admin exists
    let admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin) {
      // 4️⃣ Hash password & create admin
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      admin = new Admin({ name: "Main Admin", email, password: hashedPassword });
      await admin.save();
      console.log("✅ New admin created with known password!");
    } else {
      console.log("ℹ️ Admin already exists, using existing record.");
    }

    // 5️⃣ Optional: Test login and generate JWT
    const isMatch = await bcrypt.compare(plainPassword, admin.password);
    if (!isMatch) throw new Error("Password mismatch");

    const token = jwt.sign({ id: admin._id, email: admin.email }, JWT_SECRET, { expiresIn: "1h" });

    console.log("Login test successful!");
    console.log("JWT Token:", token);
    console.log("Admin info:", { id: admin._id, name: admin.name, email: admin.email });

    process.exit(0);
  } catch (err) {
    console.error("Error creating admin:", err);
    process.exit(1);
  }
};

run();
