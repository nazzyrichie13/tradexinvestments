// testAdminLogin.js
// testAdminLogin.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "./models/Admin.js"; // adjust path if needed

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key";

const runTest = async () => {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB");

    const email = "marcelthompson703@gmail.com";
    const plainPassword = "Admin123!";

    // 1️⃣ Check if admin already exists
    let admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      admin = new Admin({ name: "Test Admin", email, password: hashedPassword });
      await admin.save();
      console.log("New admin created with known password!");
    } else {
      console.log("Admin already exists, using existing record.");
    }

    // 2️⃣ Attempt login
    const isMatch = await bcrypt.compare(plainPassword, admin.password);
    if (!isMatch) throw new Error("Password mismatch");

    const token = jwt.sign({ id: admin._id, email: admin.email }, JWT_SECRET, { expiresIn: "1h" });
    console.log("Login successful!");
    console.log("JWT Token:", token);
    console.log("Admin info:", { id: admin._id, name: admin.name, email: admin.email });

    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
};

runTest();
